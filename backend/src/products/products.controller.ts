import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: FindProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new BadRequestException('Product id is invalid.');
    }

    return this.productsService.findOne(id);
  }
}
