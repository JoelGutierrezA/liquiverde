import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { getProductCategoryLabel } from '../../../core/models/product-category.model';
import { Product } from '../../../core/models/product.model';
import { ProductsApiService } from '../../../core/services/products-api.service';

type DetailState = 'loading' | 'ready' | 'not-found' | 'error';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  private readonly currencyFormatter = new Intl.NumberFormat('es-CL', {
    currency: 'CLP',
    maximumFractionDigits: 0,
    style: 'currency',
  });
  private readonly route = inject(ActivatedRoute);
  private readonly productsApi = inject(ProductsApiService);

  readonly product = signal<Product | null>(null);
  readonly state = signal<DetailState>('loading');

  ngOnInit(): void {
    this.loadProduct();
  }

  retry(): void {
    this.loadProduct();
  }

  categoryLabel(category: string): string {
    return getProductCategoryLabel(category);
  }

  formatPrice(price: number | null): string {
    return price === null ? 'Precio no informado' : this.currencyFormatter.format(price);
  }

  private loadProduct(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.state.set('not-found');
      return;
    }

    this.state.set('loading');
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
}
