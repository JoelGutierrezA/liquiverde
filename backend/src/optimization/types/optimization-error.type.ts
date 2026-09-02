export class OptimizationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OptimizationInputError';
  }
}

export class InsufficientBudgetError extends Error {
  constructor(message = 'Budget is insufficient to select one candidate from each group.') {
    super(message);
    this.name = 'InsufficientBudgetError';
  }
}
