import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SustainabilityService } from '../sustainability/sustainability.service';
import { SustainabilityInputError } from '../sustainability/types/sustainability-error.type';
import { OptimizeShoppingListDto } from './dto/optimize-shopping-list.dto';
import { OptimizationApplicationService } from './optimization-application.service';
import { OptimizationService } from './optimization.service';
import { InsufficientBudgetError } from './types/optimization-error.type';

const milkProduct = {
  id: 'prod-milk-001',
  name: 'Leche entera familiar 1 L',
  brand: 'Campo Claro',
  category: 'milk',
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

const riceProduct = {
  id: 'prod-rice-001',
  name: 'Arroz grano largo 1 kg',
  brand: 'Despensa Sur',
  category: 'rice',
  price: 1450,
  carbonKg: 1.42,
  localProduct: false,
  recyclablePackaging: false,
  fairTrade: false,
  socialScore: 52,
  source: 'dataset',
  store: {
    id: 'store-centro',
    name: 'Mercado Verde Centro',
  },
};

const optimizationResult = {
  budget: 15000,
  totalCost: 2600,
  remainingBudget: 12400,
  baselineCost: 2600,
  savings: 0,
  savingsPercentage: 0,
  totalCarbonKg: 2.57,
  baselineCarbonKg: 2.57,
  carbonReductionKg: 0,
  carbonReductionPercentage: 0,
  averageSustainabilityScore: 61,
  averageEconomicUtility: 100,
  averageUtilityScore: 80.5,
  selectedItems: [
    {
      groupKey: 'milk',
      quantity: 1,
      product: {
        id: 'prod-milk-001',
        name: 'Leche entera familiar 1 L',
        category: 'milk',
        price: 1150,
        carbonKg: 1.15,
        sustainabilityScore: 66.58,
      },
      economicUtility: 100,
      utilityScore: 83.29,
      subtotal: 1150,
      carbonSubtotal: 1.15,
    },
    {
      groupKey: 'rice',
      quantity: 1,
      product: {
        id: 'prod-rice-001',
        name: 'Arroz grano largo 1 kg',
        category: 'rice',
        price: 1450,
        carbonKg: 1.42,
        sustainabilityScore: 55.42,
      },
      economicUtility: 100,
      utilityScore: 77.71,
      subtotal: 1450,
      carbonSubtotal: 1.42,
    },
  ],
};

const makeDto = (overrides: Partial<OptimizeShoppingListDto> = {}): OptimizeShoppingListDto => ({
  budget: 15000,
  weights: {
    economic: 0.5,
    sustainability: 0.5,
  },
  items: [
    {
      category: 'milk',
      quantity: 1,
    },
    {
      category: 'rice',
      quantity: 1,
    },
  ],
  ...overrides,
});

describe('OptimizationApplicationService', () => {
  let service: OptimizationApplicationService;
  const prismaMock = {
    product: {
      findMany: jest.fn(),
    },
  };
  const sustainabilityMock = {
    analyze: jest.fn(),
  };
  const optimizationMock = {
    optimize: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.product.findMany.mockResolvedValue([milkProduct, riceProduct]);
    sustainabilityMock.analyze.mockImplementation((product) => ({
      sustainabilityScore: product.category === 'milk' ? 66.58 : 55.42,
    }));
    optimizationMock.optimize.mockReturnValue(optimizationResult);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptimizationApplicationService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: SustainabilityService,
          useValue: sustainabilityMock,
        },
        {
          provide: OptimizationService,
          useValue: optimizationMock,
        },
      ],
    }).compile();

    service = module.get<OptimizationApplicationService>(OptimizationApplicationService);
  });

  it('loads products for the requested categories', async () => {
    await service.optimizeShoppingList(makeDto());

    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      where: {
        category: {
          in: ['milk', 'rice'],
        },
        source: 'dataset',
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: expect.objectContaining({
        id: true,
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      }),
    });
  });

  it('does not query unnecessary categories', async () => {
    optimizationMock.optimize.mockReturnValue({
      ...optimizationResult,
      selectedItems: [optimizationResult.selectedItems[0]],
    });

    await service.optimizeShoppingList(
      makeDto({
        items: [
          {
            category: 'milk',
            quantity: 1,
          },
        ],
      }),
    );

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: {
            in: ['milk'],
          },
        }),
      }),
    );
  });

  it('calculates Sustainability Score for candidates with their category context', async () => {
    await service.optimizeShoppingList(makeDto());

    expect(sustainabilityMock.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'milk',
        price: 1150,
      }),
      [
        expect.objectContaining({
          category: 'milk',
          price: 1150,
        }),
      ],
    );
    expect(sustainabilityMock.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'rice',
        price: 1450,
      }),
      [
        expect.objectContaining({
          category: 'rice',
          price: 1450,
        }),
      ],
    );
  });

  it('delegates selection to the Optimization Engine', async () => {
    await service.optimizeShoppingList(makeDto());

    expect(optimizationMock.optimize).toHaveBeenCalledWith({
      budget: 15000,
      weights: {
        economic: 0.5,
        sustainability: 0.5,
      },
      groups: [
        {
          key: 'milk',
          quantity: 1,
          candidates: [
            expect.objectContaining({
              id: 'prod-milk-001',
              sustainabilityScore: 66.58,
            }),
          ],
        },
        {
          key: 'rice',
          quantity: 1,
          candidates: [
            expect.objectContaining({
              id: 'prod-rice-001',
              sustainabilityScore: 55.42,
            }),
          ],
        },
      ],
    });
  });

  it('throws BadRequestException when a category has no candidates', async () => {
    prismaMock.product.findMany.mockResolvedValue([milkProduct]);

    await expect(service.optimizeShoppingList(makeDto())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException for duplicated categories', async () => {
    await expect(
      service.optimizeShoppingList(
        makeDto({
          items: [
            {
              category: 'milk',
              quantity: 1,
            },
            {
              category: 'milk',
              quantity: 2,
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });

  it('throws BadRequestException for invalid weights', async () => {
    await expect(
      service.optimizeShoppingList(
        makeDto({
          weights: {
            economic: 0.8,
            sustainability: 0.5,
          },
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });

  it('converts InsufficientBudgetError to UnprocessableEntityException', async () => {
    optimizationMock.optimize.mockImplementation(() => {
      throw new InsufficientBudgetError();
    });

    await expect(service.optimizeShoppingList(makeDto())).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('converts SustainabilityInputError to UnprocessableEntityException', async () => {
    sustainabilityMock.analyze.mockImplementation(() => {
      throw new SustainabilityInputError('invalid product data');
    });

    await expect(service.optimizeShoppingList(makeDto())).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(optimizationMock.optimize).not.toHaveBeenCalled();
  });

  it('preserves store metadata in the HTTP response', async () => {
    await expect(service.optimizeShoppingList(makeDto())).resolves.toEqual(
      expect.objectContaining({
        weights: {
          economic: 0.5,
          sustainability: 0.5,
        },
        selectedItems: [
          expect.objectContaining({
            category: 'milk',
            product: expect.objectContaining({
              id: 'prod-milk-001',
              brand: 'Campo Claro',
              store: {
                id: 'store-centro',
                name: 'Mercado Verde Centro',
              },
            }),
            sustainabilityScore: 66.58,
          }),
          expect.objectContaining({
            category: 'rice',
            product: expect.objectContaining({
              id: 'prod-rice-001',
              brand: 'Despensa Sur',
              store: {
                id: 'store-centro',
                name: 'Mercado Verde Centro',
              },
            }),
            sustainabilityScore: 55.42,
          }),
        ],
      }),
    );
  });
});
