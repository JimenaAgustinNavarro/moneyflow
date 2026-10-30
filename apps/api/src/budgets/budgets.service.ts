import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BudgetStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetQueryDto, CopyBudgetDto, CreateBudgetDto, UpdateBudgetDto } from './dto';

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value: Date | string): Date {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) throw new BadRequestException('La fecha debe ser válida.');
    return date;
  }

  private toLimaIso(date: Date): string {
    return new Date(date.getTime() - LIMA_OFFSET_MS).toISOString().replace(/Z$/, '-05:00');
  }

  private parseAmount(value: string | number | Prisma.Decimal): Prisma.Decimal {
    const amount = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(String(value));
    if (!amount.isFinite() || amount.lte(0)) throw new BadRequestException('El límite debe ser mayor a cero.');
    return amount;
  }

  private validateBudgetRange(startDate: Date | string, endDate?: Date | string | null) {
    const start = this.parseDate(startDate);
    const end = endDate ? this.parseDate(endDate) : null;
    if (end && start > end) throw new BadRequestException('La fecha de inicio no puede superar la fecha de fin.');
    return { start, end };
  }

  private calculateStatus(percentage: number, alertThreshold: number): BudgetStatus {
    if (percentage < alertThreshold) return BudgetStatus.UNDER_LIMIT;
    if (percentage <= 100) return BudgetStatus.NEAR_LIMIT;
    return BudgetStatus.OVER_LIMIT;
  }

  private serialize(budget: {
    id: string; name: string; amount: Prisma.Decimal; currency: string; period: string;
    startDate: Date; endDate: Date | null; alertThreshold: number; active: boolean;
    createdAt: Date; updatedAt: Date; deletedAt: Date | null;
    categories?: Array<{
      deletedAt?: Date | null;
      categoryId?: string;
      category: { id: string; name: string; type: string } | null;
    }>;
  }) {
    return {
      id: budget.id,
      name: budget.name,
      limit: budget.amount.toFixed(2),
      currency: budget.currency,
      periodType: budget.period,
      startDate: this.toLimaIso(budget.startDate),
      endDate: budget.endDate ? this.toLimaIso(budget.endDate) : null,
      alertThreshold: budget.alertThreshold,
      active: budget.active,
      status: BudgetStatus.UNDER_LIMIT,
      categories: (Array.isArray(budget.categories) ? budget.categories : [])
        .filter((relation) => relation.deletedAt == null && relation.category != null)
        .map((relation) => ({
          id: relation.category!.id,
          name: relation.category!.name,
          type: relation.category!.type,
        })),
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
      deletedAt: budget.deletedAt?.toISOString() ?? null,
    };
  }

  private async validateCategories(
    tx: Prisma.TransactionClient,
    userId: string,
    categoryIds: string[],
    type: TransactionType,
  ) {
    if (!categoryIds.length) throw new BadRequestException('Debe incluir al menos una categoría.');
    if (new Set(categoryIds).size !== categoryIds.length) throw new BadRequestException('Las categorías deben ser únicas.');
    const categories = await tx.category.findMany({
      where: { id: { in: categoryIds }, deletedAt: null, OR: [{ userId }, { isSystem: true, userId: null }] },
    });
    if (categories.length !== categoryIds.length) throw new NotFoundException('Una categoría no existe o no pertenece al usuario.');
    if (categories.some((category) => category.type !== type)) {
      throw new BadRequestException('Todas las categorías deben ser de tipo EXPENSE.');
    }
    return categories;
  }

  private async calculateSpent(
    tx: Prisma.TransactionClient,
    userId: string,
    categoryIds: string[],
    startDate: Date,
    endDate?: Date | null,
  ) {
    const aggregate = await tx.transaction.aggregate({
      where: {
        userId,
        categoryId: { in: categoryIds },
        type: TransactionType.EXPENSE,
        status: TransactionStatus.CONFIRMED,
        deletedAt: null,
        occurredAt: { gte: startDate, ...(endDate && { lte: endDate }) },
      },
      _sum: { amount: true },
    });
    return new Prisma.Decimal(aggregate._sum.amount?.toString() ?? '0');
  }

  async create(userId: string, dto: CreateBudgetDto) {
    const amount = this.parseAmount(dto.limit);
    const { start, end } = this.validateBudgetRange(dto.startDate, dto.endDate);
    return this.prisma.$transaction(async (tx) => {
      await this.validateCategories(tx, userId, dto.categoryIds, TransactionType.EXPENSE);
      const budget = await tx.budget.create({
        data: {
          userId,
          name: dto.name,
          amount,
          currency: dto.currency ?? 'PEN',
          period: dto.periodType,
          startDate: start,
          endDate: end,
          alertThreshold: dto.alertThreshold ?? 80,
          categories: { create: dto.categoryIds.map((categoryId) => ({ categoryId })) },
        },
        include: {
          categories: {
            where: { deletedAt: null },
            include: { category: { select: { id: true, name: true, type: true } } },
          },
        },
      });
      return this.serialize(budget);
    });
  }

  async findAll(userId: string, query: BudgetQueryDto) {
    const where: Prisma.BudgetWhereInput = {
      userId,
      ...(query.includeDeleted !== 'true' && { deletedAt: null }),
      ...(query.active !== undefined && { active: query.active === 'true' }),
    };
    const budgets = await this.prisma.budget.findMany({
      where,
      include: {
        categories: {
          where: { deletedAt: null },
          include: { category: { select: { id: true, name: true, type: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (budgets.length === 0) return { data: [] };

    const allCategoryIds = budgets.flatMap((budget) =>
      budget.categories.map((relation) => relation.categoryId),
    );
    const expenses = allCategoryIds.length
      ? await this.prisma.transaction.groupBy({
          by: ['categoryId'],
          where: {
            userId,
            type: TransactionType.EXPENSE,
            status: TransactionStatus.CONFIRMED,
            deletedAt: null,
            categoryId: { in: [...new Set(allCategoryIds)] },
            occurredAt: {
              gte: new Date(Math.min(...budgets.map((budget) => budget.startDate.getTime()))),
              lte: new Date(Math.max(...budgets.map((budget) => (budget.endDate ?? new Date()).getTime()))),
            },
          },
          _sum: { amount: true },
        })
      : [];

    const serialized = budgets.map((budget) => {
      const categoryIds = budget.categories.map((relation) => relation.categoryId);
      const spent = categoryIds.length
        ? expenses
            .filter((expense) => expense.categoryId !== null && categoryIds.includes(expense.categoryId))
            .reduce((sum, expense) => sum.add(expense._sum.amount ?? 0), new Prisma.Decimal(0))
        : new Prisma.Decimal(0);
      const percentage = budget.amount.gt(0)
        ? spent.div(budget.amount).mul(100).toNumber()
        : 0;
      return {
        ...this.serialize(budget),
        spent: spent.toFixed(2),
        percentage,
        status: this.calculateStatus(percentage, budget.alertThreshold),
      };
    });
    return { data: query.status ? serialized.filter((budget) => budget.status === query.status) : serialized };
  }

  async findOne(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        categories: {
          where: { deletedAt: null },
          include: { category: { select: { id: true, name: true, type: true } } },
        },
      },
    });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado.');
    const categoryIds = budget.categories.map((relation) => relation.categoryId);
    const spent = await this.calculateSpent(this.prisma, userId, categoryIds, budget.startDate, budget.endDate);
    const percentage = budget.amount.gt(0)
      ? spent.div(budget.amount).mul(100).toNumber()
      : 0;
    return {
      ...this.serialize(budget),
      spent: spent.toFixed(2),
      percentage,
      status: this.calculateStatus(percentage, budget.alertThreshold),
    };
  }

  async usage(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId, deletedAt: null },
      include: { categories: { where: { deletedAt: null } } },
    });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado.');
    const categoryIds = budget.categories.map((relation) => relation.categoryId);
    const spent = await this.calculateSpent(this.prisma, userId, categoryIds, budget.startDate, budget.endDate);
    const percentage = spent.div(budget.amount).mul(100);
    const percentageNumber = percentage.toNumber();
    return { data: { spent: spent.toFixed(2), limit: budget.amount.toFixed(2), percentage: percentageNumber, status: this.calculateStatus(percentageNumber, budget.alertThreshold), alertThreshold: budget.alertThreshold, period: { startDate: this.toLimaIso(budget.startDate), endDate: budget.endDate ? this.toLimaIso(budget.endDate) : null } } };
  }

  async copy(userId: string, id: string, dto: CopyBudgetDto) {
    const { start, end } = this.validateBudgetRange(dto.startDate, dto.endDate);
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.budget.findFirst({
        where: { id, userId, deletedAt: null },
        include: {
          categories: {
            where: { deletedAt: null },
            include: { category: { select: { id: true, name: true, type: true } } },
          },
        },
      });
      if (!original) throw new NotFoundException('Presupuesto no encontrado.');
      const budget = await tx.budget.create({
        data: {
          userId,
          name: dto.name ?? `${original.name} (copia)`,
          amount: original.amount,
          currency: original.currency,
          period: original.period,
          startDate: start,
          endDate: end,
          alertThreshold: original.alertThreshold,
          active: original.active,
          categories: { create: original.categories.map((relation) => ({ categoryId: relation.categoryId })) },
        },
        include: {
          categories: {
            where: { deletedAt: null },
            include: { category: { select: { id: true, name: true, type: true } } },
          },
        },
      });
      return this.serialize(budget);
    });
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.budget.findFirst({
        where: { id, userId, deletedAt: null },
        include: {
          categories: {
            include: { category: { select: { id: true, name: true, type: true } } },
          },
        },
      });
      if (!current) throw new NotFoundException('Presupuesto no encontrado.');
      if (dto.categoryIds) await this.validateCategories(tx, userId, dto.categoryIds, TransactionType.EXPENSE);
      const start = dto.startDate ? this.parseDate(dto.startDate) : current.startDate;
      const end = dto.endDate !== undefined ? (dto.endDate ? this.parseDate(dto.endDate) : null) : current.endDate;
      if (end && start > end) throw new BadRequestException('La fecha de inicio no puede superar la fecha de fin.');
      if (dto.categoryIds) {
        await tx.budgetCategory.updateMany({ where: { budgetId: id, categoryId: { notIn: dto.categoryIds } }, data: { deletedAt: new Date() } });
        for (const categoryId of dto.categoryIds) {
          const existing = current.categories.find((relation) => relation.categoryId === categoryId);
          if (existing?.deletedAt) await tx.budgetCategory.update({ where: { id: existing.id }, data: { deletedAt: null } });
          else if (!existing) await tx.budgetCategory.create({ data: { budgetId: id, categoryId } });
        }
      }
      const budget = await tx.budget.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.limit !== undefined && { amount: this.parseAmount(dto.limit) }),
          ...(dto.currency !== undefined && { currency: dto.currency }),
          ...(dto.periodType !== undefined && { period: dto.periodType }),
          ...(dto.startDate !== undefined && { startDate: start }),
          ...(dto.endDate !== undefined && { endDate: end }),
          ...(dto.alertThreshold !== undefined && { alertThreshold: dto.alertThreshold }),
        },
        include: {
          categories: {
            where: { deletedAt: null },
            include: { category: { select: { id: true, name: true, type: true } } },
          },
        },
      });
      return this.serialize(budget);
    });
  }

  async remove(userId: string, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const budget = await tx.budget.findFirst({ where: { id, userId, deletedAt: null } });
      if (!budget) throw new NotFoundException('Presupuesto no encontrado.');
      await tx.budgetCategory.updateMany({ where: { budgetId: id, deletedAt: null }, data: { deletedAt: new Date() } });
      await tx.budget.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }

  async restore(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const budget = await tx.budget.findFirst({ where: { id, userId, deletedAt: { not: null } } });
      if (!budget) throw new NotFoundException('Presupuesto eliminado no encontrado.');
      await tx.budget.update({ where: { id }, data: { deletedAt: null } });
      await tx.budgetCategory.updateMany({ where: { budgetId: id, deletedAt: { not: null } }, data: { deletedAt: null } });
      const restored = await tx.budget.findFirst({
        where: { id, userId, deletedAt: null },
        include: {
          categories: {
            where: { deletedAt: null },
            include: { category: { select: { id: true, name: true, type: true } } },
          },
        },
      });
      if (!restored) throw new NotFoundException('Presupuesto no encontrado después de restaurarlo.');
      return this.serialize(restored);
    });
  }
}
