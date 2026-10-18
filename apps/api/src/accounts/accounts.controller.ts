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

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('archived') archived?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    if (archived !== undefined && archived !== 'true' && archived !== 'false') {
      throw new BadRequestException('El filtro archived debe ser true o false.');
    }

    if (includeDeleted !== undefined && includeDeleted !== 'true' && includeDeleted !== 'false') {
      throw new BadRequestException('El filtro includeDeleted debe ser true o false.');
    }

    const archivedBool = archived === undefined ? undefined : archived === 'true';
    const includeDeletedBool = includeDeleted === 'true';
    const data = await this.accountsService.findAll(user.id, archivedBool, includeDeletedBool);
    return { data };
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAccountDto) {
    const data = await this.accountsService.create(user.id, dto);
    return { data };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.accountsService.findOne(user.id, id);
    return { data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    const data = await this.accountsService.update(user.id, id, dto);
    return { data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.accountsService.remove(user.id, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.accountsService.restore(user.id, id);
    return { data };
  }

  @Post(':id/recalculate')
  @HttpCode(HttpStatus.OK)
  async recalculate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.accountsService.recalculate(user.id, id);
    return { data };
  }
}
