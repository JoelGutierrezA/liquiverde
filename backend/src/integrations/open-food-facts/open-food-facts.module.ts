import { Module } from '@nestjs/common';
import { OpenFoodFactsService } from './open-food-facts.service';

@Module({
  providers: [OpenFoodFactsService],
  exports: [OpenFoodFactsService],
})
export class OpenFoodFactsModule {}
