import { BadRequestException } from '@nestjs/common';
import { Account, Prisma, Transaction } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto } from './dto';
import { DashboardService } from './dashboard.service';

const userId = 'user-1';
const accountId = 'account-1';
const date = new Date('2026-10-15T15:00:00.000Z');
const account: Pick<Account, 'id' | 'initialBalance' | 'initialBalanceAt'> = {
  id: accountId,
  initialBalance: new Prisma.Decimal('100.00'),
  initialBalanceAt: new Date('2026-01-01T00:00:00.000Z'),
};

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transaction-1',
    userId,
    accountId,
    categoryId: 'category-1',
    type: 'INCOME',
    amount: new Prisma.Decimal('25.00'),
    currency: 'PEN',
    description: 'Ingreso',
    occurredAt: date,
    status: 'CONFIRMED',
    createdAt: date,
    updatedAt: date,
    deletedAt: null,
    ...overrides,
  };
}

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    account: { findMany: jest.Mock };
    transaction: {
      aggregate: jest.Mock;
      groupBy: jest.Mock;
      findMany: jest.Mock;
    };
    transfer: { findMany: jest.Mock };
    category: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      account: { findMany: jest.fn().mockResolvedValue([]) },
      transaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      transfer: { findMany: jest.fn().mockResolvedValue([]) },
      category: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  it('devuelve métricas vacías como cero y listas vacías', async () => {
    const result = await service.summary(userId, new DashboardQueryDto());

    expect(result.periodIncome).toBe('0.00');
    expect(result.periodExpense).toBe('0.00');
    expect(result.netFlow).toBe('0.00');
    expect(result.totalBalance).toBe('0.00');
    expect(result.topCategories).toEqual([]);
    expect(result.recentTransactions).toEqual([]);
    expect(result.committedMoney).toBeNull();
    expect(result.upcomingPayments).toEqual([]);
    expect(result.topBudgets).toEqual([]);
  });

  it('calcula ingresos, egresos y flujo neto del período', async () => {
    prisma.transaction.aggregate.mockImplementation(({ where }) =>
      Promise.resolve({
        _sum: {
          amount: new Prisma.Decimal(where.type === 'INCOME' ? '100.00' : '50.00'),
        },
      }),
    );

    const result = await service.summary(userId, new DashboardQueryDto());

    expect(result.periodIncome).toBe('100.00');
    expect(result.periodExpense).toBe('50.00');
    expect(result.netFlow).toBe('50.00');
  });

  it('agrupa y ordena las cinco categorías de mayor gasto y resuelve sus nombres', async () => {
    const groups = Array.from({ length: 5 }, (_, index) => ({
      categoryId: `category-${index + 1}`,
      _sum: { amount: new Prisma.Decimal(`${(5 - index) * 10}.00`) },
      _count: { _all: index + 1 },
    }));
    prisma.transaction.groupBy.mockResolvedValue(groups);
    prisma.category.findMany.mockResolvedValue(
      groups.map((group) => ({ id: group.categoryId!, name: `Categoría ${group.categoryId}` })),
    );

    const result = await service.summary(userId, new DashboardQueryDto());

    expect(result.topCategories).toEqual([
      { categoryId: 'category-1', categoryName: 'Categoría category-1', total: '50.00', count: 1 },
      { categoryId: 'category-2', categoryName: 'Categoría category-2', total: '40.00', count: 2 },
      { categoryId: 'category-3', categoryName: 'Categoría category-3', total: '30.00', count: 3 },
      { categoryId: 'category-4', categoryName: 'Categoría category-4', total: '20.00', count: 4 },
      { categoryId: 'category-5', categoryName: 'Categoría category-5', total: '10.00', count: 5 },
    ]);
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['categoryId'],
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
    );
  });

  it('consulta las últimas diez transacciones confirmadas fuera del período seleccionado', async () => {
    const transactions = Array.from({ length: 10 }, (_, index) =>
      makeTransaction({
        id: `transaction-${index}`,
        occurredAt: new Date(date.getTime() - index * 60_000),
      }),
    );
    prisma.transaction.findMany.mockResolvedValue(transactions);

    const result = await service.summary(userId, new DashboardQueryDto());

    expect(result.recentTransactions).toHaveLength(10);
    expect(result.recentTransactions[0].id).toBe('transaction-0');
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId, status: 'CONFIRMED', deletedAt: null },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
    );
  });

  it('deriva el balance de cuentas, movimientos y transferencias confirmadas', async () => {
    prisma.account.findMany.mockResolvedValue([account]);
    prisma.transaction.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeTransaction({ amount: new Prisma.Decimal('30.00') })]);
    prisma.transfer.findMany.mockResolvedValue([
      {
        originAccountId: accountId,
        destinationAccountId: 'account-2',
        amount: new Prisma.Decimal('5.00'),
      },
      {
        originAccountId: 'account-3',
        destinationAccountId: accountId,
        amount: new Prisma.Decimal('20.00'),
      },
    ]);

    const result = await service.summary(userId, new DashboardQueryDto());

    expect(result.totalBalance).toBe('145.00');
    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId, deletedAt: null, archived: false },
      }),
    );
  });

  it('respeta accountId en cuentas, métricas y transacciones recientes', async () => {
    const query = Object.assign(new DashboardQueryDto(), { accountId });

    await service.summary(userId, query);

    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId, deletedAt: null, archived: false, id: accountId },
      }),
    );
    expect(prisma.transaction.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ accountId }) }),
    );
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ accountId }) }),
    );
  });

  it('aplica el mes actual por defecto y devuelve fechas Lima con offset', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-28T19:11:21.217-05:00'));

    try {
      const result = await service.summary(userId, new DashboardQueryDto());

      expect(result.period).toEqual({
        from: '2026-10-01T00:00:00.000-05:00',
        to: '2026-10-31T23:59:59.999-05:00',
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('usa límites de día completos de Lima para un período custom con fechas', async () => {
    const query = Object.assign(new DashboardQueryDto(), {
      period: 'custom' as const,
      from: '2026-01-01',
      to: '2026-01-31',
    });

    const result = await service.summary(userId, query);

    expect(result.period).toEqual({
      from: '2026-01-01T00:00:00.000-05:00',
      to: '2026-01-31T23:59:59.999-05:00',
    });
  });

  it('rechaza un período custom cuyo inicio sea posterior al final', async () => {
    const query = Object.assign(new DashboardQueryDto(), {
      period: 'custom' as const,
      from: '2026-02-01',
      to: '2026-01-31',
    });

    await expect(service.summary(userId, query)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('calcula el mes anterior y los tres meses seleccionados', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00.000-05:00'));
    try {
      const lastMonth = await service.summary(
        userId,
        Object.assign(new DashboardQueryDto(), { period: 'last_month' as const }),
      );
      const lastThreeMonths = await service.summary(
        userId,
        Object.assign(new DashboardQueryDto(), { period: 'last_3_months' as const }),
      );

      expect(lastMonth.period).toEqual({
        from: '2025-12-01T00:00:00.000-05:00',
        to: '2025-12-31T23:59:59.999-05:00',
      });
      expect(lastThreeMonths.period).toEqual({
        from: '2025-11-01T00:00:00.000-05:00',
        to: '2026-01-31T23:59:59.999-05:00',
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
