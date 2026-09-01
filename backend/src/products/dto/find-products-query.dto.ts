import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

function trimOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

export class FindProductsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => trimOptionalString(value))
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(({ value }) => trimOptionalString(value))
  category?: string;
}
