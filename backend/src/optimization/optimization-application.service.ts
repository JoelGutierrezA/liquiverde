import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SustainabilityService } from '../sustainability/sustainability.service';
import { SustainabilityProductInput } from '../sustainability/types/sustainability-analysis.type';
import { SustainabilityInputError } from '../sustainability/types/sustainability-error.type';
import { WEIGHT_SUM_TOLERANCE } from './optimization.constants';
import { OptimizeShoppingListDto } from './dto/optimize-shopping-list.dto';
import { OptimizationService } from './optimization.service';
import { OptimizationCandidate } from './types/optimization-candidate.type';
import { InsufficientBudgetError, OptimizationInputError } from './types/optimization-error.type';
import { OptimizationGroup } from './types/optimization-input.type';
import { OptimizationResult, SelectedOptimizationItem } from './types/optimization-result.type';

const optimizationProductSelect = {
  id: true,
  name: true,
  brand: true,
  category: true,
  price: true,
  carbonKg: true,
  localProduct: true,
  recyclablePackaging: true,
  fairTrade: true,
  socialScore: true,
  source: true,
  store: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ProductSelect;

type OptimizationProductRecord = Prisma.ProductGetPayload<{
  select: typeof optimizationProductSelect;
}>;

type OptimizationProductResponse = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  store: {
    id: string;
    name: string;
  };
};

type SelectedOptimizationItemResponse = Omit<SelectedOptimizationItem, 'groupKey' | 'product'> & {
  category: string;
  product: OptimizationProductResponse;
  sustainabilityScore: number;
};

export type ShoppingOptimizationResponse = Omit<OptimizationResult, 'selectedItems'> & {
  weights: {
    economic: number;
    sustainability: number;
  };
  selectedItems: SelectedOptimizationItemResponse[];
};

@Injectable()
export class OptimizationApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sustainabilityService: SustainabilityService,
    private readonly optimizationService: OptimizationService,
  ) {}

  async optimizeShoppingList(dto: OptimizeShoppingListDto): Promise<ShoppingOptimizationResponse> {
    this.validateRequest(dto);

    const categories = dto.items.map((item) => item.category);
    const productsByCategory = await this.loadProductsByCategory(categories);
    const productsById = new Map<string, OptimizationProductRecord>();

    const groups: OptimizationGroup[] = dto.items.map((item) => {
      const products = productsByCategory.get(item.category) ?? [];

      if (products.length === 0) {
        throw new BadRequestException(`Category ${item.category} has no available products.`);
      }

      const comparableProducts = products.map((product) => this.toSustainabilityInput(product));
      const candidates = products.map((product) => {
        productsById.set(product.id, product);

        try {
          const analysis = this.sustainabilityService.analyze(this.toSustainabilityInput(product), comparableProducts);

          return {
            id: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            carbonKg: product.carbonKg,
            sustainabilityScore: analysis.sustainabilityScore,
          } satisfies OptimizationCandidate;
        } catch (error) {
          if (error instanceof SustainabilityInputError) {
            throw new UnprocessableEntityException('Product sustainability data is invalid.');
          }

          throw error;
        }
      });

      return {
        key: item.category,
        quantity: item.quantity,
        candidates,
      };
    });

    try {
      const result = this.optimizationService.optimize({
        budget: dto.budget,
        weights: dto.weights,
        groups,
      });

      return this.toResponse(result, dto.weights, productsById);
    } catch (error) {
      if (error instanceof InsufficientBudgetError) {
        throw new UnprocessableEntityException(
          'Budget is insufficient to select one product from every requested category.',
        );
      }

      if (error instanceof OptimizationInputError) {
        throw new BadRequestException('Optimization input is invalid.');
      }

      throw error;
    }
  }

  private async loadProductsByCategory(categories: string[]): Promise<Map<string, OptimizationProductRecord[]>> {
    let products: OptimizationProductRecord[];

    try {
      products = await this.prisma.product.findMany({
        where: {
          category: {
            in: categories,
          },
          source: 'dataset',
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: optimizationProductSelect,
      });
    } catch {
      throw new InternalServerErrorException('Could not retrieve optimization candidates.');
    }

    return products.reduce((productsByCategory, product) => {
      const categoryProducts = productsByCategory.get(product.category) ?? [];
      categoryProducts.push(product);
      productsByCategory.set(product.category, categoryProducts);

      return productsByCategory;
    }, new Map<string, OptimizationProductRecord[]>());
  }

  private validateRequest(dto: OptimizeShoppingListDto): void {
    const weightSum = dto.weights.economic + dto.weights.sustainability;

    if (Math.abs(weightSum - 1) > WEIGHT_SUM_TOLERANCE) {
      throw new BadRequestException('Optimization weights must sum to 1.');
    }

    const categories = new Set<string>();

    dto.items.forEach((item) => {
      if (categories.has(item.category)) {
        throw new BadRequestException('Duplicate categories are not allowed.');
      }

      categories.add(item.category);
    });
  }

  private toSustainabilityInput(product: OptimizationProductRecord): SustainabilityProductInput {
    return {
      category: product.category,
      price: product.price,
      carbonKg: product.carbonKg,
      localProduct: product.localProduct,
      recyclablePackaging: product.recyclablePackaging,
      fairTrade: product.fairTrade,
      socialScore: product.socialScore,
    };
  }

  private toResponse(
    result: OptimizationResult,
    weights: OptimizeShoppingListDto['weights'],
    productsById: Map<string, OptimizationProductRecord>,
  ): ShoppingOptimizationResponse {
    return {
      ...result,
      weights: {
        economic: weights.economic,
        sustainability: weights.sustainability,
      },
      selectedItems: result.selectedItems.map((item) => this.toSelectedItemResponse(item, productsById)),
    };
  }

  private toSelectedItemResponse(
    item: SelectedOptimizationItem,
    productsById: Map<string, OptimizationProductRecord>,
  ): SelectedOptimizationItemResponse {
    const product = productsById.get(item.product.id);

    if (!product) {
      throw new InternalServerErrorException('Optimized product metadata is unavailable.');
    }

    return {
      category: item.groupKey,
      quantity: item.quantity,
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        price: product.price,
        store: {
          id: product.store.id,
          name: product.store.name,
        },
      },
      sustainabilityScore: item.product.sustainabilityScore,
      economicUtility: item.economicUtility,
      utilityScore: item.utilityScore,
      subtotal: item.subtotal,
      carbonSubtotal: item.carbonSubtotal,
    };
  }
}
