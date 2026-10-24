import { CategoryType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(1, 60)
  name!: string;

  @IsEnum(CategoryType)
  type!: CategoryType;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-F]{6}$/i, {
    message: 'color debe ser un hex válido (#RRGGBB)',
  })
  color?: string;
}
