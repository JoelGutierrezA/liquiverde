import { Injectable } from '@nestjs/common';
import {
  COMPARISON_TOLERANCE,
  OPTIMIZATION_DECIMALS,
  OPTIMIZATION_SCORE_MAX,
  OPTIMIZATION_SCORE_MIN,
  WEIGHT_SUM_TOLERANCE,
} from './optimization.constants';
import { OptimizationCandidate } from './types/optimization-candidate.type';
import { InsufficientBudgetError, OptimizationInputError } from './types/optimization-error.type';
import { OptimizationGroup, OptimizationInput } from './types/optimization-input.type';
import { OptimizationResult, SelectedOptimizationItem } from './types/optimization-result.type';

type CandidateMetrics = {
  groupKey: string;
  quantity: number;
  product: OptimizationCandidate;
  economicUtility: number;
  utilityScore: number;
  subtotal: number;
  carbonSubtotal: number;
  utilityContribution: number;
  economicContribution: number;
  sustainabilityContribution: number;
};

type PreparedGroup = {
  key: string;
  quantity: number;
  candidates: CandidateMetrics[];
  minSubtotal: number;
  maxPrice: number;
  maxCarbonKg: number;
};

type SolutionState = {
  selectedItems: CandidateMetrics[];
  totalCost: number;
  totalCarbonKg: number;
  totalUtility: number;
  totalEconomicUtility: number;
  totalSustainabilityScore: number;
  totalQuantity: number;
};

@Injectable()
export class OptimizationService {
  optimize(input: OptimizationInput): OptimizationResult {
    this.validateInput(input);

    const groups = input.groups.map((group) => this.prepareGroup(group, input.weights));
    const minRemainingCostByGroup = this.calculateMinRemainingCosts(groups);
    const baselineCost = groups.reduce((total, group) => total + group.maxPrice * group.quantity, 0);
    const baselineCarbonKg = groups.reduce((total, group) => total + group.maxCarbonKg * group.quantity, 0);

    let bestSolution: SolutionState | null = null;

    // DFS with budget pruning is adequate for the expected small MCKP shape: about 10 groups x 5 candidates.
    const search = (groupIndex: number, state: SolutionState): void => {
      if (state.totalCost - input.budget > COMPARISON_TOLERANCE) {
        return;
      }

      if (state.totalCost + minRemainingCostByGroup[groupIndex] - input.budget > COMPARISON_TOLERANCE) {
        return;
      }

      if (groupIndex === groups.length) {
        if (!bestSolution || this.isBetterSolution(state, bestSolution)) {
          bestSolution = {
            ...state,
            selectedItems: [...state.selectedItems],
          };
        }

        return;
      }

      groups[groupIndex].candidates.forEach((candidate) => {
        search(groupIndex + 1, {
          selectedItems: [...state.selectedItems, candidate],
          totalCost: state.totalCost + candidate.subtotal,
          totalCarbonKg: state.totalCarbonKg + candidate.carbonSubtotal,
          totalUtility: state.totalUtility + candidate.utilityContribution,
          totalEconomicUtility: state.totalEconomicUtility + candidate.economicContribution,
          totalSustainabilityScore: state.totalSustainabilityScore + candidate.sustainabilityContribution,
          totalQuantity: state.totalQuantity + candidate.quantity,
        });
      });
    };

    search(0, {
      selectedItems: [],
      totalCost: 0,
      totalCarbonKg: 0,
      totalUtility: 0,
      totalEconomicUtility: 0,
      totalSustainabilityScore: 0,
      totalQuantity: 0,
    });

    if (!bestSolution) {
      throw new InsufficientBudgetError();
    }

    return this.buildResult(input.budget, bestSolution, baselineCost, baselineCarbonKg);
  }

