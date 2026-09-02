import { Injectable } from '@nestjs/common';
import {
  MAX_PRICE_PREMIUM_FOR_SUSTAINABLE_ALTERNATIVE,
  MAX_RECOMMENDATIONS,
  RECOMMENDATION_SCORE_DECIMALS,
  RECOMMENDATION_WEIGHTS,
} from './recommendation.constants';
import { RecommendationInputError } from './types/recommendation-error.type';
import { RecommendationProduct } from './types/recommendation-product.type';
import { ProductRecommendation, RecommendationResult } from './types/recommendation-result.type';

type RecommendationCandidate = {
  product: RecommendationProduct;
  savings: number;
  savingsPercentage: number;
  sustainabilityImprovement: number;
  carbonDifferenceKg: number;
};

@Injectable()
export class RecommendationEngineService {
  recommend(
    sourceProduct: RecommendationProduct,
    candidates: RecommendationProduct[],
  ): RecommendationResult {
    this.validateProduct(sourceProduct, 'sourceProduct');

    if (!Array.isArray(candidates)) {
      throw new RecommendationInputError('candidates must be an array.');
    }

    candidates.forEach((candidate, index) => {
      this.validateProduct(candidate, `candidates[${index}]`);

      if (candidate.id === sourceProduct.id) {
        throw new RecommendationInputError('candidate id must differ from source product id.');
      }
    });

    const recommendableCandidates = candidates
      .map((candidate) => this.toCandidate(sourceProduct, candidate))
      .filter((candidate) => this.isRecommendable(sourceProduct, candidate));

    const economicScores = this.normalize(recommendableCandidates.map((candidate) => candidate.savings));
    const sustainabilityScores = this.normalize(
      recommendableCandidates.map((candidate) => candidate.sustainabilityImprovement),
    );

    const recommendations = recommendableCandidates
      .map((candidate, index) => this.toRecommendation(candidate, economicScores[index], sustainabilityScores[index]))
      .sort((left, right) => this.compareRecommendations(left, right, recommendableCandidates))
      .slice(0, MAX_RECOMMENDATIONS);

    return {
      sourceProductId: sourceProduct.id,
      recommendations,
    };
  }

  private toCandidate(
    sourceProduct: RecommendationProduct,
    candidate: RecommendationProduct,
  ): RecommendationCandidate {
    const savings = sourceProduct.price - candidate.price;

    return {
      product: candidate,
      savings,
      savingsPercentage: this.round((savings / sourceProduct.price) * 100),
      sustainabilityImprovement: this.round(candidate.sustainabilityScore - sourceProduct.sustainabilityScore),
      carbonDifferenceKg: this.round(candidate.carbonKg - sourceProduct.carbonKg),
    };
  }

  private isRecommendable(
    sourceProduct: RecommendationProduct,
    candidate: RecommendationCandidate,
  ): boolean {
    const candidateIsCheaper = candidate.product.price < sourceProduct.price;
    const candidateIsAtLeastAsSustainable =
      candidate.product.sustainabilityScore >= sourceProduct.sustainabilityScore;
    const candidateIsMoreSustainable =
      candidate.product.sustainabilityScore > sourceProduct.sustainabilityScore;
    const candidatePriceWithinPremium =
      candidate.product.price <= sourceProduct.price * MAX_PRICE_PREMIUM_FOR_SUSTAINABLE_ALTERNATIVE;

    return (
      (candidateIsCheaper && candidateIsAtLeastAsSustainable) ||
      (candidateIsMoreSustainable && candidatePriceWithinPremium)
    );
  }

  private normalize(values: number[]): number[] {
    if (values.length === 0) {
      return [];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      return values.map(() => 50);
    }

    return values.map((value) => this.round(((value - min) / (max - min)) * 100));
  }

  private toRecommendation(
    candidate: RecommendationCandidate,
    economicImprovementScore: number,
    sustainabilityImprovementScore: number,
  ): ProductRecommendation {
    return {
      productId: candidate.product.id,
      savings: candidate.savings,
      savingsPercentage: candidate.savingsPercentage,
      sustainabilityImprovement: candidate.sustainabilityImprovement,
      carbonDifferenceKg: candidate.carbonDifferenceKg,
      economicImprovementScore,
      sustainabilityImprovementScore,
      recommendationScore: this.round(
        economicImprovementScore * RECOMMENDATION_WEIGHTS.economic +
          sustainabilityImprovementScore * RECOMMENDATION_WEIGHTS.sustainability,
      ),
      reason: this.buildReason(candidate),
    };
  }

  private buildReason(candidate: RecommendationCandidate): string {
    if (candidate.savings > 0 && candidate.sustainabilityImprovement > 0) {
      return `Ahorras ${this.formatClp(candidate.savings)} y mejoras el indice sostenible en ${candidate.sustainabilityImprovement} puntos.`;
    }

    if (candidate.savings < 0 && candidate.sustainabilityImprovement > 0) {
      return `Mejora el indice sostenible en ${candidate.sustainabilityImprovement} puntos por un ${Math.abs(
        candidate.savingsPercentage,
      ).toFixed(2)}% mas de precio.`;
    }

    return 'Reduce el costo manteniendo un nivel de sostenibilidad similar.';
  }

  private compareRecommendations(
    left: ProductRecommendation,
    right: ProductRecommendation,
    candidates: RecommendationCandidate[],
  ): number {
    const leftCandidate = this.findCandidate(left.productId, candidates);
    const rightCandidate = this.findCandidate(right.productId, candidates);

    return (
      right.recommendationScore - left.recommendationScore ||
      right.sustainabilityImprovement - left.sustainabilityImprovement ||
      right.savings - left.savings ||
      leftCandidate.product.carbonKg - rightCandidate.product.carbonKg ||
      left.productId.localeCompare(right.productId)
    );
  }

  private findCandidate(productId: string, candidates: RecommendationCandidate[]): RecommendationCandidate {
    const candidate = candidates.find((item) => item.product.id === productId);

    if (!candidate) {
      throw new RecommendationInputError('recommendation candidate metadata is unavailable.');
    }

    return candidate;
  }

  private validateProduct(product: RecommendationProduct, label: string): void {
    if (!product || typeof product !== 'object') {
      throw new RecommendationInputError(`${label} is required.`);
    }

    if (!product.id?.trim()) {
      throw new RecommendationInputError(`${label}.id is required.`);
    }

    if (!product.name?.trim()) {
      throw new RecommendationInputError(`${label}.name is required.`);
    }

    this.validatePositiveNumber(product.price, `${label}.price`);
    this.validateNonNegativeNumber(product.carbonKg, `${label}.carbonKg`);
    this.validateScore(product.sustainabilityScore, `${label}.sustainabilityScore`);
  }

  private validatePositiveNumber(value: number, label: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RecommendationInputError(`${label} must be greater than 0.`);
    }
  }

  private validateNonNegativeNumber(value: number, label: string): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RecommendationInputError(`${label} must be a non-negative number.`);
    }
  }

  private validateScore(value: number, label: string): void {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new RecommendationInputError(`${label} must be between 0 and 100.`);
    }
  }

  private round(value: number): number {
    const factor = 10 ** RECOMMENDATION_SCORE_DECIMALS;

    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  private formatClp(value: number): string {
    return `$${Math.round(value).toLocaleString('es-CL')}`;
  }
}
