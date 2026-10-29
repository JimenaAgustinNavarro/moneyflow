import { BudgetStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsIn } from 'class-validator';

export class BudgetQueryDto {
  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;

  @IsOptional()
  @IsIn(['true', 'false'])
  active?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  includeDeleted?: string;
}
