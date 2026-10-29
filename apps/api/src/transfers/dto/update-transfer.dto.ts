import { IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class UpdateTransferDto {
  @IsOptional()
  @IsUUID()
  originAccountId?: string;

  @IsOptional()
  @IsUUID()
  destinationAccountId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
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
}
