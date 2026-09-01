import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  constructor(private readonly prisma: PrismaService) {}

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
