import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { OptimizationResponse } from '../../core/models/optimization.model';
import { OptimizationApiService } from '../../core/services/optimization-api.service';
import { OptimizerComponent } from './optimizer.component';

describe('OptimizerComponent', () => {
  let fixture: ComponentFixture<OptimizerComponent>;
  const optimizationApiMock = {
    optimize: jasmine.createSpy('optimize'),
  };
  const result: OptimizationResponse = {
    budget: 15000,
    totalCost: 5980,
    remainingBudget: 9020,
    baselineCost: 10120,
    savings: 4140,
    savingsPercentage: 40.91,
    totalCarbonKg: 4.17,
    baselineCarbonKg: 6.2,
    carbonReductionKg: 2.03,
    carbonReductionPercentage: 32.74,
    averageSustainabilityScore: 72.4,
    averageEconomicUtility: 81.2,
    averageUtilityScore: 76.8,
    weights: {
      economic: 0.5,
      sustainability: 0.5,
    },
    selectedItems: [
      {
        category: 'milk',
        quantity: 1,
        product: {
          id: 'prod-milk-001',
          name: 'Leche entera familiar 1 L',
          brand: 'Campo Claro',
          category: 'milk',
          price: 1150,
          store: {
            id: 'store-centro',
            name: 'Mercado Verde Centro',
          },
        },
        sustainabilityScore: 66.58,
        economicUtility: 72.13,
        utilityScore: 69.36,
        subtotal: 1150,
        carbonSubtotal: 1.15,
      },
      {
        category: 'rice',
        quantity: 1,
        product: {
          id: 'prod-rice-001',
          name: 'Arroz grano largo 1 kg',
          brand: 'Despensa Sur',
          category: 'rice',
          price: 1450,
          store: {
            id: 'store-centro',
            name: 'Mercado Verde Centro',
          },
        },
        sustainabilityScore: 70,
        economicUtility: 80,
        utilityScore: 75,
        subtotal: 1450,
        carbonSubtotal: 1.02,
      },
      {
        category: 'cereal',
        quantity: 1,
        product: {
          id: 'prod-cereal-001',
          name: 'Cereal de maiz 350 g',
          brand: 'Manana Facil',
          category: 'cereal',
          price: 3380,
          store: {
            id: 'store-nunoa',
            name: 'Ahorro Market Nunoa',
          },
        },
        sustainabilityScore: 80,
        economicUtility: 91,
        utilityScore: 85.5,
        subtotal: 3380,
        carbonSubtotal: 2,
      },
    ],
  };

  beforeEach(async () => {
    optimizationApiMock.optimize.and.returnValue(of(result));

    await TestBed.configureTestingModule({
      imports: [OptimizerComponent],
      providers: [
        {
          provide: OptimizationApiService,
          useValue: optimizationApiMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OptimizerComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    optimizationApiMock.optimize.calls.reset();
  });

  it('uses balanced preset by default', () => {
    const component = fixture.componentInstance;

    expect(component.selectedPreset().id).toBe('balanced');
    expect(component.selectedPreset().weights).toEqual({ economic: 0.5, sustainability: 0.5 });
  });

  it('changes to savings preset and updates weights', () => {
    const component = fixture.componentInstance;

    component.selectPreset(component.presets[0]);

    expect(component.selectedPreset().id).toBe('savings');
    expect(component.selectedPreset().weights).toEqual({ economic: 0.8, sustainability: 0.2 });
  });

  it('changes to sustainable preset and updates weights', () => {
    const component = fixture.componentInstance;

    component.selectPreset(component.presets[2]);

    expect(component.selectedPreset().id).toBe('sustainable');
    expect(component.selectedPreset().weights).toEqual({ economic: 0.3, sustainability: 0.7 });
  });

  it('adds a category', () => {
    const component = fixture.componentInstance;

    component.toggleCategory('milk');

    expect(component.selectedCategories()).toEqual([{ category: 'milk', quantity: 1 }]);
  });

  it('does not allow duplicate categories', () => {
    const component = fixture.componentInstance;

    component.toggleCategory('milk');
    component.toggleCategory('milk');

    expect(component.selectedCategories()).toEqual([]);
  });

  it('modifies quantity', () => {
    const component = fixture.componentInstance;

    component.toggleCategory('milk');
    component.incrementQuantity('milk');
    component.setQuantity('milk', 3);

    expect(component.getQuantity('milk')).toBe(3);
  });

  it('removes a category', () => {
    const component = fixture.componentInstance;

    component.toggleCategory('milk');
    component.removeCategory('milk');

    expect(component.selectedCategories()).toEqual([]);
  });

  it('blocks submit when budget is invalid', () => {
    const component = fixture.componentInstance;

    component.toggleCategory('milk');
    component.budgetControl.setValue(0);
    component.optimize();

    expect(optimizationApiMock.optimize).not.toHaveBeenCalled();
  });

  it('blocks submit when no categories are selected', () => {
    const component = fixture.componentInstance;

    component.budgetControl.setValue(15000);
    component.optimize();

    expect(optimizationApiMock.optimize).not.toHaveBeenCalled();
  });

  it('builds the optimization request correctly', () => {
    const component = fixture.componentInstance;

    component.budgetControl.setValue(15000);
    component.toggleCategory('milk');
    component.toggleCategory('rice');
    component.setQuantity('milk', 2);
    component.optimize();

    expect(optimizationApiMock.optimize).toHaveBeenCalledWith({
      budget: 15000,
      weights: {
        economic: 0.5,
        sustainability: 0.5,
      },
      items: [
        { category: 'milk', quantity: 2 },
        { category: 'rice', quantity: 1 },
      ],
    });
  });

  it('shows loading state', () => {
    const pending = new Subject<OptimizationResponse>();
    optimizationApiMock.optimize.and.returnValue(pending.asObservable());
    const component = fixture.componentInstance;

    component.toggleCategory('milk');
    component.optimize();
    fixture.detectChanges();

    expect(component.state()).toBe('loading');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Buscando la mejor combinacion...',
    );
  });

  it('renders success result and main metrics', () => {
    const component = fixture.componentInstance;

    component.toggleCategory('milk');
    component.optimize();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(component.state()).toBe('success');
    expect(text).toContain('Tu compra optimizada');
    expect(text).toContain('Total compra');
    expect(text).toContain('$5.980');
    expect(text).toContain('Ahorro estimado');
    expect(text).toContain('Sostenibilidad');
    expect(text).toContain('CO2 estimado');
  });

  it('shows insufficient budget error', () => {
    optimizationApiMock.optimize.and.returnValue(throwError(() => ({ status: 422 })));
    const component = fixture.componentInstance;

    component.toggleCategory('milk');
    component.optimize();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Tu presupuesto no alcanza para incluir al menos un producto de cada categoria seleccionada.',
    );
  });

  it('shows a generic error', () => {
    optimizationApiMock.optimize.and.returnValue(throwError(() => ({ status: 500 })));
    const component = fixture.componentInstance;

    component.toggleCategory('milk');
    component.optimize();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No pudimos optimizar tu compra',
    );
  });

  it('renders selected products', () => {
    const component = fixture.componentInstance;

    component.toggleCategory('milk');
    component.optimize();
    fixture.detectChanges();

    const selectedProducts = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '[data-testid="selected-product"]',
    );

    expect(selectedProducts.length).toBe(3);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Leche entera familiar 1 L',
    );
  });

  it('shows multi-store notice', () => {
    const component = fixture.componentInstance;

    component.toggleCategory('milk');
    component.optimize();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Esta combinacion incluye productos de 2 tiendas.',
    );
  });
});
