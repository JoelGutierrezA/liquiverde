import { Store } from './store.model';

export type ProductSource = 'dataset' | 'open_food_facts' | string;

export interface Product {
  id?: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  carbonKg: number | null;
  localProduct: boolean | null;
  recyclablePackaging: boolean | null;
  fairTrade: boolean | null;
  socialScore: number | null;
  source: ProductSource;
  store: Store | null;
}
