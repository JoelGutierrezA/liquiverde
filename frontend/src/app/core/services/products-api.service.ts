import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Product } from '../models/product.model';
import { ProductAlternativesResponse } from '../models/recommendation.model';
import { ProductAnalysisResponse } from '../models/sustainability-analysis.model';

export interface FindProductsParams {
  search?: string;
  category?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly productsUrl = `${API_BASE_URL}/products`;

  findProducts(params: FindProductsParams = {}): Observable<Product[]> {
    return this.http.get<Product[]>(this.productsUrl, {
      params: this.buildParams(params),
    });
  }

  findProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.productsUrl}/${encodeURIComponent(id)}`);
  }

  getProductAnalysis(id: string): Observable<ProductAnalysisResponse> {
    return this.http.get<ProductAnalysisResponse>(
      `${this.productsUrl}/${encodeURIComponent(id)}/analysis`,
    );
  }

  getProductAlternatives(id: string): Observable<ProductAlternativesResponse> {
    return this.http.get<ProductAlternativesResponse>(
      `${this.productsUrl}/${encodeURIComponent(id)}/alternatives`,
    );
  }

  findProductByBarcode(barcode: string): Observable<Product> {
    return this.http.get<Product>(`${this.productsUrl}/barcode/${encodeURIComponent(barcode)}`);
  }

  private buildParams(params: FindProductsParams): HttpParams {
    let httpParams = new HttpParams();
    const search = params.search?.trim();
    const category = params.category?.trim();

    if (search) {
      httpParams = httpParams.set('search', search);
    }

    if (category) {
      httpParams = httpParams.set('category', category);
    }

    return httpParams;
  }
}
