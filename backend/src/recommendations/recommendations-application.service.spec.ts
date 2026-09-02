import { InternalServerErrorException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SustainabilityService } from '../sustainability/sustainability.service';
import { SustainabilityInputError } from '../sustainability/types/sustainability-error.type';
import { RecommendationEngineService } from './recommendation-engine.service';
import { RecommendationsApplicationService } from './recommendations-application.service';

const sourceProduct = {
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

const candidateProduct = {
  ...sourceProduct,
  id: 'prod-milk-003',
  name: 'Leche organica local 1 L',
  brand: 'Valle Vivo',
  price: 1320,
  carbonKg: 0.85,
  socialScore: 84,
  store: {
    id: 'store-providencia',
    name: 'EcoCompra Providencia',
  },
};

describe('RecommendationsApplicationService', () => {
  let service: RecommendationsApplicationService;
  const prismaMock = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const sustainabilityMock = {
    analyze: jest.fn(),
  };
  const engineMock = {
    recommend: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.product.findUnique.mockResolvedValue(sourceProduct);
    prismaMock.product.findMany.mockResolvedValue([sourceProduct, candidateProduct]);
    sustainabilityMock.analyze.mockImplementation((product: { price: number }) => ({
      sustainabilityScore: product.price === sourceProduct.price ? 66.58 : 75.14,
    }));
    engineMock.recommend.mockReturnValue({
      sourceProductId: sourceProduct.id,
      recommendations: [
        {
          productId: candidateProduct.id,
          savings: -170,
          savingsPercentage: -14.78,
          sustainabilityImprovement: 8.56,
          carbonDifferenceKg: -0.3,
          economicImprovementScore: 50,
          sustainabilityImprovementScore: 100,
          recommendationScore: 80,
          reason: 'Mejora el indice sostenible en 8.56 puntos por un 14.78% mas de precio.',
        },
      ],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsApplicationService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: SustainabilityService,
          useValue: sustainabilityMock,
        },
        {
          provide: RecommendationEngineService,
          useValue: engineMock,
        },
      ],
    }).compile();

    service = module.get<RecommendationsApplicationService>(RecommendationsApplicationService);
  });

  it('throws NotFoundException when source product does not exist', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    await expect(service.findAlternatives('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });

  it('loads candidates from the same dataset category', async () => {
    await service.findAlternatives(sourceProduct.id);

    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      where: {
        category: 'milk',
        source: 'dataset',
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: expect.objectContaining({
        store: { select: { id: true, name: true } },
      }),
    });
  });

  it('excludes the source product before delegating to the engine', async () => {
    await service.findAlternatives(sourceProduct.id);

    expect(engineMock.recommend).toHaveBeenCalledWith(
      expect.objectContaining({
        id: sourceProduct.id,
      }),
      [
        expect.objectContaining({
          id: candidateProduct.id,
        }),
      ],
    );
  });

  it('calculates sustainability for source and candidates with the category context', async () => {
    await service.findAlternatives(sourceProduct.id);

    expect(sustainabilityMock.analyze).toHaveBeenCalledTimes(2);
    expect(sustainabilityMock.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'milk',
        price: sourceProduct.price,
      }),
      expect.arrayContaining([
        expect.objectContaining({ price: sourceProduct.price }),
        expect.objectContaining({ price: candidateProduct.price }),
      ]),
    );
  });

  it('enriches recommendation results with store and product metadata', async () => {
    await expect(service.findAlternatives(sourceProduct.id)).resolves.toEqual({
      sourceProduct: expect.objectContaining({
        id: sourceProduct.id,
        sustainabilityScore: 66.58,
        store: {
          id: 'store-centro',
          name: 'Mercado Verde Centro',
        },
      }),
      recommendations: [
        expect.objectContaining({
          product: expect.objectContaining({
            id: candidateProduct.id,
            brand: 'Valle Vivo',
            sustainabilityScore: 75.14,
            store: {
              id: 'store-providencia',
              name: 'EcoCompra Providencia',
            },
          }),
          recommendationScore: 80,
        }),
      ],
    });
  });

  it('returns an empty recommendation array as a valid response', async () => {
    engineMock.recommend.mockReturnValue({
      sourceProductId: sourceProduct.id,
      recommendations: [],
    });

    await expect(service.findAlternatives(sourceProduct.id)).resolves.toEqual({
      sourceProduct: expect.objectContaining({
        id: sourceProduct.id,
      }),
      recommendations: [],
    });
  });

  it('converts invalid sustainability data to UnprocessableEntityException', async () => {
    sustainabilityMock.analyze.mockImplementation(() => {
      throw new SustainabilityInputError('invalid');
    });

    await expect(service.findAlternatives(sourceProduct.id)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('hides unexpected database errors', async () => {
    prismaMock.product.findUnique.mockRejectedValue(new Error('database detail'));

    await expect(service.findAlternatives(sourceProduct.id)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
