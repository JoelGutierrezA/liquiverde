export interface OptimizationWeights {
  economic: number;
  sustainability: number;
}

export interface OptimizationItemRequest {
  category: string;
  quantity: number;
}

export interface OptimizationRequest {
  budget: number;
  weights: OptimizationWeights;
  items: OptimizationItemRequest[];
}

export interface OptimizationProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  store: {
    id: string;
    name: string;
  };
}

export interface SelectedOptimizationItem {
  category: string;
  quantity: number;
  product: OptimizationProduct;
  sustainabilityScore: number;
  economicUtility: number;
  utilityScore: number;
  subtotal: number;
  carbonSubtotal: number;
}

export interface OptimizationResponse {
  budget: number;
  totalCost: number;
  remainingBudget: number;
  baselineCost: number;
  savings: number;
  savingsPercentage: number;
  totalCarbonKg: number;
  baselineCarbonKg: number;
  carbonReductionKg: number;
  carbonReductionPercentage: number;
  averageSustainabilityScore: number;
  averageEconomicUtility: number;
  averageUtilityScore: number;
  weights: OptimizationWeights;
  selectedItems: SelectedOptimizationItem[];
}

export interface OptimizationPreset {
  id: 'savings' | 'balanced' | 'sustainable';
  label: string;
  description: string;
  weights: OptimizationWeights;
}

export const OPTIMIZATION_PRESETS: OptimizationPreset[] = [
  {
    id: 'savings',
    label: 'Ahorro',
    description: 'Prioriza gastar menos.',
    weights: {
      economic: 0.8,
      sustainability: 0.2,
    },
  },
  {
    id: 'balanced',
    label: 'Equilibrado',
    description: 'Balance entre precio e impacto.',
    weights: {
      economic: 0.5,
      sustainability: 0.5,
    },
  },
  {
    id: 'sustainable',
    label: 'Sustentable',
    description: 'Prioriza productos con mejor indice sostenible.',
    weights: {
      economic: 0.3,
      sustainability: 0.7,
    },
  },
];
