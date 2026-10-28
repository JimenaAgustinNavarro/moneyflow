import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateTransferDto, UpdateTransferDto } from './dto';
import { TransfersService } from './transfers.service';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTransferDto) {
    const data = await this.transfersService.create(user.id, dto);
    return { data };
  }

  @Patch(':transferId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transferId') transferId: string,
    @Body() dto: UpdateTransferDto,
  ) {
    const data = await this.transfersService.update(user.id, transferId, dto);
    return { data };
  }

  @Delete(':transferId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transferId') transferId: string,
  ): Promise<void> {
    await this.transfersService.remove(user.id, transferId);
  }
}
