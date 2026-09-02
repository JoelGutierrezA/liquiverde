export type OpenFoodFactsProduct = {
  product_name?: string;
  brands?: string;
  image_front_url?: string;
};

export type OpenFoodFactsProductResponse = {
  code?: string;
  status?: number;
  product?: OpenFoodFactsProduct;
};

export type NormalizedOpenFoodFactsProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  category: 'unknown';
  description: string | null;
  imageUrl: string | null;
  price: null;
  carbonKg: null;
  localProduct: null;
  recyclablePackaging: null;
  fairTrade: null;
  socialScore: null;
  source: 'open_food_facts';
  store: null;
};
