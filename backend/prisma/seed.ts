import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

type StoreSeed = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type ProductSeed = {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  carbonKg: number;
  localProduct: boolean;
  recyclablePackaging: boolean;
  fairTrade: boolean;
  socialScore: number;
  source: string;
  storeId: string;
};

const prisma = new PrismaClient();
const datasetRoot = resolve(process.cwd(), '..', 'dataset');

async function readJsonFile<T>(fileName: string): Promise<T> {
  const filePath = resolve(datasetRoot, fileName);
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

function ensureUnique(values: string[], fieldName: string): void {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);

  if (duplicates.length > 0) {
    throw new Error(`Duplicate ${fieldName} values: ${Array.from(new Set(duplicates)).join(', ')}`);
  }
}

function validateStores(stores: StoreSeed[]): void {
  ensureUnique(
    stores.map((store) => store.id),
    'store id',
  );

  for (const store of stores) {
    if (!store.id || !store.name) {
      throw new Error('Each store must include id and name.');
    }

    if (!Number.isFinite(store.latitude) || !Number.isFinite(store.longitude)) {
      throw new Error(`Store ${store.id} has invalid coordinates.`);
    }
  }
}

function validateProducts(products: ProductSeed[], stores: StoreSeed[]): void {
  const storeIds = new Set(stores.map((store) => store.id));

  ensureUnique(
    products.map((product) => product.id),
    'product id',
  );
  ensureUnique(
    products.map((product) => product.barcode),
    'barcode',
  );

  for (const product of products) {
    if (!product.barcode) {
      throw new Error(`Product ${product.id} must include barcode.`);
    }

    if (!product.category) {
      throw new Error(`Product ${product.id} must include category.`);
    }

    if (!storeIds.has(product.storeId)) {
      throw new Error(`Product ${product.id} references unknown store ${product.storeId}.`);
    }

    if (!Number.isInteger(product.price) || product.price <= 0) {
      throw new Error(`Product ${product.id} must have an integer price greater than 0.`);
    }

    if (!Number.isFinite(product.carbonKg) || product.carbonKg < 0) {
      throw new Error(`Product ${product.id} must have carbonKg greater than or equal to 0.`);
    }

    if (!Number.isInteger(product.socialScore) || product.socialScore < 0 || product.socialScore > 100) {
      throw new Error(`Product ${product.id} must have socialScore between 0 and 100.`);
    }
  }
}

async function main(): Promise<void> {
  const stores = await readJsonFile<StoreSeed[]>('stores.json');
  const products = await readJsonFile<ProductSeed[]>('products.json');

  validateStores(stores);
  validateProducts(products, stores);

  for (const store of stores) {
    await prisma.store.upsert({
      where: { id: store.id },
      update: {
        name: store.name,
        latitude: store.latitude,
        longitude: store.longitude,
      },
      create: store,
    });
  }

  for (const product of products) {
    await prisma.product.upsert({
      where: { barcode: product.barcode },
      update: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description,
        imageUrl: product.imageUrl,
        price: product.price,
        carbonKg: product.carbonKg,
        localProduct: product.localProduct,
        recyclablePackaging: product.recyclablePackaging,
        fairTrade: product.fairTrade,
        socialScore: product.socialScore,
        source: product.source,
        storeId: product.storeId,
      },
      create: product,
    });
  }

  console.log(`Seed completed: ${stores.length} stores and ${products.length} products.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Unknown seed error.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
