import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OpenFoodFactsService } from '../integrations/open-food-facts/open-food-facts.service';
import { NormalizedOpenFoodFactsProduct } from '../integrations/open-food-facts/types/open-food-facts-product.type';
import { PrismaService } from '../prisma/prisma.service';
import { FindProductsQueryDto } from './dto/find-products-query.dto';

const productSelect = {
  id: true,
  barcode: true,
  name: true,
  brand: true,
  category: true,
  description: true,
  imageUrl: true,
  price: true,
  carbonKg: true,
  localProduct: true,
  recyclablePackaging: true,
  fairTrade: true,
  socialScore: true,
  source: true,
  store: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ProductSelect;

export type ProductResponse = Prisma.ProductGetPayload<{
  select: typeof productSelect;
}>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openFoodFactsService: OpenFoodFactsService,
  ) {}

  async findAll(filters: FindProductsQueryDto = {}): Promise<ProductResponse[]> {
    try {
      return await this.prisma.product.findMany({
        where: this.buildWhere(filters),
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: productSelect,
      });
    } catch {
      throw new InternalServerErrorException('Could not retrieve products.');
    }
  }

  async findOne(id: string): Promise<ProductResponse> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        select: productSelect,
      });

      if (!product) {
        throw new NotFoundException(`Product ${id} was not found.`);
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Could not retrieve product.');
    }
  }

  async findByBarcode(barcode: string): Promise<ProductResponse | NormalizedOpenFoodFactsProduct> {
    try {
      const localProduct = await this.prisma.product.findUnique({
        where: { barcode },
        select: productSelect,
      });

      if (localProduct) {
        return localProduct;
      }
    } catch {
      throw new InternalServerErrorException('Could not retrieve product.');
    }

    const externalProduct = await this.openFoodFactsService.findByBarcode(barcode);

    if (!externalProduct) {
      throw new NotFoundException('Product was not found.');
    }

    return externalProduct;
  }

  private buildWhere(filters: FindProductsQueryDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          brand: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return where;
  }
}
