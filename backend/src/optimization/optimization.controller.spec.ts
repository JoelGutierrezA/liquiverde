import { Test, TestingModule } from '@nestjs/testing';
import { OptimizeShoppingListDto } from './dto/optimize-shopping-list.dto';
import { OptimizationApplicationService } from './optimization-application.service';
import { OptimizationController } from './optimization.controller';

describe('OptimizationController', () => {
  let controller: OptimizationController;
  const optimizationApplicationServiceMock = {
    optimizeShoppingList: jest.fn(),
  };
  const dto: OptimizeShoppingListDto = {
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
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OptimizationController],
      providers: [
        {
          provide: OptimizationApplicationService,
          useValue: optimizationApplicationServiceMock,
        },
      ],
    }).compile();

    controller = module.get<OptimizationController>(OptimizationController);
  });

  it('delegates a valid optimization request to the application service', () => {
    const response = {
      budget: 15000,
      selectedItems: [],
    };
    optimizationApplicationServiceMock.optimizeShoppingList.mockReturnValue(response);

    expect(controller.optimizeShoppingList(dto)).toBe(response);
    expect(optimizationApplicationServiceMock.optimizeShoppingList).toHaveBeenCalledWith(dto);
  });

  it('returns the application service response', () => {
    const response = {
      budget: 15000,
      totalCost: 1150,
      selectedItems: [
        {
          category: 'milk',
        },
      ],
    };
    optimizationApplicationServiceMock.optimizeShoppingList.mockReturnValue(response);

    expect(controller.optimizeShoppingList(dto)).toEqual(response);
  });
});
