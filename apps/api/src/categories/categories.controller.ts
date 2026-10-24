import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CategoryType } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

function isCategoryType(value: string): value is CategoryType {
  return Object.values(CategoryType).some((categoryType) => categoryType === value);
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    if (type !== undefined && !isCategoryType(type)) {
      throw new BadRequestException('El filtro type debe ser INCOME o EXPENSE.');
    }
    if (includeDeleted !== undefined && includeDeleted !== 'true' && includeDeleted !== 'false') {
      throw new BadRequestException('El filtro includeDeleted debe ser true o false.');
    }

    const data = await this.categoriesService.findAll(user.id, type, includeDeleted === 'true');
    return { data };
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
    const data = await this.categoriesService.create(user.id, dto);
    return { data };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.categoriesService.findOne(user.id, id);
    return { data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const data = await this.categoriesService.update(user.id, id, dto);
    return { data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.categoriesService.remove(user.id, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.categoriesService.restore(user.id, id);
    return { data };
  }
}
