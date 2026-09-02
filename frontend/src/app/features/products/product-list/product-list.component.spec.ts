import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { ProductListComponent } from './product-list.component';

describe('ProductListComponent', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  const productsApiMock = {
    findProducts: jasmine.createSpy('findProducts'),
  };

  beforeEach(async () => {
    productsApiMock.findProducts.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        provideRouter([]),
        {
          provide: ProductsApiService,
          useValue: productsApiMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
  });

  afterEach(() => {
    productsApiMock.findProducts.calls.reset();
  });

  it('shows an empty state when the API returns no products', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="products-empty"]')?.textContent).toContain(
      'No encontramos productos con esos filtros.',
    );
  });

  it('combines debounced search with category filter', fakeAsync(() => {
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.setCategory('milk');
    component.searchControl.setValue('entera');
    tick(350);

    expect(productsApiMock.findProducts).toHaveBeenCalledWith({
      search: 'entera',
      category: 'milk',
    });
  }));
});
