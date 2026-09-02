import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, finalize, of } from 'rxjs';
import { PRODUCT_CATEGORIES } from '../../../core/models/product-category.model';
import { Product } from '../../../core/models/product.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { ProductCardComponent } from '../components/product-card/product-card.component';

type BarcodeState = 'idle' | 'invalid' | 'loading' | 'external' | 'not-found' | 'external-error' | 'error';

@Component({
  selector: 'app-product-list',
  imports: [ReactiveFormsModule, RouterLink, ProductCardComponent],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})
export class ProductListComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly categories = PRODUCT_CATEGORIES;
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly barcodeControl = new FormControl('', { nonNullable: true });
  readonly products = signal<Product[]>([]);
  readonly barcodeProduct = signal<Product | null>(null);
  readonly selectedCategory = signal('');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly barcodeState = signal<BarcodeState>('idle');

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

  searchBarcode(): void {
    const barcode = this.barcodeControl.value.trim();
    this.barcodeProduct.set(null);

    if (!/^\d{8,14}$/.test(barcode)) {
      this.barcodeState.set('invalid');
      return;
    }

    this.barcodeState.set('loading');

    this.productsApi
      .findProductByBarcode(barcode)
      .pipe(
        catchError((error: { status?: number }) => {
          this.barcodeState.set(this.toBarcodeErrorState(error.status));
          return of(null);
        }),
        finalize(() => {
          if (this.barcodeState() === 'loading') {
            this.barcodeState.set('idle');
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((product) => {
        if (!product) {
          return;
        }

        if (this.isExternalProduct(product)) {
          this.barcodeProduct.set(product);
          this.barcodeState.set('external');
          return;
        }

        this.barcodeState.set('idle');
        void this.router.navigate(['/products', product.id]);
      });
  }

  clearBarcodeSearch(): void {
    this.barcodeControl.setValue('');
    this.barcodeProduct.set(null);
    this.barcodeState.set('idle');
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

  private isExternalProduct(product: Product): boolean {
    return product.source === 'open_food_facts' || !product.id;
  }

  private toBarcodeErrorState(status?: number): BarcodeState {
    if (status === 404) {
      return 'not-found';
    }

    if (status === 502 || status === 504) {
      return 'external-error';
    }

    return 'error';
  }
}
