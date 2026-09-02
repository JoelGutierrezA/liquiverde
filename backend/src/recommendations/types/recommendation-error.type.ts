export class RecommendationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationInputError';
  }
}
