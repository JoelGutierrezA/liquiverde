import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: productsServiceMock,
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
});
