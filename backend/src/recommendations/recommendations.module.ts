import { Module } from '@nestjs/common';
import { SustainabilityModule } from '../sustainability/sustainability.module';
import { RecommendationEngineService } from './recommendation-engine.service';
import { RecommendationsApplicationService } from './recommendations-application.service';

@Module({
  imports: [SustainabilityModule],
  providers: [RecommendationEngineService, RecommendationsApplicationService],
  exports: [RecommendationEngineService, RecommendationsApplicationService],
})
export class RecommendationsModule {}
