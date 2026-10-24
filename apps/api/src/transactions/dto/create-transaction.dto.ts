import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export enum AllowedTransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionStatusDto {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export class CreateTransactionDto {
  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsEnum(AllowedTransactionType, {
    message: 'type debe ser INCOME o EXPENSE.',
  })
  type!: AllowedTransactionType;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'amount debe ser un decimal con hasta 2 decimales.',
  })
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsISO8601({ strict: true }, { message: 'date debe ser una fecha ISO 8601 válida.' })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'date debe incluir una zona horaria.',
  })
  date!: string;

  @IsOptional()
  @IsEnum(TransactionStatusDto)
  status?: TransactionStatusDto;
}
