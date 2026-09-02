import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { RecommendationsApplicationService } from '../recommendations/recommendations-application.service';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly recommendationsApplicationService: RecommendationsApplicationService,
  ) {}

  @Get()
  findAll(@Query() query: FindProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    if (!/^\d{8,14}$/.test(barcode)) {
      throw new BadRequestException('Barcode is invalid.');
    }

    return this.productsService.findByBarcode(barcode);
  }

  @Get(':id/analysis')
  analyzeProduct(@Param('id') id: string) {
    this.validateProductId(id);

    return this.productsService.analyzeProduct(id);
  }

  @Get(':id/alternatives')
  findAlternatives(@Param('id') id: string) {
    this.validateProductId(id);

    return this.recommendationsApplicationService.findAlternatives(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    this.validateProductId(id);

    return this.productsService.findOne(id);
  }

  private validateProductId(id: string): void {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new BadRequestException('Product id is invalid.');
    }
  }
}
