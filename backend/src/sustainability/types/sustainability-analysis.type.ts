export type SustainabilityProductInput = {
  category: string;
  price: number;
  carbonKg: number;
  localProduct: boolean;
  recyclablePackaging: boolean;
  fairTrade: boolean;
  socialScore: number;
};

export type SustainabilityBreakdown = {
  carbonScore: number;
  localProductScore: number;
  recyclablePackagingScore: number;
  fairTradeScore: number;
};

export type SustainabilityAnalysis = {
  economicScore: number;
  environmentalScore: number;
  socialScore: number;
  sustainabilityScore: number;
  breakdown: SustainabilityBreakdown;
};
