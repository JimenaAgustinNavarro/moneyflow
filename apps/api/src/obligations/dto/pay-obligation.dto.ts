import { IsISO8601, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class PayObligationDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  paidAt?: string;

  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
