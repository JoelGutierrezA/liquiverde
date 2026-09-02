import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductRecommendation } from '../../../../core/models/recommendation.model';
import { RecommendationCardComponent } from './recommendation-card.component';

describe('RecommendationCardComponent', () => {
  let fixture: ComponentFixture<RecommendationCardComponent>;
  const recommendation: ProductRecommendation = {
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
    sustainabilityImprovement: 8.56,
    carbonDifferenceKg: -0.3,
    economicImprovementScore: 100,
    sustainabilityImprovementScore: 95,
    recommendationScore: 97,
    reason: 'Ahorras $170 y mejoras el indice sostenible en 8.56 puntos.',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendationCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RecommendationCardComponent);
  });

  it('renders a recommended product with positive savings', () => {
    fixture.componentRef.setInput('recommendation', recommendation);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Leche descremada origen local 1 L');
    expect(text).toContain('Ahorras $170');
  });

  it('does not label a negative saving as savings', () => {
    fixture.componentRef.setInput('recommendation', {
      ...recommendation,
      savings: -120,
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Cuesta mas');
    expect(text).toContain('+$120');
  });

  it('shows sustainability and carbon improvements', () => {
    fixture.componentRef.setInput('recommendation', recommendation);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('+8.56 puntos de sostenibilidad');
    expect(text).toContain('0.30 kg CO2e menos');
  });

  it('links to the recommended product detail', () => {
    fixture.componentRef.setInput('recommendation', recommendation);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '[data-testid="recommendation-link"]',
    );

    expect(link?.getAttribute('href')).toBe('/products/prod-milk-003');
  });
});
