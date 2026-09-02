import { OPTIMIZATION_PRESETS } from './optimization.constants';
import { OptimizationService } from './optimization.service';
import { OptimizationCandidate } from './types/optimization-candidate.type';
import { InsufficientBudgetError, OptimizationInputError } from './types/optimization-error.type';
import { OptimizationGroup, OptimizationInput } from './types/optimization-input.type';

const makeCandidate = (overrides: Partial<OptimizationCandidate> = {}): OptimizationCandidate => ({
  id: 'candidate-a',
  name: 'Candidate A',
  category: 'milk',
  price: 1000,
  carbonKg: 1,
  sustainabilityScore: 50,
  ...overrides,
});

const makeGroup = (overrides: Partial<OptimizationGroup> = {}): OptimizationGroup => ({
  key: 'milk',
  quantity: 1,
  candidates: [
    makeCandidate({
      id: 'milk-cheap',
      name: 'Cheap milk',
      price: 1000,
      carbonKg: 2,
      sustainabilityScore: 40,
    }),
    makeCandidate({
      id: 'milk-green',
      name: 'Green milk',
      price: 2000,
      carbonKg: 0.5,
      sustainabilityScore: 95,
    }),
  ],
  ...overrides,
});

const makeInput = (overrides: Partial<OptimizationInput> = {}): OptimizationInput => ({
  budget: 5000,
  weights: OPTIMIZATION_PRESETS.balanced,
  groups: [makeGroup()],
  ...overrides,
});

