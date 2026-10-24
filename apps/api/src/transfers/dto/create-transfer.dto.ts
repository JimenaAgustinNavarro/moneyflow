import { IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  originAccountId!: string;

  @IsUUID()
  destinationAccountId!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'amount debe ser un decimal con hasta 2 decimales.',
  })
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsISO8601({ strict: true }, { message: 'date debe ser ISO 8601.' })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'date debe incluir una zona horaria.',
  })
  date!: string;
}
