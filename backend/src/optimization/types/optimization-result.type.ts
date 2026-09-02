import { OptimizationCandidate } from './optimization-candidate.type';

export type SelectedOptimizationItem = {
  groupKey: string;
  quantity: number;
  product: OptimizationCandidate;
  economicUtility: number;
  utilityScore: number;
  subtotal: number;
  carbonSubtotal: number;
};

export type OptimizationResult = {
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
  selectedItems: SelectedOptimizationItem[];
};
