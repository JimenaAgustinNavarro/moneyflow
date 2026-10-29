import { IsBooleanString, IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { ObligationStatus } from '@prisma/client';

export class ObligationQueryDto {
  @IsOptional()
  @IsEnum(ObligationStatus)
  status?: ObligationStatus;

  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @IsOptional()
  @IsBooleanString()
  overdue?: string;

  @IsOptional()
  @IsUUID()
  recurrenceId?: string;

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
