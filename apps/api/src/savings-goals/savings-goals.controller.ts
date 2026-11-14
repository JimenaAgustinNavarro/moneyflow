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
  CreateGoalContributionDto,
  CreateSavingsGoalDto,
  SavingsGoalQueryDto,
  UpdateSavingsGoalDto,
} from './dto';
import { SavingsGoalsService } from './savings-goals.service';

@Controller('savings-goals')
export class SavingsGoalsController {
  constructor(private readonly savingsGoalsService: SavingsGoalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSavingsGoalDto) {
    return { data: await this.savingsGoalsService.create(user.id, dto) };
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: SavingsGoalQueryDto) {
    return this.savingsGoalsService.findAll(user.id, query);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { data: await this.savingsGoalsService.findOne(user.id, id) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSavingsGoalDto,
  ) {
    return { data: await this.savingsGoalsService.update(user.id, id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.savingsGoalsService.remove(user.id, id);
  }

  @Post(':id/restore')
  async restore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { data: await this.savingsGoalsService.restore(user.id, id) };
  }

  @Get(':id/contributions')
  listContributions(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.savingsGoalsService.listContributions(user.id, id);
  }

  @Post(':id/contributions')
  @HttpCode(HttpStatus.CREATED)
  async createContribution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateGoalContributionDto,
  ) {
    return { data: await this.savingsGoalsService.createContribution(user.id, id, dto) };
  }

  @Delete(':goalId/contributions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeContribution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('goalId') goalId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.savingsGoalsService.removeContribution(user.id, goalId, id);
  }

  @Post(':goalId/contributions/:id/restore')
  async restoreContribution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('goalId') goalId: string,
    @Param('id') id: string,
  ) {
    return { data: await this.savingsGoalsService.restoreContribution(user.id, goalId, id) };
  }
}
