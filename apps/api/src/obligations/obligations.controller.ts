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
import {
  CreateObligationDto,
  ObligationQueryDto,
  PayObligationDto,
  UpdateObligationDto,
} from './dto';
import { ObligationsService } from './obligations.service';

@Controller('obligations')
export class ObligationsController {
  constructor(private readonly obligationsService: ObligationsService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateObligationDto) {
    const data = await this.obligationsService.create(user.id, dto);
    return { data };
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ObligationQueryDto) {
    return this.obligationsService.findAll(user.id, query);
  }

  @Get('upcoming')
  upcoming(@CurrentUser() user: AuthenticatedUser) {
    return this.obligationsService.upcoming(user.id);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  generate(@CurrentUser() user: AuthenticatedUser) {
    return this.obligationsService.generate(user.id);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.obligationsService.findOne(user.id, id);
    return { data };
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.CREATED)
  async pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PayObligationDto,
  ) {
    const data = await this.obligationsService.pay(user.id, id, dto);
    return { data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateObligationDto,
  ) {
    const data = await this.obligationsService.update(user.id, id, dto);
    return { data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.obligationsService.remove(user.id, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.obligationsService.restore(user.id, id);
    return { data };
  }
}