  private prepareGroup(group: OptimizationGroup, weights: OptimizationInput['weights']): PreparedGroup {
    const prices = group.candidates.map((candidate) => candidate.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const maxCarbonKg = Math.max(...group.candidates.map((candidate) => candidate.carbonKg));

    const candidates = [...group.candidates]
      .sort((firstCandidate, secondCandidate) => firstCandidate.id.localeCompare(secondCandidate.id))
      .map((candidate) => {
        const economicUtility = this.calculateEconomicUtility(candidate.price, minPrice, maxPrice);
        const utilityScore = economicUtility * weights.economic + candidate.sustainabilityScore * weights.sustainability;

        return {
          groupKey: group.key,
          quantity: group.quantity,
          product: { ...candidate },
          economicUtility,
          utilityScore,
          subtotal: candidate.price * group.quantity,
          carbonSubtotal: candidate.carbonKg * group.quantity,
          utilityContribution: utilityScore * group.quantity,
          economicContribution: economicUtility * group.quantity,
          sustainabilityContribution: candidate.sustainabilityScore * group.quantity,
        };
      });

    return {
      key: group.key,
      quantity: group.quantity,
      candidates,
      minSubtotal: minPrice * group.quantity,
      maxPrice,
      maxCarbonKg,
    };
  }

  private calculateEconomicUtility(candidatePrice: number, minPrice: number, maxPrice: number): number {
    if (maxPrice === minPrice) {
      return OPTIMIZATION_SCORE_MAX;
    }

    return (OPTIMIZATION_SCORE_MAX * (maxPrice - candidatePrice)) / (maxPrice - minPrice);
  }

  private calculateMinRemainingCosts(groups: PreparedGroup[]): number[] {
    const minRemainingCosts = new Array<number>(groups.length + 1).fill(0);

    for (let index = groups.length - 1; index >= 0; index -= 1) {
      minRemainingCosts[index] = minRemainingCosts[index + 1] + groups[index].minSubtotal;
    }

    return minRemainingCosts;
  }

  private isBetterSolution(candidate: SolutionState, currentBest: SolutionState): boolean {
    const candidateAverageSustainability = candidate.totalSustainabilityScore / candidate.totalQuantity;
    const currentAverageSustainability = currentBest.totalSustainabilityScore / currentBest.totalQuantity;

    if (this.isMeaningfullyGreater(candidate.totalUtility, currentBest.totalUtility)) {
      return true;
    }

    if (this.isMeaningfullyGreater(currentBest.totalUtility, candidate.totalUtility)) {
      return false;
    }

    if (this.isMeaningfullyLower(candidate.totalCost, currentBest.totalCost)) {
      return true;
    }

    if (this.isMeaningfullyLower(currentBest.totalCost, candidate.totalCost)) {
      return false;
    }

    if (this.isMeaningfullyGreater(candidateAverageSustainability, currentAverageSustainability)) {
      return true;
    }

    if (this.isMeaningfullyGreater(currentAverageSustainability, candidateAverageSustainability)) {
      return false;
    }

    if (this.isMeaningfullyLower(candidate.totalCarbonKg, currentBest.totalCarbonKg)) {
      return true;
    }

    if (this.isMeaningfullyLower(currentBest.totalCarbonKg, candidate.totalCarbonKg)) {
      return false;
    }

    return this.stableSelectionKey(candidate) < this.stableSelectionKey(currentBest);
  }

  private buildResult(
    budget: number,
    solution: SolutionState,
    baselineCost: number,
    baselineCarbonKg: number,
  ): OptimizationResult {
    const savings = baselineCost - solution.totalCost;
    const carbonReductionKg = baselineCarbonKg - solution.totalCarbonKg;

    return {
      budget: this.round(budget),
      totalCost: this.round(solution.totalCost),
      remainingBudget: this.round(budget - solution.totalCost),
      baselineCost: this.round(baselineCost),
      savings: this.round(savings),
      savingsPercentage: this.roundPercentage(baselineCost === 0 ? 0 : (savings / baselineCost) * 100),
      totalCarbonKg: this.round(solution.totalCarbonKg),
      baselineCarbonKg: this.round(baselineCarbonKg),
      carbonReductionKg: this.round(carbonReductionKg),
      carbonReductionPercentage: this.roundPercentage(
        baselineCarbonKg === 0 ? 0 : (carbonReductionKg / baselineCarbonKg) * 100,
      ),
      averageSustainabilityScore: this.roundScore(solution.totalSustainabilityScore / solution.totalQuantity),
      averageEconomicUtility: this.roundScore(solution.totalEconomicUtility / solution.totalQuantity),
      averageUtilityScore: this.roundScore(solution.totalUtility / solution.totalQuantity),
      selectedItems: solution.selectedItems.map((selectedItem) => this.toSelectedItem(selectedItem)),
    };
  }

  private toSelectedItem(selectedItem: CandidateMetrics): SelectedOptimizationItem {
    return {
      groupKey: selectedItem.groupKey,
      quantity: selectedItem.quantity,
      product: { ...selectedItem.product },
      economicUtility: this.roundScore(selectedItem.economicUtility),
      utilityScore: this.roundScore(selectedItem.utilityScore),
      subtotal: this.round(selectedItem.subtotal),
      carbonSubtotal: this.round(selectedItem.carbonSubtotal),
    };
  }

  private stableSelectionKey(solution: SolutionState): string {
    return solution.selectedItems.map((selectedItem) => selectedItem.product.id).join('|');
  }

  private validateInput(input: OptimizationInput): void {
    if (!input || typeof input !== 'object') {
      throw new OptimizationInputError('Optimization input is required.');
    }

    this.validatePositiveFiniteNumber(input.budget, 'budget');
    this.validateWeights(input.weights);

    if (!Array.isArray(input.groups) || input.groups.length === 0) {
      throw new OptimizationInputError('At least one optimization group is required.');
    }

    input.groups.forEach((group, groupIndex) => this.validateGroup(group, groupIndex));
  }

  private validateWeights(weights: OptimizationInput['weights']): void {
    if (!weights || typeof weights !== 'object') {
      throw new OptimizationInputError('Optimization weights are required.');
    }

    this.validateNonNegativeFiniteNumber(weights.economic, 'weights.economic');
    this.validateNonNegativeFiniteNumber(weights.sustainability, 'weights.sustainability');

    const weightSum = weights.economic + weights.sustainability;

    if (Math.abs(weightSum - 1) > WEIGHT_SUM_TOLERANCE) {
      throw new OptimizationInputError('Optimization weights must sum to 1.');
    }
  }

  private validateGroup(group: OptimizationGroup, groupIndex: number): void {
    if (!group || typeof group !== 'object') {
      throw new OptimizationInputError(`groups[${groupIndex}] is required.`);
    }

    if (typeof group.key !== 'string' || group.key.trim().length === 0) {
      throw new OptimizationInputError(`groups[${groupIndex}].key is required.`);
    }

    if (!Number.isInteger(group.quantity) || group.quantity < 1) {
      throw new OptimizationInputError(`groups[${groupIndex}].quantity must be an integer greater than or equal to 1.`);
    }

    if (!Array.isArray(group.candidates) || group.candidates.length === 0) {
      throw new OptimizationInputError(`groups[${groupIndex}].candidates must include at least one candidate.`);
    }

    const candidateIds = new Set<string>();

    group.candidates.forEach((candidate, candidateIndex) => {
      this.validateCandidate(candidate, groupIndex, candidateIndex);

      if (candidateIds.has(candidate.id)) {
        throw new OptimizationInputError(`groups[${groupIndex}].candidates contains duplicate candidate ids.`);
      }

      candidateIds.add(candidate.id);
    });
  }

  private validateCandidate(candidate: OptimizationCandidate, groupIndex: number, candidateIndex: number): void {
    const label = `groups[${groupIndex}].candidates[${candidateIndex}]`;

    if (!candidate || typeof candidate !== 'object') {
      throw new OptimizationInputError(`${label} is required.`);
    }

    if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
      throw new OptimizationInputError(`${label}.id is required.`);
    }

    if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
      throw new OptimizationInputError(`${label}.name is required.`);
    }

