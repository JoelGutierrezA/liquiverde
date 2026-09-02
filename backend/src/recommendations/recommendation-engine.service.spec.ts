import { RecommendationEngineService } from './recommendation-engine.service';
import { RecommendationInputError } from './types/recommendation-error.type';
import { RecommendationProduct } from './types/recommendation-product.type';

const sourceProduct: RecommendationProduct = {
  id: 'source',
  name: 'Source product',
  price: 1000,
  sustainabilityScore: 60,
  carbonKg: 1,
};

function candidate(overrides: Partial<RecommendationProduct>): RecommendationProduct {
  return {
    id: 'candidate',
    name: 'Candidate product',
    price: 800,
    sustainabilityScore: 70,
    carbonKg: 0.8,
    ...overrides,
  };
}

describe('RecommendationEngineService', () => {
  let service: RecommendationEngineService;

  beforeEach(() => {
    service = new RecommendationEngineService();
  });

  it('ranks a cheaper and more sustainable product first when it is the strongest candidate', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'best', price: 700, sustainabilityScore: 80, carbonKg: 0.6 }),
      candidate({ id: 'similar', price: 900, sustainabilityScore: 60, carbonKg: 0.9 }),
    ]);

    expect(result.recommendations[0]).toEqual(
      expect.objectContaining({
        productId: 'best',
        savings: 300,
        sustainabilityImprovement: 20,
      }),
    );
  });

  it('excludes a candidate that is more expensive and less sustainable', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'bad', price: 1100, sustainabilityScore: 50 }),
    ]);

    expect(result.recommendations).toEqual([]);
  });

  it('allows a more sustainable candidate with a price premium up to 15%', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'premium', price: 1150, sustainabilityScore: 85 }),
    ]);

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].productId).toBe('premium');
  });

  it('excludes a more sustainable candidate with excessive price premium', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'too-expensive', price: 1151, sustainabilityScore: 90 }),
    ]);

    expect(result.recommendations).toEqual([]);
  });

  it('calculates savings', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'cheaper', price: 850, sustainabilityScore: 70 }),
    ]);

    expect(result.recommendations[0].savings).toBe(150);
  });

  it('calculates savings percentage', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'cheaper', price: 850, sustainabilityScore: 70 }),
    ]);

    expect(result.recommendations[0].savingsPercentage).toBe(15);
  });

  it('calculates sustainability improvement', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'better', sustainabilityScore: 74.25 }),
    ]);

    expect(result.recommendations[0].sustainabilityImprovement).toBe(14.25);
  });

  it('calculates carbon difference', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'lower-carbon', carbonKg: 0.63 }),
    ]);

    expect(result.recommendations[0].carbonDifferenceKg).toBe(-0.37);
  });

  it('calculates recommendation score using 40% economic and 60% sustainability', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'economic', price: 800, sustainabilityScore: 70 }),
      candidate({ id: 'sustainable', price: 900, sustainabilityScore: 80 }),
    ]);

    expect(result.recommendations).toEqual([
      expect.objectContaining({
        productId: 'sustainable',
        economicImprovementScore: 0,
        sustainabilityImprovementScore: 100,
        recommendationScore: 60,
      }),
      expect.objectContaining({
        productId: 'economic',
        economicImprovementScore: 100,
        sustainabilityImprovementScore: 0,
        recommendationScore: 40,
      }),
    ]);
  });

  it('returns at most three recommendations', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'a', price: 900, sustainabilityScore: 75 }),
      candidate({ id: 'b', price: 890, sustainabilityScore: 74 }),
      candidate({ id: 'c', price: 880, sustainabilityScore: 73 }),
      candidate({ id: 'd', price: 870, sustainabilityScore: 72 }),
    ]);

    expect(result.recommendations).toHaveLength(3);
  });

  it('orders recommendations deterministically', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'b', price: 900, sustainabilityScore: 70, carbonKg: 0.7 }),
      candidate({ id: 'a', price: 900, sustainabilityScore: 70, carbonKg: 0.7 }),
    ]);

    expect(result.recommendations.map((item) => item.productId)).toEqual(['a', 'b']);
  });

  it('breaks ties by sustainability improvement, savings, carbon and id', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'less-sustainable', price: 700, sustainabilityScore: 65, carbonKg: 0.4 }),
      candidate({ id: 'more-sustainable', price: 800, sustainabilityScore: 80, carbonKg: 0.5 }),
      candidate({ id: 'lower-carbon', price: 800, sustainabilityScore: 80, carbonKg: 0.3 }),
    ]);

    expect(result.recommendations.map((item) => item.productId)).toEqual([
      'lower-carbon',
      'more-sustainable',
      'less-sustainable',
    ]);
  });

  it('returns an empty array when there are no recommendable candidates', () => {
    const result = service.recommend(sourceProduct, [
      candidate({ id: 'same-price-same-score', price: 1000, sustainabilityScore: 60 }),
    ]);

    expect(result).toEqual({
      sourceProductId: 'source',
      recommendations: [],
    });
  });

  it('rejects a candidate with the same id as the source product', () => {
    expect(() => service.recommend(sourceProduct, [candidate({ id: 'source' })])).toThrow(
      RecommendationInputError,
    );
  });

  it('rejects an invalid source product', () => {
    expect(() => service.recommend({ ...sourceProduct, id: '' }, [])).toThrow(RecommendationInputError);
  });

  it('rejects sustainability scores outside 0 to 100', () => {
    expect(() =>
      service.recommend(sourceProduct, [candidate({ id: 'invalid', sustainabilityScore: 101 })]),
    ).toThrow(RecommendationInputError);
  });

  it('rejects invalid prices', () => {
    expect(() => service.recommend(sourceProduct, [candidate({ id: 'invalid', price: 0 })])).toThrow(
      RecommendationInputError,
    );
  });

  it('rejects invalid carbon values', () => {
    expect(() => service.recommend(sourceProduct, [candidate({ id: 'invalid', carbonKg: -1 })])).toThrow(
      RecommendationInputError,
    );
  });

  it('lets a more sustainable small-premium product outrank a cheaper similar option in a milk-like case', () => {
    const result = service.recommend(
      {
        id: 'prod-milk-001',
        name: 'Leche entera familiar 1 L',
        price: 1150,
        sustainabilityScore: 66.58,
        carbonKg: 1.15,
      },
      [
        {
          id: 'prod-milk-002',
          name: 'Leche descremada economica 1 L',
          price: 980,
          sustainabilityScore: 65.63,
          carbonKg: 1.35,
        },
        {
          id: 'prod-milk-003',
          name: 'Leche organica local 1 L',
          price: 1320,
          sustainabilityScore: 75.14,
          carbonKg: 0.85,
        },
      ],
    );

    expect(result.recommendations.map((item) => item.productId)).toEqual(['prod-milk-003']);
  });
});
