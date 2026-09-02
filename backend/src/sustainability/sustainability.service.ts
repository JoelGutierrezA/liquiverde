import { Injectable } from '@nestjs/common';
import {
  ENVIRONMENTAL_WEIGHTS,
  SCORE_DECIMALS,
  SCORE_MAX,
  SCORE_MIN,
  SOCIAL_WEIGHTS,
  SUSTAINABILITY_WEIGHTS,
} from './sustainability.constants';
import { SustainabilityAnalysis, SustainabilityProductInput } from './types/sustainability-analysis.type';
import { SustainabilityInputError } from './types/sustainability-error.type';

type NumericRange = {
  min: number;
  max: number;
};

@Injectable()
export class SustainabilityService {
  analyze(
    product: SustainabilityProductInput,
    categoryProducts: SustainabilityProductInput[],
  ): SustainabilityAnalysis {
    this.validateProduct(product, 'product');
    this.validateCategoryProducts(product.category, categoryProducts);

    const priceRange = this.getRange(categoryProducts.map((categoryProduct) => categoryProduct.price));
    const carbonRange = this.getRange(categoryProducts.map((categoryProduct) => categoryProduct.carbonKg));

    const economicScore = this.calculateInverseRangeScore(product.price, priceRange);
    const carbonScore = this.calculateInverseRangeScore(product.carbonKg, carbonRange);
    const localProductScore = this.booleanScore(product.localProduct);
    const recyclablePackagingScore = this.booleanScore(product.recyclablePackaging);
    const fairTradeScore = this.booleanScore(product.fairTrade);

    const environmentalScore = this.roundScore(
      carbonScore * ENVIRONMENTAL_WEIGHTS.carbon +
        localProductScore * ENVIRONMENTAL_WEIGHTS.localProduct +
        recyclablePackagingScore * ENVIRONMENTAL_WEIGHTS.recyclablePackaging,
    );

    const socialScore = this.roundScore(
      product.socialScore * SOCIAL_WEIGHTS.base + fairTradeScore * SOCIAL_WEIGHTS.fairTrade,
    );

    const sustainabilityScore = this.roundScore(
      economicScore * SUSTAINABILITY_WEIGHTS.economic +
        environmentalScore * SUSTAINABILITY_WEIGHTS.environmental +
        socialScore * SUSTAINABILITY_WEIGHTS.social,
    );

    return {
      economicScore,
      environmentalScore,
      socialScore,
      sustainabilityScore,
      breakdown: {
        carbonScore,
        localProductScore,
        recyclablePackagingScore,
        fairTradeScore,
      },
    };
  }

  private calculateInverseRangeScore(value: number, range: NumericRange): number {
    if (range.max === range.min) {
      return SCORE_MAX;
    }

    return this.roundScore((SCORE_MAX * (range.max - value)) / (range.max - range.min));
  }

  private getRange(values: number[]): NumericRange {
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  private booleanScore(value: boolean): number {
    return value ? SCORE_MAX : SCORE_MIN;
  }

  private roundScore(score: number): number {
    const clampedScore = Math.min(SCORE_MAX, Math.max(SCORE_MIN, score));
    const factor = 10 ** SCORE_DECIMALS;

    return Math.round((clampedScore + Number.EPSILON) * factor) / factor;
  }

  private validateCategoryProducts(
    productCategory: string,
    categoryProducts: SustainabilityProductInput[],
  ): void {
    if (!Array.isArray(categoryProducts) || categoryProducts.length === 0) {
      throw new SustainabilityInputError('Category comparison products are required.');
    }

    categoryProducts.forEach((categoryProduct, index) => {
      this.validateProduct(categoryProduct, `categoryProducts[${index}]`);

      if (categoryProduct.category !== productCategory) {
        throw new SustainabilityInputError('All comparison products must belong to the product category.');
      }
    });
  }

  private validateProduct(product: SustainabilityProductInput, label: string): void {
    if (!product || typeof product !== 'object') {
      throw new SustainabilityInputError(`${label} is required.`);
    }

    if (!product.category.trim()) {
      throw new SustainabilityInputError(`${label}.category is required.`);
    }

    this.validateNonNegativeFiniteNumber(product.price, `${label}.price`);
    this.validateNonNegativeFiniteNumber(product.carbonKg, `${label}.carbonKg`);
    this.validateScore(product.socialScore, `${label}.socialScore`);
    this.validateBoolean(product.localProduct, `${label}.localProduct`);
    this.validateBoolean(product.recyclablePackaging, `${label}.recyclablePackaging`);
    this.validateBoolean(product.fairTrade, `${label}.fairTrade`);
  }

  private validateNonNegativeFiniteNumber(value: number, label: string): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new SustainabilityInputError(`${label} must be a non-negative number.`);
    }
  }

  private validateScore(value: number, label: string): void {
    if (!Number.isFinite(value) || value < SCORE_MIN || value > SCORE_MAX) {
      throw new SustainabilityInputError(`${label} must be between 0 and 100.`);
    }
  }

  private validateBoolean(value: boolean, label: string): void {
    if (typeof value !== 'boolean') {
      throw new SustainabilityInputError(`${label} must be a boolean.`);
    }
  }
}
