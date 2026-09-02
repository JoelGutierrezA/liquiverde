export interface SustainabilityBreakdown {
  carbonScore: number;
  localProductScore: number;
  recyclablePackagingScore: number;
  fairTradeScore: number;
}

export interface SustainabilityAnalysis {
  economicScore: number;
  environmentalScore: number;
  socialScore: number;
  sustainabilityScore: number;
  breakdown: SustainabilityBreakdown;
}

export interface ProductAnalysisResponse {
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
}

export interface ScoreBand {
  label: string;
  tone: 'low' | 'medium' | 'good' | 'excellent';
}

export function getScoreBand(score: number): ScoreBand {
  if (score < 40) {
    return { label: 'Bajo', tone: 'low' };
  }

  if (score < 70) {
    return { label: 'Medio', tone: 'medium' };
  }

  if (score < 85) {
    return { label: 'Bueno', tone: 'good' };
  }

  return { label: 'Excelente', tone: 'excellent' };
}
