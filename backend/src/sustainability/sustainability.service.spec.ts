import { SustainabilityService } from './sustainability.service';
import { SustainabilityProductInput } from './types/sustainability-analysis.type';
import { SustainabilityInputError } from './types/sustainability-error.type';

const makeProduct = (overrides: Partial<SustainabilityProductInput> = {}): SustainabilityProductInput => ({
  category: 'milk',
  price: 1000,
  carbonKg: 1,
  localProduct: false,
  recyclablePackaging: false,
  fairTrade: false,
  socialScore: 50,
  ...overrides,
});

describe('SustainabilityService', () => {
  let service: SustainabilityService;

  beforeEach(() => {
    service = new SustainabilityService();
  });

  it('gives a better Economic Score to the cheapest product than to the most expensive product', () => {
    const cheapProduct = makeProduct({ price: 1000 });
    const expensiveProduct = makeProduct({ price: 2000 });
    const categoryProducts = [cheapProduct, makeProduct({ price: 1500 }), expensiveProduct];

    const cheapAnalysis = service.analyze(cheapProduct, categoryProducts);
    const expensiveAnalysis = service.analyze(expensiveProduct, categoryProducts);

    expect(cheapAnalysis.economicScore).toBeGreaterThan(expensiveAnalysis.economicScore);
    expect(cheapAnalysis.economicScore).toBe(100);
    expect(expensiveAnalysis.economicScore).toBe(0);
  });

  it('gives a better Carbon Score to the lowest-carbon product', () => {
    const lowCarbonProduct = makeProduct({ carbonKg: 0.5 });
    const highCarbonProduct = makeProduct({ carbonKg: 2 });
    const categoryProducts = [lowCarbonProduct, makeProduct({ carbonKg: 1.2 }), highCarbonProduct];

    const lowCarbonAnalysis = service.analyze(lowCarbonProduct, categoryProducts);
    const highCarbonAnalysis = service.analyze(highCarbonProduct, categoryProducts);

    expect(lowCarbonAnalysis.breakdown.carbonScore).toBeGreaterThan(highCarbonAnalysis.breakdown.carbonScore);
    expect(lowCarbonAnalysis.breakdown.carbonScore).toBe(100);
    expect(highCarbonAnalysis.breakdown.carbonScore).toBe(0);
  });

  it('improves Environmental Score when the product is local', () => {
    const importedProduct = makeProduct({ localProduct: false });
    const localProduct = makeProduct({ localProduct: true });
    const categoryProducts = [importedProduct, localProduct];

    expect(service.analyze(localProduct, categoryProducts).environmentalScore).toBeGreaterThan(
      service.analyze(importedProduct, categoryProducts).environmentalScore,
    );
  });

  it('improves Environmental Score when packaging is recyclable', () => {
    const nonRecyclableProduct = makeProduct({ recyclablePackaging: false });
    const recyclableProduct = makeProduct({ recyclablePackaging: true });
    const categoryProducts = [nonRecyclableProduct, recyclableProduct];

    expect(service.analyze(recyclableProduct, categoryProducts).environmentalScore).toBeGreaterThan(
      service.analyze(nonRecyclableProduct, categoryProducts).environmentalScore,
    );
  });

  it('improves Social Score when the product is Fair Trade', () => {
    const standardProduct = makeProduct({ fairTrade: false, socialScore: 60 });
    const fairTradeProduct = makeProduct({ fairTrade: true, socialScore: 60 });
    const categoryProducts = [standardProduct, fairTradeProduct];

    expect(service.analyze(fairTradeProduct, categoryProducts).socialScore).toBeGreaterThan(
      service.analyze(standardProduct, categoryProducts).socialScore,
    );
    expect(service.analyze(fairTradeProduct, categoryProducts).breakdown.fairTradeScore).toBe(100);
  });

  it('combines Economic, Environmental and Social Scores with configured weights', () => {
    const product = makeProduct({
      price: 100,
      carbonKg: 1,
      localProduct: false,
      recyclablePackaging: false,
      fairTrade: false,
      socialScore: 50,
    });
    const categoryProducts = [product, makeProduct({ price: 300, carbonKg: 3 })];

    expect(service.analyze(product, categoryProducts)).toEqual({
      economicScore: 100,
      environmentalScore: 60,
      socialScore: 40,
      sustainabilityScore: 72,
      breakdown: {
        carbonScore: 100,
        localProductScore: 0,
        recyclablePackagingScore: 0,
        fairTradeScore: 0,
      },
    });
  });

  it('scores a product with multiple sustainable attributes better than a less sustainable comparable product', () => {
    const sustainableProduct = makeProduct({
      price: 1000,
      carbonKg: 0.5,
      localProduct: true,
      recyclablePackaging: true,
      fairTrade: true,
      socialScore: 85,
    });
    const lessSustainableProduct = makeProduct({
      price: 2000,
      carbonKg: 2,
      localProduct: false,
      recyclablePackaging: false,
      fairTrade: false,
      socialScore: 45,
    });
    const categoryProducts = [sustainableProduct, lessSustainableProduct];

    expect(service.analyze(sustainableProduct, categoryProducts).sustainabilityScore).toBeGreaterThan(
      service.analyze(lessSustainableProduct, categoryProducts).sustainabilityScore,
    );
  });

  it('returns a neutral perfect Economic Score when all category prices are equal', () => {
    const product = makeProduct({ price: 1500 });
    const categoryProducts = [product, makeProduct({ price: 1500 })];

    expect(service.analyze(product, categoryProducts).economicScore).toBe(100);
  });

  it('returns a neutral perfect Carbon Score when all category carbon values are equal', () => {
    const product = makeProduct({ carbonKg: 1.4 });
    const categoryProducts = [product, makeProduct({ carbonKg: 1.4 })];

    expect(service.analyze(product, categoryProducts).breakdown.carbonScore).toBe(100);
  });

  it('clamps scores between 0 and 100', () => {
    const product = makeProduct({
      price: 500,
      carbonKg: 0.1,
      localProduct: true,
      recyclablePackaging: true,
      fairTrade: true,
      socialScore: 100,
    });
    const categoryProducts = [makeProduct({ price: 1000, carbonKg: 1 }), makeProduct({ price: 2000, carbonKg: 2 })];
    const analysis = service.analyze(product, categoryProducts);

    expect(Object.values(analysis).filter((value) => typeof value === 'number')).toEqual(
      expect.arrayContaining([expect.any(Number)]),
    );
    expect(analysis.economicScore).toBeLessThanOrEqual(100);
    expect(analysis.environmentalScore).toBeLessThanOrEqual(100);
    expect(analysis.socialScore).toBeLessThanOrEqual(100);
    expect(analysis.sustainabilityScore).toBeLessThanOrEqual(100);
    expect(analysis.breakdown.carbonScore).toBeLessThanOrEqual(100);
  });

  it('throws when persisted socialScore is outside 0-100', () => {
    const product = makeProduct({ socialScore: 101 });

    expect(() => service.analyze(product, [product])).toThrow(SustainabilityInputError);
  });

  it('throws when price is negative', () => {
    const product = makeProduct({ price: -1 });

    expect(() => service.analyze(product, [product])).toThrow(SustainabilityInputError);
  });

  it('throws when carbonKg is negative', () => {
    const product = makeProduct({ carbonKg: -0.1 });

    expect(() => service.analyze(product, [product])).toThrow(SustainabilityInputError);
  });

  it('throws when comparison products are empty', () => {
    expect(() => service.analyze(makeProduct(), [])).toThrow(SustainabilityInputError);
  });

  it('throws when category is empty', () => {
    const product = makeProduct({ category: '   ' });

    expect(() => service.analyze(product, [product])).toThrow(SustainabilityInputError);
  });

  it('throws when comparison products do not match the product category', () => {
    const product = makeProduct({ category: 'milk' });
    const riceProduct = makeProduct({ category: 'rice' });

    expect(() => service.analyze(product, [riceProduct])).toThrow(SustainabilityInputError);
  });

  it('analyzes a product with the current dataset shape', () => {
    const datasetProduct = {
      id: 'prod-milk-003',
      barcode: '7800000000003',
      name: 'Leche semidescremada local 1 L',
      brand: 'Valle Sur',
      category: 'milk',
      description: 'Leche semidescremada de origen local.',
      imageUrl: null,
      price: 1320,
      carbonKg: 0.88,
      localProduct: true,
      recyclablePackaging: true,
      fairTrade: true,
      socialScore: 84,
      source: 'dataset',
      storeId: 'store-providencia',
    };
    const categoryProducts = [
      datasetProduct,
      makeProduct({ category: 'milk', price: 980, carbonKg: 1.35, socialScore: 48 }),
      makeProduct({ category: 'milk', price: 1590, carbonKg: 1.05, socialScore: 68 }),
    ];

    expect(service.analyze(datasetProduct, categoryProducts)).toEqual({
      economicScore: 44.26,
      environmentalScore: 100,
      socialScore: 87.2,
      sustainabilityScore: 75.14,
      breakdown: {
        carbonScore: 100,
        localProductScore: 100,
        recyclablePackagingScore: 100,
        fairTradeScore: 100,
      },
    });
  });
});
