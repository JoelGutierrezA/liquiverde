import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsApplicationService } from '../recommendations/recommendations-application.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  const productsServiceMock = {
    findAll: jest.fn(),
    findByBarcode: jest.fn(),
    findOne: jest.fn(),
    analyzeProduct: jest.fn(),
  };
  const recommendationsApplicationServiceMock = {
    findAlternatives: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: productsServiceMock,
        },
        {
          provide: RecommendationsApplicationService,
          useValue: recommendationsApplicationServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('delegates product analysis to ProductsService', () => {
    productsServiceMock.analyzeProduct.mockReturnValue({
      product: {
        id: 'prod-milk-001',
        name: 'Leche entera familiar 1 L',
        brand: 'Campo Claro',
        category: 'milk',
        price: 1150,
      },
      analysis: {},
      context: {
        category: 'milk',
        comparedProducts: 5,
      },
    });

    expect(controller.analyzeProduct('prod-milk-001')).toEqual(
      expect.objectContaining({
        product: expect.objectContaining({
          id: 'prod-milk-001',
        }),
      }),
    );
    expect(productsServiceMock.analyzeProduct).toHaveBeenCalledWith('prod-milk-001');
  });

  it('rejects invalid product ids before delegating analysis', () => {
    expect(() => controller.analyzeProduct('invalid/id')).toThrow(BadRequestException);
    expect(productsServiceMock.analyzeProduct).not.toHaveBeenCalled();
  });

  it('delegates product alternatives to RecommendationsApplicationService', () => {
    recommendationsApplicationServiceMock.findAlternatives.mockReturnValue({
      sourceProduct: {
        id: 'prod-milk-001',
      },
      recommendations: [],
    });

    expect(controller.findAlternatives('prod-milk-001')).toEqual(
      expect.objectContaining({
        sourceProduct: expect.objectContaining({
          id: 'prod-milk-001',
        }),
      }),
    );
    expect(recommendationsApplicationServiceMock.findAlternatives).toHaveBeenCalledWith('prod-milk-001');
  });

  it('rejects invalid product ids before delegating alternatives', () => {
    expect(() => controller.findAlternatives('invalid/id')).toThrow(BadRequestException);
    expect(recommendationsApplicationServiceMock.findAlternatives).not.toHaveBeenCalled();
  });
});