describe('OptimizationService', () => {
  let service: OptimizationService;

  beforeEach(() => {
    service = new OptimizationService();
  });

  it('selects exactly one alternative per group', () => {
    const result = service.optimize(
      makeInput({
        groups: [
          makeGroup({ key: 'milk' }),
          makeGroup({
            key: 'rice',
            candidates: [
              makeCandidate({ id: 'rice-cheap', name: 'Cheap rice', category: 'rice', price: 1200 }),
              makeCandidate({ id: 'rice-green', name: 'Green rice', category: 'rice', price: 2200 }),
            ],
          }),
        ],
      }),
    );

    expect(result.selectedItems).toHaveLength(2);
    expect(result.selectedItems.map((item) => item.groupKey)).toEqual(['milk', 'rice']);
  });

  it('never exceeds the budget', () => {
    const result = service.optimize(
      makeInput({
        budget: 2500,
        groups: [
          makeGroup({ key: 'milk' }),
          makeGroup({
            key: 'rice',
            candidates: [makeCandidate({ id: 'rice-cheap', name: 'Cheap rice', category: 'rice', price: 1200 })],
          }),
        ],
      }),
    );

    expect(result.totalCost).toBeLessThanOrEqual(2500);
  });

  it('savings mode favors cheaper products', () => {
    const result = service.optimize(
      makeInput({
        weights: OPTIMIZATION_PRESETS.savings,
      }),
    );

    expect(result.selectedItems[0].product.id).toBe('milk-cheap');
  });

  it('sustainable mode can select a more expensive but more sustainable alternative', () => {
    const result = service.optimize(
      makeInput({
        weights: OPTIMIZATION_PRESETS.sustainable,
      }),
    );

    expect(result.selectedItems[0].product.id).toBe('milk-green');
  });

  it('balanced mode can produce a coherent trade-off', () => {
    const result = service.optimize(
      makeInput({
        groups: [
          makeGroup({
            candidates: [
              makeCandidate({ id: 'cheap', name: 'Cheap', price: 1000, sustainabilityScore: 0 }),
              makeCandidate({ id: 'middle', name: 'Middle', price: 1500, sustainabilityScore: 80 }),
              makeCandidate({ id: 'expensive', name: 'Expensive', price: 2000, sustainabilityScore: 100 }),
            ],
          }),
        ],
      }),
    );

    expect(result.selectedItems[0].product.id).toBe('middle');
  });

  it('allows a budget exactly equal to the optimal total cost', () => {
    const result = service.optimize(
      makeInput({
        budget: 2200,
        groups: [
          makeGroup({ key: 'milk', candidates: [makeCandidate({ id: 'milk-only', price: 1000 })] }),
          makeGroup({
            key: 'rice',
            candidates: [makeCandidate({ id: 'rice-only', category: 'rice', price: 1200 })],
          }),
        ],
      }),
    );

    expect(result.totalCost).toBe(2200);
    expect(result.remainingBudget).toBe(0);
  });

  it('throws InsufficientBudgetError when no complete selection fits the budget', () => {
    expect(() =>
      service.optimize(
        makeInput({
          budget: 999,
        }),
      ),
    ).toThrow(InsufficientBudgetError);
  });

  it('supports a single group', () => {
    const result = service.optimize(makeInput());

    expect(result.selectedItems).toHaveLength(1);
    expect(result.selectedItems[0].groupKey).toBe('milk');
  });

  it('supports multiple groups', () => {
    const result = service.optimize(
      makeInput({
        groups: [
          makeGroup({ key: 'milk' }),
          makeGroup({ key: 'rice', candidates: [makeCandidate({ id: 'rice-only', category: 'rice' })] }),
          makeGroup({ key: 'bread', candidates: [makeCandidate({ id: 'bread-only', category: 'bread' })] }),
        ],
      }),
    );

    expect(result.selectedItems).toHaveLength(3);
  });

  it('applies quantity to cost, carbon and weighted averages', () => {
    const result = service.optimize(
      makeInput({
        groups: [
          makeGroup({
            quantity: 2,
            candidates: [makeCandidate({ id: 'milk-only', price: 1000, carbonKg: 1.5, sustainabilityScore: 70 })],
          }),
        ],
      }),
    );

    expect(result.selectedItems[0]).toEqual(
      expect.objectContaining({
        quantity: 2,
        subtotal: 2000,
        carbonSubtotal: 3,
      }),
    );
    expect(result.totalCost).toBe(2000);
    expect(result.totalCarbonKg).toBe(3);
    expect(result.averageSustainabilityScore).toBe(70);
  });

  it('rejects weights that do not sum to 1', () => {
    expect(() =>
      service.optimize(
        makeInput({
          weights: {
            economic: 0.8,
            sustainability: 0.5,
          },
        }),
      ),
    ).toThrow(OptimizationInputError);
  });

  it('rejects negative weights', () => {
    expect(() =>
      service.optimize(
        makeInput({
          weights: {
            economic: -0.2,
            sustainability: 1.2,
          },
        }),
      ),
    ).toThrow(OptimizationInputError);
  });

  it('rejects budget less than or equal to zero', () => {
    expect(() => service.optimize(makeInput({ budget: 0 }))).toThrow(OptimizationInputError);
  });

  it('rejects groups without candidates', () => {
    expect(() => service.optimize(makeInput({ groups: [makeGroup({ candidates: [] })] }))).toThrow(
      OptimizationInputError,
    );
  });

  it('rejects candidates with invalid price', () => {
    expect(() =>
      service.optimize(
        makeInput({
          groups: [makeGroup({ candidates: [makeCandidate({ price: 0 })] })],
        }),
      ),
    ).toThrow(OptimizationInputError);
  });

  it('rejects candidates with sustainabilityScore greater than 100', () => {
    expect(() =>
      service.optimize(
        makeInput({
          groups: [makeGroup({ candidates: [makeCandidate({ sustainabilityScore: 101 })] })],
        }),
      ),
    ).toThrow(OptimizationInputError);
  });

  it('rejects candidates with negative carbonKg', () => {
    expect(() =>
      service.optimize(
        makeInput({
          groups: [makeGroup({ candidates: [makeCandidate({ carbonKg: -0.1 })] })],
        }),
      ),
    ).toThrow(OptimizationInputError);
  });

  it('rejects duplicate candidate ids inside a group', () => {
    expect(() =>
      service.optimize(
        makeInput({
          groups: [
            makeGroup({
              candidates: [
                makeCandidate({ id: 'duplicated', name: 'First' }),
                makeCandidate({ id: 'duplicated', name: 'Second' }),
              ],
            }),
          ],
        }),
      ),
    ).toThrow(OptimizationInputError);
  });

  it('returns perfect economic utility when all candidates have the same price', () => {
    const result = service.optimize(
      makeInput({
        groups: [
          makeGroup({
            candidates: [
              makeCandidate({ id: 'same-a', price: 1000, sustainabilityScore: 40 }),
              makeCandidate({ id: 'same-b', price: 1000, sustainabilityScore: 80 }),
            ],
          }),
        ],
      }),
    );

    expect(result.selectedItems[0].economicUtility).toBe(100);
  });

  it('uses lower total cost as the first tie-breaker', () => {
    const result = service.optimize(
      makeInput({
        weights: OPTIMIZATION_PRESETS.balanced,
        groups: [
          makeGroup({
            candidates: [
              makeCandidate({ id: 'cheap-tie', name: 'Cheap tie', price: 1000, sustainabilityScore: 0 }),
              makeCandidate({ id: 'expensive-tie', name: 'Expensive tie', price: 2000, sustainabilityScore: 100 }),
            ],
          }),
        ],
      }),
    );

    expect(result.selectedItems[0].product.id).toBe('cheap-tie');
  });

  it('uses higher average sustainability as the second tie-breaker', () => {
    const result = service.optimize(
      makeInput({
        weights: {
          economic: 1,
          sustainability: 0,
        },
        groups: [
          makeGroup({
            candidates: [
              makeCandidate({ id: 'a-low-sustainability', price: 1000, sustainabilityScore: 20 }),
              makeCandidate({ id: 'b-high-sustainability', price: 1000, sustainabilityScore: 80 }),
            ],
          }),
        ],
      }),
    );

    expect(result.selectedItems[0].product.id).toBe('b-high-sustainability');
  });

  it('calculates savings from the most expensive candidate baseline', () => {
    const result = service.optimize(makeInput({ weights: OPTIMIZATION_PRESETS.savings }));

    expect(result.baselineCost).toBe(2000);
    expect(result.totalCost).toBe(1000);
    expect(result.savings).toBe(1000);
  });

  it('calculates savingsPercentage from the cost baseline', () => {
    const result = service.optimize(makeInput({ weights: OPTIMIZATION_PRESETS.savings }));

    expect(result.savingsPercentage).toBe(50);
  });

  it('calculates totalCarbonKg', () => {
    const result = service.optimize(
      makeInput({
        groups: [makeGroup({ candidates: [makeCandidate({ id: 'milk-only', carbonKg: 1.25 })] })],
      }),
    );

    expect(result.totalCarbonKg).toBe(1.25);
  });

  it('calculates carbonReductionKg from the highest-carbon baseline', () => {
    const result = service.optimize(
      makeInput({
        groups: [
          makeGroup({
            candidates: [
              makeCandidate({ id: 'cleaner', carbonKg: 1, price: 1000, sustainabilityScore: 80 }),
              makeCandidate({ id: 'dirty', carbonKg: 3, price: 2000, sustainabilityScore: 10 }),
            ],
          }),
        ],
      }),
    );

    expect(result.baselineCarbonKg).toBe(3);
    expect(result.carbonReductionKg).toBe(2);
    expect(result.carbonReductionPercentage).toBe(66.67);
  });

  it('returns deterministic results for the same input', () => {
    const input = makeInput({
      groups: [
        makeGroup(),
        makeGroup({ key: 'rice', candidates: [makeCandidate({ id: 'rice-only', category: 'rice' })] }),
      ],
    });

    expect(service.optimize(input)).toEqual(service.optimize(input));
  });

  it('keeps output scores between 0 and 100', () => {
    const result = service.optimize(makeInput({ weights: OPTIMIZATION_PRESETS.sustainable }));
    const selectedItem = result.selectedItems[0];

    expect(result.averageEconomicUtility).toBeGreaterThanOrEqual(0);
    expect(result.averageEconomicUtility).toBeLessThanOrEqual(100);
    expect(result.averageSustainabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.averageSustainabilityScore).toBeLessThanOrEqual(100);
    expect(result.averageUtilityScore).toBeGreaterThanOrEqual(0);
    expect(result.averageUtilityScore).toBeLessThanOrEqual(100);
    expect(selectedItem.economicUtility).toBeGreaterThanOrEqual(0);
    expect(selectedItem.economicUtility).toBeLessThanOrEqual(100);
    expect(selectedItem.utilityScore).toBeGreaterThanOrEqual(0);
    expect(selectedItem.utilityScore).toBeLessThanOrEqual(100);
  });

  it('changes the LiquiVerde representative selection when weights change', () => {
    const liquiVerdeGroups = [
      makeGroup({
        key: 'milk',
        candidates: [
          makeCandidate({
            id: 'milk-cheap',
            name: 'Leche economica',
            category: 'milk',
            price: 1000,
            carbonKg: 2,
            sustainabilityScore: 40,
          }),
          makeCandidate({
            id: 'milk-green',
            name: 'Leche sustentable',
            category: 'milk',
            price: 1800,
            carbonKg: 0.8,
            sustainabilityScore: 95,
          }),
        ],
      }),
      makeGroup({
        key: 'rice',
        candidates: [
          makeCandidate({
            id: 'rice-cheap',
            name: 'Arroz economico',
            category: 'rice',
            price: 1200,
            carbonKg: 1.5,
            sustainabilityScore: 45,
          }),
          makeCandidate({
            id: 'rice-green',
            name: 'Arroz sustentable',
            category: 'rice',
            price: 2100,
            carbonKg: 0.7,
            sustainabilityScore: 90,
          }),
        ],
      }),
      makeGroup({
        key: 'cereal',
        candidates: [
          makeCandidate({
            id: 'cereal-cheap',
            name: 'Cereal economico',
            category: 'cereal',
            price: 1500,
            carbonKg: 1.2,
            sustainabilityScore: 50,
          }),
          makeCandidate({
            id: 'cereal-green',
            name: 'Cereal sustentable',
            category: 'cereal',
            price: 2600,
            carbonKg: 0.6,
            sustainabilityScore: 92,
          }),
        ],
      }),
    ];

    const savingsResult = service.optimize(
      makeInput({
        budget: 6000,
        weights: OPTIMIZATION_PRESETS.savings,
        groups: liquiVerdeGroups,
      }),
    );
    const sustainableResult = service.optimize(
      makeInput({
        budget: 6000,
        weights: OPTIMIZATION_PRESETS.sustainable,
        groups: liquiVerdeGroups,
      }),
    );

    expect(savingsResult.selectedItems.map((item) => item.product.id)).toEqual([
      'milk-cheap',
      'rice-cheap',
      'cereal-cheap',
    ]);
    expect(sustainableResult.selectedItems.map((item) => item.product.id)).toEqual([
      'milk-green',
      'rice-green',
      'cereal-cheap',
    ]);
    expect(sustainableResult.averageSustainabilityScore).toBeGreaterThan(savingsResult.averageSustainabilityScore);
  });
});
