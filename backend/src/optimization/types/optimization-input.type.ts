import { OptimizationCandidate } from './optimization-candidate.type';

export type OptimizationWeights = {
  economic: number;
  sustainability: number;
};

export type OptimizationGroup = {
  key: string;
  quantity: number;
  candidates: OptimizationCandidate[];
};

export type OptimizationInput = {
  budget: number;
  weights: OptimizationWeights;
  groups: OptimizationGroup[];
};
