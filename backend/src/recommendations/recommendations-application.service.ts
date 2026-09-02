import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SustainabilityService } from '../sustainability/sustainability.service';
import { SustainabilityProductInput } from '../sustainability/types/sustainability-analysis.type';
import { SustainabilityInputError } from '../sustainability/types/sustainability-error.type';
import { RecommendationEngineService } from './recommendation-engine.service';
import { RecommendationProduct } from './types/recommendation-product.type';
import {
  ProductAlternativesResponse,
  ProductRecommendationResponse,
  RecommendationProductResponse,
} from './types/recommendation-response.type';
import { ProductRecommendation } from './types/recommendation-result.type';

const recommendationProductSelect = {
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

type RecommendationProductRecord = Prisma.ProductGetPayload<{
  select: typeof recommendationProductSelect;
}>;

@Injectable()
export class RecommendationsApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sustainabilityService: SustainabilityService,
    private readonly recommendationEngine: RecommendationEngineService,
  ) {}

  async findAlternatives(productId: string): Promise<ProductAlternativesResponse> {
    const sourceProduct = await this.loadSourceProduct(productId);
    const categoryProducts = await this.loadCategoryProducts(sourceProduct.category);
    const sustainabilityInputs = categoryProducts.map((product) => this.toSustainabilityInput(product));
    const productsById = new Map(categoryProducts.map((product) => [product.id, product]));
    const analysisById = this.analyzeProducts(categoryProducts, sustainabilityInputs);

    const sourceRecommendationProduct = this.toRecommendationProduct(
      sourceProduct,
      this.getSustainabilityScore(sourceProduct.id, analysisById),
    );
    const candidates = categoryProducts
      .filter((product) => product.id !== sourceProduct.id)
      .map((product) =>
        this.toRecommendationProduct(product, this.getSustainabilityScore(product.id, analysisById)),
      );
    const result = this.recommendationEngine.recommend(sourceRecommendationProduct, candidates);

    return {
      sourceProduct: this.toProductResponse(
        sourceProduct,
        this.getSustainabilityScore(sourceProduct.id, analysisById),
      ),
      recommendations: result.recommendations.map((recommendation) =>
        this.toRecommendationResponse(recommendation, productsById, analysisById),
      ),
    };
  }

  private async loadSourceProduct(productId: string): Promise<RecommendationProductRecord> {
    let product: RecommendationProductRecord | null;

    try {
      product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: recommendationProductSelect,
      });
    } catch {
      throw new InternalServerErrorException('Could not retrieve product.');
    }

    if (!product || product.source !== 'dataset') {
      throw new NotFoundException(`Product ${productId} was not found.`);
    }

    return product;
  }

  private async loadCategoryProducts(category: string): Promise<RecommendationProductRecord[]> {
    try {
      return await this.prisma.product.findMany({
        where: {
          category,
          source: 'dataset',
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: recommendationProductSelect,
      });
    } catch {
      throw new InternalServerErrorException('Could not retrieve recommendation candidates.');
    }
  }

  private analyzeProducts(
    products: RecommendationProductRecord[],
    sustainabilityInputs: SustainabilityProductInput[],
  ): Map<string, number> {
    try {
      return products.reduce((analysisById, product) => {
        analysisById.set(
          product.id,
          this.sustainabilityService.analyze(this.toSustainabilityInput(product), sustainabilityInputs)
            .sustainabilityScore,
        );

        return analysisById;
      }, new Map<string, number>());
    } catch (error) {
      if (error instanceof SustainabilityInputError) {
        throw new UnprocessableEntityException('Product sustainability data is invalid.');
      }

      throw error;
    }
  }

  private toRecommendationProduct(
    product: RecommendationProductRecord,
    sustainabilityScore: number,
  ): RecommendationProduct {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      sustainabilityScore,
      carbonKg: product.carbonKg,
    };
  }

  private toRecommendationResponse(
    recommendation: ProductRecommendation,
    productsById: Map<string, RecommendationProductRecord>,
    analysisById: Map<string, number>,
  ): ProductRecommendationResponse {
    const product = productsById.get(recommendation.productId);

    if (!product) {
      throw new InternalServerErrorException('Recommendation product metadata is unavailable.');
    }

    return {
      product: this.toProductResponse(product, this.getSustainabilityScore(product.id, analysisById)),
      savings: recommendation.savings,
      savingsPercentage: recommendation.savingsPercentage,
      sustainabilityImprovement: recommendation.sustainabilityImprovement,
      carbonDifferenceKg: recommendation.carbonDifferenceKg,
      economicImprovementScore: recommendation.economicImprovementScore,
      sustainabilityImprovementScore: recommendation.sustainabilityImprovementScore,
      recommendationScore: recommendation.recommendationScore,
      reason: recommendation.reason,
    };
  }

  private toProductResponse(
    product: RecommendationProductRecord,
    sustainabilityScore: number,
  ): RecommendationProductResponse {
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      sustainabilityScore,
      carbonKg: product.carbonKg,
      store: {
        id: product.store.id,
        name: product.store.name,
      },
    };
  }

  private toSustainabilityInput(product: RecommendationProductRecord): SustainabilityProductInput {
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

  private getSustainabilityScore(productId: string, analysisById: Map<string, number>): number {
    const score = analysisById.get(productId);

    if (score === undefined) {
      throw new InternalServerErrorException('Product sustainability analysis is unavailable.');
    }

    return score;
  }
}
