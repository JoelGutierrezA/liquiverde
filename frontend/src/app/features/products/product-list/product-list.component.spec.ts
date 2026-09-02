import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Product } from '../../../core/models/product.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { ProductListComponent } from './product-list.component';

describe('ProductListComponent', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  const productsApiMock = {
    findProducts: jasmine.createSpy('findProducts'),
    findProductByBarcode: jasmine.createSpy('findProductByBarcode'),
  };
  const localProduct: Product = {
    id: 'prod-milk-001',
    barcode: '7800000000001',
    name: 'Leche entera familiar 1 L',
    brand: 'Campo Claro',
    category: 'milk',
    description: 'Leche entera de consumo diario.',
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
  const externalProduct: Product = {
    barcode: '3017620422003',
    name: 'Nutella',
    brand: 'Ferrero',
    category: 'unknown',
    description: null,
    imageUrl: null,
    price: null,
    carbonKg: null,
    localProduct: null,
    recyclablePackaging: null,
    fairTrade: null,
    socialScore: null,
    source: 'open_food_facts',
    store: null,
  };

  beforeEach(async () => {
    productsApiMock.findProducts.and.returnValue(of([]));
    productsApiMock.findProductByBarcode.and.returnValue(of(localProduct));

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
    productsApiMock.findProductByBarcode.calls.reset();
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

  it('rejects invalid barcode before calling the API', () => {
    const component = fixture.componentInstance;

    component.barcodeControl.setValue('123');
    component.searchBarcode();

    expect(productsApiMock.findProductByBarcode).not.toHaveBeenCalled();
    expect(component.barcodeState()).toBe('invalid');
  });

  it('navigates to local product detail when barcode resolves locally', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    const component = fixture.componentInstance;

    component.barcodeControl.setValue('7800000000001');
    component.searchBarcode();

    expect(productsApiMock.findProductByBarcode).toHaveBeenCalledWith('7800000000001');
    expect(router.navigate).toHaveBeenCalledWith(['/products', 'prod-milk-001']);
  });

  it('shows an external product when barcode resolves through Open Food Facts', () => {
    productsApiMock.findProductByBarcode.and.returnValue(of(externalProduct));
    const component = fixture.componentInstance;

    component.barcodeControl.setValue('3017620422003');
    component.searchBarcode();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(component.barcodeState()).toBe('external');
    expect(compiled.querySelector('[data-testid="barcode-external-product"]')?.textContent).toContain(
      'Open Food Facts',
    );
    expect(compiled.querySelector('[data-testid="barcode-external-product"]')?.textContent).toContain(
      'Indice de sostenibilidad',
    );
  });

  it('shows not found message when barcode does not exist', () => {
    productsApiMock.findProductByBarcode.and.returnValue(throwError(() => ({ status: 404 })));
    const component = fixture.componentInstance;

    component.barcodeControl.setValue('9876543210987');
    component.searchBarcode();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="barcode-not-found"]')?.textContent).toContain(
      'No encontramos un producto con ese codigo de barras.',
    );
  });

  it('shows a safe external error message when Open Food Facts is unavailable', () => {
    productsApiMock.findProductByBarcode.and.returnValue(throwError(() => ({ status: 502 })));
    const component = fixture.componentInstance;

    component.barcodeControl.setValue('3017620422003');
    component.searchBarcode();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="barcode-external-error"]')?.textContent).toContain(
      'El servicio externo de productos no esta disponible en este momento.',
    );
  });
});
