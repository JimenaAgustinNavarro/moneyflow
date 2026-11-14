import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ContributionType,
  GoalContribution,
  GoalStatus,
  Prisma,
  SavingsGoal,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGoalContributionDto,
  CreateSavingsGoalDto,
  SavingsGoalQueryDto,
  UpdateSavingsGoalDto,
} from './dto';

@Injectable()
export class SavingsGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseAmount(value: string | number | Prisma.Decimal): Prisma.Decimal {
    const amount = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(String(value));
    if (!amount.isFinite() || amount.lte(0)) {
      throw new BadRequestException('El monto debe ser mayor a cero.');
    }
    return amount;
  }

  private parseDate(value: Date | string): Date {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('La fecha debe ser válida.');
    }
    return date;
  }

  private serializeContribution(contribution: GoalContribution) {
    return {
      id: contribution.id,
      goalId: contribution.goalId,
      transactionId: contribution.transactionId,
      amount: contribution.amount.toFixed(2),
      type: contribution.type,
      date: contribution.occurredAt.toISOString(),
      createdAt: contribution.createdAt.toISOString(),
      deletedAt: contribution.deletedAt?.toISOString() ?? null,
    };
  }

  private serialize(
    goal: SavingsGoal,
    currentAmount: Prisma.Decimal,
    contributions: GoalContribution[] = [],
  ) {
    const effectiveStatus = this.calculateEffectiveStatus(
      goal.status,
      currentAmount,
      goal.targetAmount,
    );
    const percentage = goal.targetAmount.isZero()
      ? 0
      : Number(currentAmount.div(goal.targetAmount).mul(100).toFixed(2));
    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      targetAmount: goal.targetAmount.toFixed(2),
      currentAmount: currentAmount.toFixed(2),
      percentage,
      targetDate: goal.targetDate?.toISOString().slice(0, 10) ?? null,
      accountId: goal.accountId,
      status: effectiveStatus,
      contributions: contributions.map((contribution) => this.serializeContribution(contribution)),
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
      deletedAt: goal.deletedAt?.toISOString() ?? null,
    };
  }

  async calculateCurrentAmount(
    tx: Prisma.TransactionClient | PrismaService,
    goalId: string,
  ): Promise<Prisma.Decimal> {
    const contributions = await tx.goalContribution.findMany({
      where: { goalId, deletedAt: null },
      select: { amount: true, type: true },
    });
    return contributions.reduce((total, contribution) => {
      return contribution.type === ContributionType.DEPOSIT
        ? total.add(contribution.amount)
        : total.sub(contribution.amount);
    }, new Prisma.Decimal(0));
  }

  calculatePercentage(currentAmount: Prisma.Decimal | string | number, targetAmount: Prisma.Decimal | string | number): number {
    const current = currentAmount instanceof Prisma.Decimal
      ? currentAmount
      : new Prisma.Decimal(String(currentAmount));
    const target = this.parseAmount(targetAmount);
    return Number(current.div(target).mul(100).toFixed(2));
  }

  calculateEffectiveStatus(
    goalStatus: GoalStatus,
    currentAmount: Prisma.Decimal | string | number,
    targetAmount: Prisma.Decimal | string | number,
  ): GoalStatus {
    if (goalStatus === GoalStatus.CANCELLED) return GoalStatus.CANCELLED;
    const current = currentAmount instanceof Prisma.Decimal
      ? currentAmount
      : new Prisma.Decimal(String(currentAmount));
    const target = targetAmount instanceof Prisma.Decimal
      ? targetAmount
      : new Prisma.Decimal(String(targetAmount));
    if (goalStatus === GoalStatus.ACTIVE && current.gte(target)) return GoalStatus.COMPLETED;
    if (goalStatus === GoalStatus.COMPLETED && current.lt(target)) return GoalStatus.ACTIVE;
    return goalStatus;
  }

  private async validateAccount(tx: Prisma.TransactionClient, userId: string, accountId?: string) {
    if (!accountId) return;
    const account = await tx.account.findFirst({
      where: { id: accountId, userId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada.');
  }

  private async getGoal(userId: string, id: string, includeDeleted = false) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: {
        id,
        userId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
    if (!goal) throw new NotFoundException('Meta de ahorro no encontrada.');
    return goal;
  }

  async create(userId: string, dto: CreateSavingsGoalDto) {
    const targetAmount = this.parseAmount(dto.targetAmount);
    const targetDate = dto.targetDate ? this.parseDate(dto.targetDate) : null;
    return this.prisma.$transaction(async (tx) => {
      await this.validateAccount(tx, userId, dto.accountId);
      const goal = await tx.savingsGoal.create({
        data: {
          userId,
          name: dto.name.trim(),
          targetAmount,
          targetDate,
          accountId: dto.accountId ?? null,
          status: GoalStatus.ACTIVE,
        },
      });
      return this.serialize(goal, new Prisma.Decimal(0));
    });
  }

  async findAll(userId: string, query: SavingsGoalQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SavingsGoalWhereInput = {
      userId,
      ...(query.includeDeleted !== 'true' && { deletedAt: null }),
      ...(query.status && { status: query.status }),
    };
    const [total, goals] = await this.prisma.$transaction([
      this.prisma.savingsGoal.count({ where }),
      this.prisma.savingsGoal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const data = await Promise.all(goals.map(async (goal) => {
      const currentAmount = await this.calculateCurrentAmount(this.prisma, goal.id);
      return this.serialize(goal, currentAmount);
    }));
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, userId, deletedAt: null },
      include: { contributions: { where: { deletedAt: null }, orderBy: { occurredAt: 'desc' } } },
    });
    if (!goal) throw new NotFoundException('Meta de ahorro no encontrada.');
    const currentAmount = await this.calculateCurrentAmount(this.prisma, goal.id);
    return this.serialize(goal, currentAmount, goal.contributions);
  }

  async update(userId: string, id: string, dto: UpdateSavingsGoalDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.savingsGoal.findFirst({ where: { id, userId, deletedAt: null } });
      if (!existing) throw new NotFoundException('Meta de ahorro no encontrada.');
      if (dto.accountId !== undefined) await this.validateAccount(tx, userId, dto.accountId);
      const goal = await tx.savingsGoal.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.targetAmount !== undefined && { targetAmount: this.parseAmount(dto.targetAmount) }),
          ...(dto.targetDate !== undefined && { targetDate: this.parseDate(dto.targetDate) }),
          ...(dto.accountId !== undefined && { accountId: dto.accountId }),
          ...(dto.status !== undefined && { status: dto.status }),
        },
      });
      const currentAmount = await this.calculateCurrentAmount(tx, goal.id);
      return this.serialize(goal, currentAmount);
    });
  }

  async remove(userId: string, id: string) {
    const goal = await this.getGoal(userId, id);
    await this.prisma.$transaction([
      this.prisma.savingsGoal.update({ where: { id: goal.id }, data: { deletedAt: new Date() } }),
      this.prisma.goalContribution.updateMany({ where: { goalId: goal.id, deletedAt: null }, data: { deletedAt: new Date() } }),
    ]);
  }

  async restore(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({ where: { id, userId, deletedAt: { not: null } } });
    if (!goal) throw new NotFoundException('Meta de ahorro eliminada no encontrada.');
    const restored = await this.prisma.$transaction(async (tx) => {
      await tx.goalContribution.updateMany({ where: { goalId: id, deletedAt: { not: null } }, data: { deletedAt: null } });
      return tx.savingsGoal.update({ where: { id }, data: { deletedAt: null } });
    });
    const currentAmount = await this.calculateCurrentAmount(this.prisma, id);
    return this.serialize(restored, currentAmount);
  }

  private async getOwnedGoal(userId: string, goalId: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id: goalId, userId, deletedAt: null },
    });
    if (!goal) throw new NotFoundException('Meta de ahorro no encontrada.');
    return goal;
  }

  async listContributions(userId: string, goalId: string) {
    await this.getOwnedGoal(userId, goalId);
    const contributions = await this.prisma.goalContribution.findMany({
      where: { goalId, deletedAt: null },
      orderBy: { occurredAt: 'desc' },
    });
    return { data: contributions.map((contribution) => this.serializeContribution(contribution)) };
  }

  async createContribution(userId: string, goalId: string, dto: CreateGoalContributionDto) {
    const goal = await this.getOwnedGoal(userId, goalId);
    const amount = this.parseAmount(dto.amount);
    const date = this.parseDate(dto.date);
    const type = dto.type ?? ContributionType.DEPOSIT;
    return this.prisma.$transaction(async (tx) => {
      if (type === ContributionType.WITHDRAWAL) {
        const currentAmount = await this.calculateCurrentAmount(tx, goalId);
        if (amount.gt(currentAmount)) {
          throw new BadRequestException('El retiro supera el monto acumulado de la meta.');
        }
      }
      if (dto.transactionId) {
        const transaction = await tx.transaction.findFirst({
          where: { id: dto.transactionId, userId, deletedAt: null },
        });
        if (!transaction) throw new NotFoundException('Movimiento no encontrado.');
      }
      const contribution = await tx.goalContribution.create({
        data: {
          goalId,
          transactionId: dto.transactionId ?? null,
          amount,
          type,
          occurredAt: date,
        },
      });
      return this.serializeContribution(contribution);
    });
  }

  private async getContribution(userId: string, goalId: string, id: string, deleted: boolean) {
    await this.getOwnedGoal(userId, goalId);
    const contribution = await this.prisma.goalContribution.findFirst({
      where: { id, goalId, ...(deleted ? { deletedAt: { not: null } } : { deletedAt: null }) },
    });
    if (!contribution) throw new NotFoundException('Aporte no encontrado.');
    return contribution;
  }

  async removeContribution(userId: string, goalId: string, id: string) {
    const contribution = await this.getContribution(userId, goalId, id, false);
    await this.prisma.goalContribution.update({
      where: { id: contribution.id },
      data: { deletedAt: new Date() },
    });
  }

  async restoreContribution(userId: string, goalId: string, id: string) {
    const contribution = await this.getContribution(userId, goalId, id, true);
    const restored = await this.prisma.goalContribution.update({
      where: { id: contribution.id },
      data: { deletedAt: null },
    });
    return this.serializeContribution(restored);
  }
}
