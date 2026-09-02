import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api.config';
import { OptimizationApiService } from './optimization-api.service';

describe('OptimizationApiService', () => {
  let service: OptimizationApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OptimizationApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(OptimizationApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('posts optimization request to the API', () => {
    const body = {
      budget: 15000,
      weights: {
        economic: 0.5,
        sustainability: 0.5,
      },
      items: [
        { category: 'milk', quantity: 1 },
        { category: 'rice', quantity: 1 },
      ],
    };

    service.optimize(body).subscribe();

    const request = httpTesting.expectOne(`${API_BASE_URL}/optimization`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({});
  });
});
