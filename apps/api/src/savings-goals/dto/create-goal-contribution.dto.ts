import { ContributionType } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateGoalContributionDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @IsISO8601({ strict: true })
  date!: string;

  @IsOptional()
  @IsEnum(ContributionType)
  type: ContributionType = ContributionType.DEPOSIT;

  @IsOptional()
  @IsUUID()
  transactionId?: string;
}
