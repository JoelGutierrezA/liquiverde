import { BadGatewayException, GatewayTimeoutException, Injectable, Logger } from '@nestjs/common';
import {
  NormalizedOpenFoodFactsProduct,
  OpenFoodFactsProduct,
  OpenFoodFactsProductResponse,
} from './types/open-food-facts-product.type';

const OPEN_FOOD_FACTS_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OPEN_FOOD_FACTS_FIELDS = ['code', 'product_name', 'brands', 'image_front_url'].join(',');
const REQUEST_TIMEOUT_MS = 5000;
const USER_AGENT = 'LiquiVerde/1.0 (technical-challenge)';

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);

  async findByBarcode(barcode: string): Promise<NormalizedOpenFoodFactsProduct | null> {
    const url = new URL(`${OPEN_FOOD_FACTS_PRODUCT_URL}/${encodeURIComponent(barcode)}`);
    url.searchParams.set('fields', OPEN_FOOD_FACTS_FIELDS);

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (this.isTimeoutError(error)) {
        this.logger.warn(`Open Food Facts request timed out for barcode ${barcode}.`);
        throw new GatewayTimeoutException('External product service timed out.');
      }

      this.logger.warn(`Open Food Facts network request failed for barcode ${barcode}.`);
      throw new BadGatewayException('External product service is unavailable.');
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      this.logger.warn(`Open Food Facts returned HTTP ${response.status} for barcode ${barcode}.`);
      throw new BadGatewayException('External product service returned an error.');
    }

    let payload: OpenFoodFactsProductResponse;

    try {
      payload = (await response.json()) as OpenFoodFactsProductResponse;
    } catch {
      this.logger.warn(`Open Food Facts returned invalid JSON for barcode ${barcode}.`);
      throw new BadGatewayException('External product service returned an invalid response.');
    }

    if (!this.isValidProductResponse(payload)) {
      this.logger.warn(`Open Food Facts returned an unexpected response shape for barcode ${barcode}.`);
      throw new BadGatewayException('External product service returned an invalid response.');
    }

    if (payload.status === 0) {
      return null;
    }

    if (!this.isProductPayload(payload.product)) {
      this.logger.warn(`Open Food Facts returned product status without product data for barcode ${barcode}.`);
      throw new BadGatewayException('External product service returned an invalid response.');
    }

    return this.normalizeProduct(barcode, payload);
  }

  private normalizeProduct(
    requestedBarcode: string,
    payload: OpenFoodFactsProductResponse,
  ): NormalizedOpenFoodFactsProduct {
    const product = payload.product ?? {};
    const name = this.normalizeOptionalText(product.product_name) ?? 'Unknown product';

    return {
      barcode: payload.code ?? requestedBarcode,
      name,
      brand: this.normalizeOptionalText(product.brands),
      category: 'unknown',
      description: null,
      imageUrl: this.normalizeOptionalText(product.image_front_url),
      price: null,
      carbonKg: null,
      localProduct: null,
      recyclablePackaging: null,
      fairTrade: null,
      socialScore: null,
      source: 'open_food_facts',
      store: null,
    };
  }

  private isValidProductResponse(value: unknown): value is OpenFoodFactsProductResponse {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const { status } = value as OpenFoodFactsProductResponse;

    return status === 0 || status === 1;
  }

  private isProductPayload(value: unknown): value is OpenFoodFactsProduct {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : null;
  }

  private isTimeoutError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const errorName = (error as { name?: unknown }).name;

    return errorName === 'AbortError' || errorName === 'TimeoutError';
  }
}
