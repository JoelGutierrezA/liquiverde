import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getProductCategoryLabel } from '../../../../core/models/product-category.model';
import { Product } from '../../../../core/models/product.model';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  private readonly currencyFormatter = new Intl.NumberFormat('es-CL', {
    currency: 'CLP',
    maximumFractionDigits: 0,
    style: 'currency',
  });
  readonly product = input.required<Product>();

  categoryLabel(category: string): string {
    return getProductCategoryLabel(category);
  }

  formatPrice(price: number | null): string {
    return price === null ? 'Precio no informado' : this.currencyFormatter.format(price);
  }
}
