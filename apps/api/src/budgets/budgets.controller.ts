import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { BudgetQueryDto, CopyBudgetDto, CreateBudgetDto, UpdateBudgetDto } from './dto';
import { BudgetsService } from './budgets.service';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBudgetDto) {
    const data = await this.budgetsService.create(user.id, dto);
    return { data };
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: BudgetQueryDto) {
    return this.budgetsService.findAll(user.id, query);
  }

  @Get(':id/usage')
  usage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.budgetsService.usage(user.id, id);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.budgetsService.findOne(user.id, id);
    return { data };
  }

  @Post(':id/copy')
  @HttpCode(HttpStatus.CREATED)
  async copy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CopyBudgetDto,
  ) {
    const data = await this.budgetsService.copy(user.id, id, dto);
    return { data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    const data = await this.budgetsService.update(user.id, id, dto);
    return { data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.budgetsService.remove(user.id, id);
  }

  @Post(':id/restore')
  async restore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const data = await this.budgetsService.restore(user.id, id);
    return { data };
  }
}
