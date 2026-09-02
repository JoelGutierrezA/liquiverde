import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OpenFoodFactsService } from '../integrations/open-food-facts/open-food-facts.service';
import { NormalizedOpenFoodFactsProduct } from '../integrations/open-food-facts/types/open-food-facts-product.type';
import { PrismaService } from '../prisma/prisma.service';
import { SustainabilityService } from '../sustainability/sustainability.service';
import {
  SustainabilityAnalysis,
  SustainabilityProductInput,
} from '../sustainability/types/sustainability-analysis.type';
import { SustainabilityInputError } from '../sustainability/types/sustainability-error.type';
import { FindProductsQueryDto } from './dto/find-products-query.dto';

const productSelect = {
  id: true,
  barcode: true,
  name: true,
  brand: true,
  category: true,
  description: true,
  imageUrl: true,
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

export type ProductResponse = Prisma.ProductGetPayload<{
  select: typeof productSelect;
}>;

const sustainabilityProductSelect = {
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
} satisfies Prisma.ProductSelect;

type SustainabilityProductRecord = Prisma.ProductGetPayload<{
  select: typeof sustainabilityProductSelect;
}>;

export type ProductAnalysisResponse = {
  product: {
    id: string;
    name: string;
    brand: string;
    category: string;
    price: number;
  };
  analysis: SustainabilityAnalysis;
  context: {
    category: string;
    comparedProducts: number;
  };
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openFoodFactsService: OpenFoodFactsService,
    private readonly sustainabilityService: SustainabilityService,
  ) {}

  async findAll(filters: FindProductsQueryDto = {}): Promise<ProductResponse[]> {
    try {
      return await this.prisma.product.findMany({
        where: this.buildWhere(filters),
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: productSelect,
      });
    } catch {
      throw new InternalServerErrorException('Could not retrieve products.');
    }
  }

  async findOne(id: string): Promise<ProductResponse> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        select: productSelect,
      });

      if (!product) {
        throw new NotFoundException(`Product ${id} was not found.`);
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Could not retrieve product.');
    }
  }

  async findByBarcode(barcode: string): Promise<ProductResponse | NormalizedOpenFoodFactsProduct> {
    try {
      const localProduct = await this.prisma.product.findUnique({
        where: { barcode },
        select: productSelect,
      });

      if (localProduct) {
        return localProduct;
      }
    } catch {
      throw new InternalServerErrorException('Could not retrieve product.');
    }

    const externalProduct = await this.openFoodFactsService.findByBarcode(barcode);

    if (!externalProduct) {
      throw new NotFoundException('Product was not found.');
    }

    return externalProduct;
  }

  async analyzeProduct(id: string): Promise<ProductAnalysisResponse> {
    let product: SustainabilityProductRecord | null;

    try {
      product = await this.prisma.product.findUnique({
        where: { id },
        select: sustainabilityProductSelect,
      });
    } catch {
      throw new InternalServerErrorException('Could not retrieve product.');
    }

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found.`);
    }

    let categoryProducts: SustainabilityProductRecord[];

    try {
      categoryProducts = await this.prisma.product.findMany({
        where: { category: product.category },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: sustainabilityProductSelect,
      });
    } catch {
      throw new InternalServerErrorException('Could not retrieve comparable products.');
    }

    try {
      return {
        product: {
          id: product.id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          price: product.price,
        },
        analysis: this.sustainabilityService.analyze(
          this.toSustainabilityInput(product),
          categoryProducts.map((categoryProduct) => this.toSustainabilityInput(categoryProduct)),
        ),
        context: {
          category: product.category,
          comparedProducts: categoryProducts.length,
        },
      };
    } catch (error) {
      if (error instanceof SustainabilityInputError) {
        throw new UnprocessableEntityException('Product sustainability data is invalid.');
      }

      throw new InternalServerErrorException('Could not analyze product.');
    }
  }

  private buildWhere(filters: FindProductsQueryDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          brand: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return where;
  }

  private toSustainabilityInput(product: SustainabilityProductRecord): SustainabilityProductInput {
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
}
