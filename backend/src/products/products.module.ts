import { Module } from '@nestjs/common';
import { OpenFoodFactsModule } from '../integrations/open-food-facts/open-food-facts.module';
import { SustainabilityModule } from '../sustainability/sustainability.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [OpenFoodFactsModule, SustainabilityModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
