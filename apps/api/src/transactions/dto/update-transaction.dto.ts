import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

import { AllowedTransactionType, TransactionStatusDto } from './create-transaction.dto';

export class UpdateTransactionDto {
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsEnum(AllowedTransactionType)
  type?: AllowedTransactionType;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'amount debe ser un decimal con hasta 2 decimales.',
  })
  amount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'date debe incluir una zona horaria.',
  })
  date?: string;

  @IsOptional()
  @IsEnum(TransactionStatusDto)
  status?: TransactionStatusDto;
}
