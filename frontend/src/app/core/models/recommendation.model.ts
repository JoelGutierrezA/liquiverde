import { Store } from './store.model';

export interface RecommendationProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  price: number;
  sustainabilityScore: number;
  carbonKg: number;
  store: Store;
}

export interface ProductRecommendation {
  product: RecommendationProduct;
  savings: number;
  savingsPercentage: number;
  sustainabilityImprovement: number;
  carbonDifferenceKg: number;
  economicImprovementScore: number;
  sustainabilityImprovementScore: number;
  recommendationScore: number;
  reason: string;
}

export interface ProductAlternativesResponse {
  sourceProduct: RecommendationProduct;
  recommendations: ProductRecommendation[];
}
