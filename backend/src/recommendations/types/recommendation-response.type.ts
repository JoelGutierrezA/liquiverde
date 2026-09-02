export type RecommendationProductResponse = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  sustainabilityScore: number;
  carbonKg: number;
  store: {
    id: string;
    name: string;
  };
};

export type ProductRecommendationResponse = {
  product: RecommendationProductResponse;
  savings: number;
  savingsPercentage: number;
  sustainabilityImprovement: number;
  carbonDifferenceKg: number;
  economicImprovementScore: number;
  sustainabilityImprovementScore: number;
  recommendationScore: number;
  reason: string;
};

export type ProductAlternativesResponse = {
  sourceProduct: RecommendationProductResponse;
  recommendations: ProductRecommendationResponse[];
};
