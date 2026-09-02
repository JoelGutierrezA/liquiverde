import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  NormalizedOpenFoodFactsProduct,
  OpenFoodFactsProductResponse,
} from './types/open-food-facts-product.type';

const OPEN_FOOD_FACTS_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OPEN_FOOD_FACTS_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'generic_name',
  'brands',
  'image_front_url',
  'image_url',
].join(',');
const REQUEST_TIMEOUT_MS = 5000;

@Injectable()
export class OpenFoodFactsService {
  async findByBarcode(barcode: string): Promise<NormalizedOpenFoodFactsProduct | null> {
    const url = `${OPEN_FOOD_FACTS_PRODUCT_URL}/${barcode}?fields=${OPEN_FOOD_FACTS_FIELDS}`;

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'LiquiVerde/0.1 (technical test)',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new BadGatewayException('External product service is unavailable.');
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new BadGatewayException('External product service returned an error.');
    }

    let payload: OpenFoodFactsProductResponse;

    try {
      payload = (await response.json()) as OpenFoodFactsProductResponse;
    } catch {
      throw new BadGatewayException('External product service returned an invalid response.');
    }

    if (payload.status !== 1 || !payload.product) {
      return null;
    }

    return this.normalizeProduct(barcode, payload);
  }

  private normalizeProduct(
    requestedBarcode: string,
    payload: OpenFoodFactsProductResponse,
  ): NormalizedOpenFoodFactsProduct {
    const product = payload.product ?? {};
    const name = product.product_name ?? product.product_name_en ?? product.generic_name ?? 'Unknown product';
    const description = product.generic_name?.trim() ? product.generic_name : null;

    return {
      barcode: payload.code ?? requestedBarcode,
      name,
      brand: product.brands ?? null,
      category: 'unknown',
      description,
      imageUrl: product.image_front_url ?? product.image_url ?? null,
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
}
