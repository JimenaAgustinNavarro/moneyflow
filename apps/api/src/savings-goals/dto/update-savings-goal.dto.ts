import { GoalStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateSavingsGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  targetAmount?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  targetDate?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}
