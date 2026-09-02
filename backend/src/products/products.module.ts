import { Module } from '@nestjs/common';
import { OpenFoodFactsModule } from '../integrations/open-food-facts/open-food-facts.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [OpenFoodFactsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
