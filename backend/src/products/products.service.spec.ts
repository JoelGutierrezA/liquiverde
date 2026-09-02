import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OpenFoodFactsService } from '../integrations/open-food-facts/open-food-facts.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

const product = {
  id: 'prod-milk-001',
  barcode: '7800000000001',
  name: 'Leche entera familiar 1 L',
  brand: 'Campo Claro',
  category: 'milk',
  description: 'Leche entera de consumo diario en formato familiar.',
  imageUrl: null,
  price: 1150,
  carbonKg: 1.15,
  localProduct: true,
  recyclablePackaging: true,
  fairTrade: false,
  socialScore: 72,
  source: 'dataset',
  store: {
    id: 'store-centro',
    name: 'Mercado Verde Centro',
  },
};

describe('ProductsService', () => {
  let service: ProductsService;
  const prismaMock = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const openFoodFactsMock = {
    findByBarcode: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: OpenFoodFactsService,
          useValue: openFoodFactsMock,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('findAll uses Prisma with deterministic ordering and store selection', async () => {
    prismaMock.product.findMany.mockResolvedValue([product]);

    await expect(service.findAll()).resolves.toEqual([product]);
    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: expect.objectContaining({
        id: true,
        barcode: true,
        store: { select: { id: true, name: true } },
      }),
    });
  });

  it('findAll searches by product name', async () => {
    prismaMock.product.findMany.mockResolvedValue([product]);

    await expect(service.findAll({ search: 'leche' })).resolves.toEqual([product]);
    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'leche', mode: 'insensitive' } },
            { brand: { contains: 'leche', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('findAll searches by brand', async () => {
    prismaMock.product.findMany.mockResolvedValue([product]);

    await expect(service.findAll({ search: 'campo' })).resolves.toEqual([product]);
    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'campo', mode: 'insensitive' } },
            { brand: { contains: 'campo', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('findAll filters by category', async () => {
    prismaMock.product.findMany.mockResolvedValue([product]);

    await expect(service.findAll({ category: 'milk' })).resolves.toEqual([product]);
    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          category: 'milk',
        },
      }),
    );
  });

  it('findAll combines search and category filters', async () => {
    prismaMock.product.findMany.mockResolvedValue([product]);

    await expect(service.findAll({ search: 'entera', category: 'milk' })).resolves.toEqual([product]);
    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          category: 'milk',
          OR: [
            { name: { contains: 'entera', mode: 'insensitive' } },
            { brand: { contains: 'entera', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('findAll returns an empty array when there are no matches', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);

    await expect(service.findAll({ search: 'zzzz-no-existe' })).resolves.toEqual([]);
  });

  it('findOne returns an existing product', async () => {
    prismaMock.product.findUnique.mockResolvedValue(product);

    await expect(service.findOne('prod-milk-001')).resolves.toEqual(product);
    expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
      where: { id: 'prod-milk-001' },
      select: expect.objectContaining({
        id: true,
        store: { select: { id: true, name: true } },
      }),
    });
  });

  it('findOne throws NotFoundException when product does not exist', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing-product')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findByBarcode returns a local product without calling Open Food Facts', async () => {
    prismaMock.product.findUnique.mockResolvedValue(product);

    await expect(service.findByBarcode('7800000000001')).resolves.toEqual(product);
    expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
      where: { barcode: '7800000000001' },
      select: expect.objectContaining({
        barcode: true,
        store: { select: { id: true, name: true } },
      }),
    });
    expect(openFoodFactsMock.findByBarcode).not.toHaveBeenCalled();
  });

  it('findByBarcode calls Open Food Facts when product is not found locally', async () => {
    const externalProduct = {
      barcode: '3017620422003',
      name: 'External product',
      brand: 'External brand',
      category: 'unknown',
      description: null,
      imageUrl: null,
      price: null,
      carbonKg: null,
      localProduct: null,
      recyclablePackaging: null,
      fairTrade: null,
      socialScore: null,
      source: 'open_food_facts',
      store: null,
    };
    prismaMock.product.findUnique.mockResolvedValue(null);
    openFoodFactsMock.findByBarcode.mockResolvedValue(externalProduct);

    await expect(service.findByBarcode('3017620422003')).resolves.toEqual(externalProduct);
    expect(openFoodFactsMock.findByBarcode).toHaveBeenCalledWith('3017620422003');
  });

  it('findByBarcode throws NotFoundException when product is not found locally or externally', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);
    openFoodFactsMock.findByBarcode.mockResolvedValue(null);

    await expect(service.findByBarcode('1234567890123')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAll hides unexpected database errors', async () => {
    prismaMock.product.findMany.mockRejectedValue(new Error('database detail'));

    await expect(service.findAll()).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
