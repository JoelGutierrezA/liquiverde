import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SustainabilityModule } from '../sustainability/sustainability.module';
import { OptimizationApplicationService } from './optimization-application.service';
import { OptimizationController } from './optimization.controller';
import { OptimizationService } from './optimization.service';

@Module({
  imports: [PrismaModule, SustainabilityModule],
  controllers: [OptimizationController],
  providers: [OptimizationService, OptimizationApplicationService],
  exports: [OptimizationService, OptimizationApplicationService],
})
export class OptimizationModule {}
