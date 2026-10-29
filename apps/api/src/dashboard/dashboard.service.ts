import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto } from './dto';

interface TopCategory {
  categoryId: string;
  categoryName: string;
  total: string;
  count: number;
}

interface RecentTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  currency: string;
  date: string;
  description: string | null;
  categoryId: string | null;
}

export interface DashboardSummary {
  period: { from: string; to: string };
  totalBalance: string;
  periodIncome: string;
  periodExpense: string;
  netFlow: string;
  topCategories: TopCategory[];
  recentTransactions: RecentTransaction[];
  committedMoney: null;
  upcomingPayments: [];
  topBudgets: [];
}

interface BalanceAccount {
  id: string;
  initialBalance: Prisma.Decimal;
  initialBalanceAt: Date;
}

const LIMA_OFFSET_HOURS = 5;
const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, query: DashboardQueryDto): Promise<DashboardSummary> {
    const { from, to } = this.resolvePeriod(query);
    const accountFilter = query.accountId ? { accountId: query.accountId } : {};

    const [accounts, incomeResult, expenseResult, categoryGroups, recentTransactions] =
      await Promise.all([
        this.prisma.account.findMany({
          where: {
            userId,
            deletedAt: null,
            archived: false,
            ...(query.accountId ? { id: query.accountId } : {}),
          },
          select: { id: true, initialBalance: true, initialBalanceAt: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'INCOME',
            status: 'CONFIRMED',
            deletedAt: null,
            occurredAt: { gte: from, lte: to },
            ...accountFilter,
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'EXPENSE',
            status: 'CONFIRMED',
            deletedAt: null,
            occurredAt: { gte: from, lte: to },
            ...accountFilter,
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['categoryId'],
          where: {
            userId,
            type: 'EXPENSE',
            status: 'CONFIRMED',
            deletedAt: null,
            occurredAt: { gte: from, lte: to },
            categoryId: { not: null },
            ...accountFilter,
          },
          _sum: { amount: true },
          _count: { _all: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 5,
        }),
        this.prisma.transaction.findMany({
          where: {
            userId,
            status: 'CONFIRMED',
            deletedAt: null,
            ...accountFilter,
          },
          orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
          take: 10,
        }),
      ]);

    const categoryIds = categoryGroups.flatMap((group) =>
      group.categoryId === null ? [] : [group.categoryId],
    );
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];
    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

    const income = new Prisma.Decimal(incomeResult._sum.amount ?? 0);
    const expense = new Prisma.Decimal(expenseResult._sum.amount ?? 0);

    return {
      period: { from: this.formatLimaIso(from), to: this.formatLimaIso(to) },
      totalBalance: await this.calculateTotalBalance(userId, accounts),
      periodIncome: income.toFixed(2),
      periodExpense: expense.toFixed(2),
      netFlow: income.minus(expense).toFixed(2),
      topCategories: categoryGroups.flatMap((group) => {
        if (group.categoryId === null) return [];
        return [
          {
            categoryId: group.categoryId,
            categoryName: categoryNames.get(group.categoryId) ?? 'Sin nombre',
            total: new Prisma.Decimal(group._sum.amount ?? 0).toFixed(2),
            count: group._count._all,
          },
        ];
      }),
      recentTransactions: recentTransactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount.toFixed(2),
        currency: transaction.currency,
        date: this.formatLimaIso(transaction.occurredAt),
        description: transaction.description,
        categoryId: transaction.categoryId,
      })),
      committedMoney: null,
      upcomingPayments: [],
      topBudgets: [],
    };
  }

  private resolvePeriod(query: DashboardQueryDto): { from: Date; to: Date } {
    if (query.period === 'custom') {
      const from = this.parseCustomBoundary(query.from!, false);
      const to = this.parseCustomBoundary(query.to!, true);
      if (from > to) {
        throw new BadRequestException('El rango de fechas no es válido.');
      }
      return { from, to };
    }

    const nowInLima = new Date(Date.now() - LIMA_OFFSET_HOURS * HOUR_IN_MILLISECONDS);
    const year = nowInLima.getUTCFullYear();
    const currentMonth = nowInLima.getUTCMonth();
    const period = query.period ?? 'month';
    const startMonthOffset = period === 'last_month' ? -1 : period === 'last_3_months' ? -2 : 0;
    const endMonthOffset = period === 'last_month' ? -1 : 0;
    const from = this.limaStartOfDay(year, currentMonth + startMonthOffset, 1);
    const to = new Date(
      this.limaStartOfDay(year, currentMonth + endMonthOffset + 1, 1).getTime() - 1,
    );

    return { from, to };
  }

  private limaStartOfDay(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month, day, LIMA_OFFSET_HOURS));
  }

  private parseCustomBoundary(value: string, endOfDay: boolean): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      const start = this.limaStartOfDay(year, month - 1, day);
      return endOfDay
        ? new Date(this.limaStartOfDay(year, month - 1, day + 1).getTime() - 1)
        : start;
    }

    return new Date(value);
  }

  private formatLimaIso(value: Date): string {
    const limaDate = new Date(value.getTime() - LIMA_OFFSET_HOURS * HOUR_IN_MILLISECONDS);
    return `${limaDate.toISOString().slice(0, -1)}-05:00`;
  }

  private async calculateTotalBalance(userId: string, accounts: BalanceAccount[]): Promise<string> {
    if (accounts.length === 0) return '0.00';

    // FIX-DASHBOARD-02: mantener este cálculo alineado con AccountsService.calculateBalance.
    const accountIds = accounts.map((account) => account.id);
    const earliestInitialBalanceAt = accounts.reduce(
      (earliest, account) =>
        account.initialBalanceAt < earliest ? account.initialBalanceAt : earliest,
      accounts[0].initialBalanceAt,
    );
    const [transactions, transfers] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          accountId: { in: accountIds },
          status: 'CONFIRMED',
          deletedAt: null,
          occurredAt: { gte: earliestInitialBalanceAt },
        },
        select: { accountId: true, type: true, amount: true, occurredAt: true },
      }),
      this.prisma.transfer.findMany({
        where: {
          userId,
          status: 'CONFIRMED',
          cancelledAt: null,
          OR: [
            { originAccountId: { in: accountIds } },
            { destinationAccountId: { in: accountIds } },
          ],
        },
        select: { originAccountId: true, destinationAccountId: true, amount: true },
      }),
    ]);

    let total = new Prisma.Decimal(0);
    for (const account of accounts) {
      let balance = new Prisma.Decimal(account.initialBalance);
      for (const transaction of transactions) {
        if (
          transaction.accountId !== account.id ||
          transaction.occurredAt < account.initialBalanceAt
        ) {
          continue;
        }

        balance =
          transaction.type === 'INCOME'
            ? balance.plus(transaction.amount)
            : balance.minus(transaction.amount);
      }
      for (const transfer of transfers) {
        if (transfer.originAccountId === account.id) {
          balance = balance.minus(transfer.amount);
        } else if (transfer.destinationAccountId === account.id) {
          balance = balance.plus(transfer.amount);
        }
      }
      total = total.plus(balance);
    }

    return total.toFixed(2);
  }
}
