export interface ProductCategory {
  value: string;
  label: string;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { value: 'bread', label: 'Pan' },
  { value: 'cereal', label: 'Cereales' },
  { value: 'cleaning', label: 'Limpieza' },
  { value: 'eggs', label: 'Huevos' },
  { value: 'legumes', label: 'Legumbres' },
  { value: 'milk', label: 'Leche' },
  { value: 'pasta', label: 'Pastas' },
  { value: 'rice', label: 'Arroz' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'yogurt', label: 'Yogurt' },
];

export function getProductCategoryLabel(category: string): string {
  return PRODUCT_CATEGORIES.find((option) => option.value === category)?.label ?? category;
}
