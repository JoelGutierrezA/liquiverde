import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Product } from '../../../../core/models/product.model';
import { ProductCardComponent } from './product-card.component';

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
  store: {
    id: 'store-centro',
    name: 'Mercado Verde Centro',
  },
};

describe('ProductCardComponent', () => {
  let fixture: ComponentFixture<ProductCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
  });

  it('renders product information', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Leche entera familiar 1 L');
    expect(compiled.textContent).toContain('Campo Claro');
    expect(compiled.textContent).toContain('$1.150');
    expect(compiled.textContent).toContain('Mercado Verde Centro');
    expect(compiled.textContent).toContain('Producto local');
    expect(compiled.textContent).toContain('Envase reciclable');
  });

  it('links to product detail', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.detail-link');

    expect(link?.getAttribute('href')).toBe('/products/prod-milk-001');
  });
});
