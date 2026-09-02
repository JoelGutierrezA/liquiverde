import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { OptimizeShoppingListDto } from './dto/optimize-shopping-list.dto';
import { OptimizationApplicationService } from './optimization-application.service';

@Controller('optimization')
export class OptimizationController {
  constructor(private readonly optimizationApplicationService: OptimizationApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  optimizeShoppingList(@Body() dto: OptimizeShoppingListDto) {
    return this.optimizationApplicationService.optimizeShoppingList(dto);
  }
}
