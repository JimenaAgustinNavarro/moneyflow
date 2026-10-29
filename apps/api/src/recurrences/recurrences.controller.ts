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
import { CreateRecurrenceDto, RecurrenceQueryDto, UpdateRecurrenceDto } from './dto';
import { RecurrencesService } from './recurrences.service';

@Controller('recurrences')
export class RecurrencesController {
  constructor(private readonly recurrencesService: RecurrencesService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRecurrenceDto) {
    const data = await this.recurrencesService.create(user.id, dto);
    return { data };
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: RecurrenceQueryDto) {
    return this.recurrencesService.findAll(user.id, query);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.recurrencesService.findOne(user.id, id);
    return { data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecurrenceDto,
  ) {
    const data = await this.recurrencesService.update(user.id, id, dto);
    return { data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.recurrencesService.remove(user.id, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.recurrencesService.restore(user.id, id);
    return { data };
  }

  @Patch(':id/toggle')
  async toggle(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.recurrencesService.toggle(user.id, id);
    return { data };
  }
}
