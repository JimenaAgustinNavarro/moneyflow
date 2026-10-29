import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RecurrenceFrequency, TransactionType } from '@prisma/client';

export class CreateRecurrenceDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfPeriod?: number;

  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  startDate!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  endDate?: string;

  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;
}
