import { AccountType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @Length(1, 60)
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'initialBalance debe ser un número decimal con hasta 2 decimales',
  })
  initialBalance!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
