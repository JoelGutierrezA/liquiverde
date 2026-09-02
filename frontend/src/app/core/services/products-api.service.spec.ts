import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api.config';
import { ProductsApiService } from './products-api.service';

describe('ProductsApiService', () => {
  let service: ProductsApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProductsApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProductsApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('requests products without query params', () => {
    service.findProducts().subscribe((products) => {
      expect(products).toEqual([]);
    });

    const request = httpTesting.expectOne(`${API_BASE_URL}/products`);

    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush([]);
  });

  it('builds search and category query params', () => {
    service.findProducts({ search: ' leche ', category: ' milk ' }).subscribe();

    const request = httpTesting.expectOne(
      (candidate) =>
        candidate.url === `${API_BASE_URL}/products` &&
        candidate.params.get('search') === 'leche' &&
        candidate.params.get('category') === 'milk',
    );

    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('requests product detail by id', () => {
    service.findProductById('prod-milk-001').subscribe();

    const request = httpTesting.expectOne(`${API_BASE_URL}/products/prod-milk-001`);

    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
