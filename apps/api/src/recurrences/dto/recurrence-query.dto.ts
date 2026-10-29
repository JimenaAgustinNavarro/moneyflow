import { IsBooleanString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class RecurrenceQueryDto {
  @IsOptional()
  @IsBooleanString()
  active?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsBooleanString()
  includeDeleted?: string;
}
