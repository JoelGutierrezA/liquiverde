import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, finalize, of } from 'rxjs';
import { PRODUCT_CATEGORIES } from '../../../core/models/product-category.model';
import { Product } from '../../../core/models/product.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { ProductCardComponent } from '../components/product-card/product-card.component';

@Component({
  selector: 'app-product-list',
  imports: [ReactiveFormsModule, ProductCardComponent],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})
export class ProductListComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = PRODUCT_CATEGORIES;
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly products = signal<Product[]>([]);
  readonly selectedCategory = signal('');
  readonly loading = signal(false);
  readonly error = signal(false);

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadProducts());

    this.loadProducts();
  }

  setCategory(category: string): void {
    this.selectedCategory.set(category);
    this.loadProducts();
  }

  retry(): void {
    this.loadProducts();
  }

  clearFilters(): void {
    this.selectedCategory.set('');
    this.searchControl.setValue('', { emitEvent: false });
    this.loadProducts('', '');
  }

  private loadProducts(search = this.searchControl.value, category = this.selectedCategory()): void {
    this.loading.set(true);
    this.error.set(false);

    this.productsApi
      .findProducts({
        search,
        category,
      })
      .pipe(
        catchError(() => {
          this.error.set(true);
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((products) => this.products.set(products));
  }
}
