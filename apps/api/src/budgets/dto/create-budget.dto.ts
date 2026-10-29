import { BudgetPeriod } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum, IsISO8601, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateBudgetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  limit!: string;

  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsEnum(BudgetPeriod)
  periodType!: BudgetPeriod;

  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  startDate!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  endDate?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  categoryIds!: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  alertThreshold?: number;
}
