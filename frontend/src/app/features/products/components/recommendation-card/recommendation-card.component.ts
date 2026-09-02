import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductRecommendation } from '../../../../core/models/recommendation.model';

@Component({
  selector: 'app-recommendation-card',
  imports: [RouterLink],
  templateUrl: './recommendation-card.component.html',
  styleUrl: './recommendation-card.component.scss',
})
export class RecommendationCardComponent {
  private readonly currencyFormatter = new Intl.NumberFormat('es-CL', {
    currency: 'CLP',
    maximumFractionDigits: 0,
    style: 'currency',
  });
  readonly recommendation = input.required<ProductRecommendation>();

  formatPrice(price: number): string {
    return this.currencyFormatter.format(price);
  }

  priceImpactLabel(savings: number): string {
    if (savings > 0) {
      return 'Ahorro';
    }

    if (savings < 0) {
      return 'Cuesta mas';
    }

    return 'Precio similar';
  }

  formatPriceImpact(savings: number): string {
    if (savings > 0) {
      return `Ahorras ${this.currencyFormatter.format(savings)}`;
    }

    if (savings < 0) {
      return `+${this.currencyFormatter.format(Math.abs(savings))}`;
    }

    return 'Sin diferencia de precio';
  }

  formatScore(score: number): string {
    return score.toFixed(2);
  }

  formatSustainabilityImprovement(value: number): string {
    if (value > 0) {
      return `+${value.toFixed(2)} puntos de sostenibilidad`;
    }

    if (value < 0) {
      return `${Math.abs(value).toFixed(2)} puntos menos de sostenibilidad`;
    }

    return 'Sostenibilidad similar';
  }

  formatCarbonDifference(value: number): string {
    if (value < 0) {
      return `${Math.abs(value).toFixed(2)} kg CO2e menos`;
    }

    if (value > 0) {
      return `${value.toFixed(2)} kg CO2e mas`;
    }

    return 'Sin diferencia de carbono';
  }
}
