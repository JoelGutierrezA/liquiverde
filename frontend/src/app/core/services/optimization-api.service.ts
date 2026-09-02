import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { OptimizationRequest, OptimizationResponse } from '../models/optimization.model';

@Injectable({
  providedIn: 'root',
})
export class OptimizationApiService {
  private readonly http = inject(HttpClient);
  private readonly optimizationUrl = `${API_BASE_URL}/optimization`;

  optimize(request: OptimizationRequest): Observable<OptimizationResponse> {
    return this.http.post<OptimizationResponse>(this.optimizationUrl, request);
  }
}
