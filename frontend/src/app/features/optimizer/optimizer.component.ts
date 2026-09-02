import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import {
  OPTIMIZATION_PRESETS,
  OptimizationPreset,
  OptimizationRequest,
  OptimizationResponse,
  SelectedOptimizationItem,
} from '../../core/models/optimization.model';
import {
  PRODUCT_CATEGORIES,
  getProductCategoryLabel,
} from '../../core/models/product-category.model';
import { getScoreBand } from '../../core/models/sustainability-analysis.model';
import { OptimizationApiService } from '../../core/services/optimization-api.service';

interface SelectedCategory {
  category: string;
  quantity: number;
}

type OptimizerState =
  | 'initial'
  | 'loading'
  | 'success'
  | 'insufficient-budget'
  | 'category-error'
  | 'error';

@Component({
  selector: 'app-optimizer',
  imports: [ReactiveFormsModule],
  templateUrl: './optimizer.component.html',
  styleUrl: './optimizer.component.scss',
})
export class OptimizerComponent implements OnInit {
  private readonly optimizationApi = inject(OptimizationApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currencyFormatter = new Intl.NumberFormat('es-CL', {
    currency: 'CLP',
    maximumFractionDigits: 0,
    style: 'currency',
  });

  readonly budgetControl = new FormControl<number | null>(15000, {
    nonNullable: false,
    validators: [Validators.required, Validators.min(1)],
  });
  readonly categories = PRODUCT_CATEGORIES;
  readonly presets = OPTIMIZATION_PRESETS;
  readonly selectedCategories = signal<SelectedCategory[]>([]);
  readonly selectedPreset = signal<OptimizationPreset>(OPTIMIZATION_PRESETS[1]);
  readonly result = signal<OptimizationResponse | null>(null);
  readonly state = signal<OptimizerState>('initial');
  readonly budgetTouched = signal(false);
  readonly formattedBudget = signal(this.formatCurrency(15000));

  ngOnInit(): void {
    this.budgetControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.formattedBudget.set(value && value > 0 ? this.formatCurrency(value) : '');
    });
  }

  selectPreset(preset: OptimizationPreset): void {
    this.selectedPreset.set(preset);
  }

  canSubmit(): boolean {
    return (
      this.budgetControl.valid &&
      this.selectedCategories().length > 0 &&
      this.selectedCategories().every((item) => Number.isInteger(item.quantity) && item.quantity >= 1) &&
      this.state() !== 'loading'
    );
  }

  toggleCategory(category: string): void {
    if (this.hasCategory(category)) {
      this.removeCategory(category);
      return;
    }

    this.selectedCategories.update((items) => [...items, { category, quantity: 1 }]);
  }

  hasCategory(category: string): boolean {
    return this.selectedCategories().some((item) => item.category === category);
  }

  removeCategory(category: string): void {
    this.selectedCategories.update((items) => items.filter((item) => item.category !== category));
  }

  decrementQuantity(category: string): void {
    this.setQuantity(category, this.getQuantity(category) - 1);
  }

  incrementQuantity(category: string): void {
    this.setQuantity(category, this.getQuantity(category) + 1);
  }

  setQuantity(category: string, value: number): void {
    const quantity = Math.max(1, Math.floor(Number(value) || 1));
    this.selectedCategories.update((items) =>
      items.map((item) => (item.category === category ? { ...item, quantity } : item)),
    );
  }

  getQuantity(category: string): number {
    return this.selectedCategories().find((item) => item.category === category)?.quantity ?? 1;
  }

  optimize(): void {
    this.budgetTouched.set(true);
    this.budgetControl.markAsTouched();

    if (!this.canSubmit()) {
      return;
    }

    this.state.set('loading');
    this.result.set(null);

    this.optimizationApi
      .optimize(this.buildRequest())
      .pipe(
        catchError((error: { status?: number }) => {
          this.state.set(this.toErrorState(error.status));
          return of(null);
        }),
        finalize(() => {
          if (this.state() === 'loading') {
            this.state.set('success');
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.result.set(result));
  }

  categoryLabel(category: string): string {
    return getProductCategoryLabel(category);
  }

  formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  formatScore(value: number): string {
    return value.toFixed(2);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  formatCarbon(value: number): string {
    return `${value.toFixed(2)} kg CO2e`;
  }

  scoreLabel(score: number): string {
    return getScoreBand(score).label;
  }

  weightPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  multiStoreCount(result: OptimizationResponse): number {
    return new Set(result.selectedItems.map((item) => item.product.store.id)).size;
  }

  trackSelectedCategory(_index: number, item: SelectedCategory): string {
    return item.category;
  }

  trackSelectedItem(_index: number, item: SelectedOptimizationItem): string {
    return item.product.id;
  }

  private buildRequest(): OptimizationRequest {
    return {
      budget: this.budgetControl.value ?? 0,
      weights: this.selectedPreset().weights,
      items: this.selectedCategories().map((item) => ({
        category: item.category,
        quantity: item.quantity,
      })),
    };
  }

  private toErrorState(status?: number): OptimizerState {
    if (status === 422) {
      return 'insufficient-budget';
    }

    if (status === 400) {
      return 'category-error';
    }

    return 'error';
  }
}
