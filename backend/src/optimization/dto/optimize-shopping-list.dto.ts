import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class OptimizationWeightsDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  economic!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  sustainability!: number;
}

export class OptimizationItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Transform(({ value }) => trimString(value))
  category!: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;
}

export class OptimizeShoppingListDto {
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  budget!: number;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => OptimizationWeightsDto)
  weights!: OptimizationWeightsDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OptimizationItemDto)
  items!: OptimizationItemDto[];
}
