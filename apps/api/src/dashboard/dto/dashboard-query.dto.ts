import {
  IsDefined,
  IsIn,
  IsISO8601,
  IsOptional,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';

export const DASHBOARD_PERIODS = ['month', 'last_month', 'last_3_months', 'custom'] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

const ISO_DATE_OR_OFFSET_DATETIME = /^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/;

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(DASHBOARD_PERIODS)
  period: DashboardPeriod = 'month';

  @ValidateIf((query: DashboardQueryDto) => query.period === 'custom')
  @IsDefined()
  @IsISO8601({ strict: true })
  @Matches(ISO_DATE_OR_OFFSET_DATETIME, {
    message: 'from debe ser una fecha ISO 8601 o una fecha y hora con zona horaria.',
  })
  from?: string;

  @ValidateIf((query: DashboardQueryDto) => query.period === 'custom')
  @IsDefined()
  @IsISO8601({ strict: true })
  @Matches(ISO_DATE_OR_OFFSET_DATETIME, {
    message: 'to debe ser una fecha ISO 8601 o una fecha y hora con zona horaria.',
  })
  to?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;
}
