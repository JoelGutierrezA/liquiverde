export type ProductRecommendation = {
  productId: string;
  savings: number;
  savingsPercentage: number;
  sustainabilityImprovement: number;
  carbonDifferenceKg: number;
  economicImprovementScore: number;
  sustainabilityImprovementScore: number;
  recommendationScore: number;
  reason: string;
};

export type RecommendationResult = {
  sourceProductId: string;
  recommendations: ProductRecommendation[];
};
