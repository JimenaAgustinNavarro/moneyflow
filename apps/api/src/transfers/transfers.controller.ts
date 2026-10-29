import {
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
import { CreateTransferDto, TransferQueryDto, UpdateTransferDto } from './dto';
import { TransfersService } from './transfers.service';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTransferDto) {
    const data = await this.transfersService.create(user.id, dto);
    return { data };
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: TransferQueryDto) {
    return this.transfersService.findAll(user.id, query);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.transfersService.findOne(user.id, id);
    return { data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTransferDto,
  ) {
    const data = await this.transfersService.update(user.id, id, dto);
    return { data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.transfersService.remove(user.id, id);
  }
}
