import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, finalize, map, of } from 'rxjs';
import { getProductCategoryLabel } from '../../../core/models/product-category.model';
import { Product } from '../../../core/models/product.model';
import { ProductAlternativesResponse } from '../../../core/models/recommendation.model';
import {
  ProductAnalysisResponse,
  getScoreBand,
} from '../../../core/models/sustainability-analysis.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { RecommendationCardComponent } from '../components/recommendation-card/recommendation-card.component';

type DetailState = 'loading' | 'ready' | 'not-found' | 'error';
type AnalysisState = 'idle' | 'loading' | 'ready' | 'error';
type AlternativesState = 'idle' | 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, RecommendationCardComponent],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  private readonly currencyFormatter = new Intl.NumberFormat('es-CL', {
    currency: 'CLP',
    maximumFractionDigits: 0,
    style: 'currency',
  });
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly productsApi = inject(ProductsApiService);

  readonly activeProductId = signal<string | null>(null);
  readonly product = signal<Product | null>(null);
  readonly analysis = signal<ProductAnalysisResponse | null>(null);
  readonly alternatives = signal<ProductAlternativesResponse | null>(null);
  readonly state = signal<DetailState>('loading');
  readonly analysisState = signal<AnalysisState>('idle');
  readonly alternativesState = signal<AlternativesState>('idle');

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => this.loadProduct(id));
  }

  retry(): void {
    this.loadProduct(this.activeProductId());
  }

  retryAnalysis(): void {
    const id = this.activeProductId();

    if (id) {
      this.loadAnalysis(id);
    }
  }

  retryAlternatives(): void {
    const id = this.activeProductId();

    if (id) {
      this.loadAlternatives(id);
    }
  }

  categoryLabel(category: string): string {
    return getProductCategoryLabel(category);
  }

  scoreBand(score: number) {
    return getScoreBand(score);
  }

  scoreLabel(score: number): string {
    return getScoreBand(score).label;
  }

  formatScore(score: number): string {
    return score.toFixed(2);
  }

  formatPrice(price: number | null): string {
    return price === null ? 'Precio no informado' : this.currencyFormatter.format(price);
  }

  formatCarbon(carbonKg: number | null): string {
    return carbonKg === null ? 'No disponible' : `${carbonKg} kg CO2e`;
  }

  private loadProduct(id: string | null): void {
    this.activeProductId.set(id);
    if (!id) {
      this.state.set('not-found');
      this.analysisState.set('idle');
      this.alternativesState.set('idle');
      return;
    }

    this.state.set('loading');
    this.product.set(null);
    this.analysis.set(null);
    this.alternatives.set(null);
    this.loadAnalysis(id);
    this.loadAlternatives(id);

    this.productsApi
      .findProductById(id)
      .pipe(
        catchError((error: { status?: number }) => {
          this.product.set(null);
          this.state.set(error.status === 404 ? 'not-found' : 'error');
          return of(null);
        }),
        finalize(() => {
          if (this.product()) {
            this.state.set('ready');
          }
        }),
      )
      .subscribe((product) => this.product.set(product));
  }

  private loadAnalysis(id: string): void {
    this.analysisState.set('loading');
    this.analysis.set(null);

    this.productsApi
      .getProductAnalysis(id)
      .pipe(
        catchError(() => {
          this.analysisState.set('error');
          return of(null);
        }),
        finalize(() => {
          if (this.analysis()) {
            this.analysisState.set('ready');
          }
        }),
      )
      .subscribe((analysis) => this.analysis.set(analysis));
  }

  private loadAlternatives(id: string): void {
    this.alternativesState.set('loading');
    this.alternatives.set(null);

    this.productsApi
      .getProductAlternatives(id)
      .pipe(
        catchError(() => {
          this.alternativesState.set('error');
          return of(null);
        }),
        finalize(() => {
          if (this.alternatives()) {
            this.alternativesState.set('ready');
          }
        }),
      )
      .subscribe((alternatives) => this.alternatives.set(alternatives));
  }
}