    if (typeof candidate.category !== 'string' || candidate.category.trim().length === 0) {
      throw new OptimizationInputError(`${label}.category is required.`);
    }

    this.validatePositiveFiniteNumber(candidate.price, `${label}.price`);
    this.validateNonNegativeFiniteNumber(candidate.carbonKg, `${label}.carbonKg`);
    this.validateScore(candidate.sustainabilityScore, `${label}.sustainabilityScore`);
  }

  private validatePositiveFiniteNumber(value: number, label: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new OptimizationInputError(`${label} must be a positive number.`);
    }
  }

  private validateNonNegativeFiniteNumber(value: number, label: string): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new OptimizationInputError(`${label} must be a non-negative number.`);
    }
  }

  private validateScore(value: number, label: string): void {
    if (!Number.isFinite(value) || value < OPTIMIZATION_SCORE_MIN || value > OPTIMIZATION_SCORE_MAX) {
      throw new OptimizationInputError(`${label} must be between 0 and 100.`);
    }
  }

  private isMeaningfullyGreater(firstValue: number, secondValue: number): boolean {
    return firstValue - secondValue > COMPARISON_TOLERANCE;
  }

  private isMeaningfullyLower(firstValue: number, secondValue: number): boolean {
    return secondValue - firstValue > COMPARISON_TOLERANCE;
  }

  private roundScore(score: number): number {
    return this.round(Math.min(OPTIMIZATION_SCORE_MAX, Math.max(OPTIMIZATION_SCORE_MIN, score)));
  }

  private roundPercentage(value: number): number {
    return this.round(Math.min(100, Math.max(0, value)));
  }

  private round(value: number): number {
    const factor = 10 ** OPTIMIZATION_DECIMALS;

    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
