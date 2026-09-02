import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Product } from '../../../core/models/product.model';
import { ProductAlternativesResponse } from '../../../core/models/recommendation.model';
import { ProductAnalysisResponse } from '../../../core/models/sustainability-analysis.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { ProductDetailComponent } from './product-detail.component';

describe('ProductDetailComponent', () => {
  let fixture: ComponentFixture<ProductDetailComponent>;
  const productsApiMock = {
    findProductById: jasmine.createSpy('findProductById'),
    getProductAnalysis: jasmine.createSpy('getProductAnalysis'),
    getProductAlternatives: jasmine.createSpy('getProductAlternatives'),
  };
  const product: Product = {
    id: 'prod-milk-001',
    barcode: '7800000000001',
    name: 'Leche entera familiar 1 L',
    brand: 'Campo Claro',
    category: 'milk',
    description: 'Leche entera de consumo diario en formato familiar.',
    imageUrl: null,
    price: 1150,
    carbonKg: 1.15,
    localProduct: true,
    recyclablePackaging: true,
    fairTrade: false,
    socialScore: 72,
    source: 'dataset',
    store: { id: 'store-centro', name: 'Mercado Verde Centro' },
  };
  const analysis: ProductAnalysisResponse = {
    product: {
      id: 'prod-milk-001',
      name: 'Leche entera familiar 1 L',
      brand: 'Campo Claro',
      category: 'milk',
      price: 1150,
    },
    analysis: {
      economicScore: 100,
      environmentalScore: 68,
      socialScore: 57.6,
      sustainabilityScore: 78.72,
      breakdown: {
        carbonScore: 80,
        localProductScore: 100,
        recyclablePackagingScore: 100,
        fairTradeScore: 0,
      },
    },
    context: {
      category: 'milk',
      comparedProducts: 5,
    },
  };
  const alternatives: ProductAlternativesResponse = {
    sourceProduct: {
      id: 'prod-milk-001',
      name: 'Leche entera familiar 1 L',
      brand: 'Campo Claro',
      category: 'milk',
      price: 1150,
      sustainabilityScore: 78.72,
      carbonKg: 1.15,
      store: { id: 'store-centro', name: 'Mercado Verde Centro' },
    },
    recommendations: [
      {
        product: {
          id: 'prod-milk-003',
          name: 'Leche descremada origen local 1 L',
          brand: 'Lecheria Sur',
          category: 'milk',
          price: 980,
          sustainabilityScore: 84.5,
          carbonKg: 0.85,
          store: { id: 'store-barrio', name: 'EcoMarket Barrio' },
        },
        savings: 170,
        savingsPercentage: 14.78,
        sustainabilityImprovement: 5.78,
        carbonDifferenceKg: -0.3,
        economicImprovementScore: 100,
        sustainabilityImprovementScore: 92,
        recommendationScore: 95.2,
        reason: 'Ahorras $170 y mejoras el indice sostenible en 5.78 puntos.',
      },
    ],
  };

  beforeEach(async () => {
    productsApiMock.findProductById.and.returnValue(of(product));
    productsApiMock.getProductAnalysis.and.returnValue(of(analysis));
    productsApiMock.getProductAlternatives.and.returnValue(of(alternatives));

    await TestBed.configureTestingModule({
      imports: [ProductDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'prod-milk-001' : null),
              },
            },
            paramMap: of(convertToParamMap({ id: 'prod-milk-001' })),
          },
        },
        {
          provide: ProductsApiService,
          useValue: productsApiMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetailComponent);
  });

  afterEach(() => {
    productsApiMock.findProductById.calls.reset();
    productsApiMock.getProductAnalysis.calls.reset();
    productsApiMock.getProductAlternatives.calls.reset();
  });

  it('shows the sustainability score', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="analysis-panel"]')?.textContent).toContain(
      'Indice de sostenibilidad',
    );
    expect(compiled.querySelector('[data-testid="analysis-panel"]')?.textContent).toContain(
      '78.72 / 100',
    );
  });

  it('shows economic, environmental and social scores', () => {
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Economico');
    expect(text).toContain('100.00 / 100');
    expect(text).toContain('Ambiental');
    expect(text).toContain('68.00 / 100');
    expect(text).toContain('Social');
    expect(text).toContain('57.60 / 100');
  });

  it('shows the comparable product context', () => {
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Comparado con 5 productos de la categoria Leche.');
  });

  it('keeps product visible when analysis fails', () => {
    productsApiMock.getProductAnalysis.and.returnValue(throwError(() => ({ status: 500 })));

    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Leche entera familiar 1 L');
    expect(text).toContain('No pudimos calcular el analisis de sostenibilidad.');
  });

  it('shows product recommendations', () => {
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Alternativas recomendadas');
    expect(text).toContain('Leche descremada origen local 1 L');
    expect(text).toContain('Ahorras $170');
    expect(text).toContain('+5.78 puntos de sostenibilidad');
  });

  it('shows an empty state when there are no recommendations', () => {
    productsApiMock.getProductAlternatives.and.returnValue(
      of({
        ...alternatives,
        recommendations: [],
      }),
    );

    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('No encontramos una alternativa claramente mejor para este producto.');
  });

  it('keeps product visible when recommendations fail', () => {
    productsApiMock.getProductAlternatives.and.returnValue(throwError(() => ({ status: 500 })));

    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Leche entera familiar 1 L');
    expect(text).toContain('No pudimos cargar alternativas en este momento.');
  });

  it('links the recommendation to the alternative product detail', () => {
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '[data-testid="recommendation-link"]',
    );

    expect(link?.getAttribute('href')).toBe('/products/prod-milk-003');
  });
});
