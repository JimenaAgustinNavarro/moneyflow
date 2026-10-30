import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetStatus, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetsService } from './budgets.service';

const budget = (overrides: Record<string, unknown> = {}) => ({
  id: 'budget-1', userId: 'user-1', name: 'Comida', amount: new Prisma.Decimal('100.00'), currency: 'PEN',
  period: 'MONTHLY', startDate: new Date('2026-10-01T05:00:00.000Z'), endDate: new Date('2026-10-31T05:00:00.000Z'),
  alertThreshold: 80, active: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  categories: [], ...overrides,
}) as never;

describe('BudgetsService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tx: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  let service: BudgetsService;

  beforeEach(() => {
    tx = {
      category: { findMany: jest.fn(), findFirst: jest.fn() },
      budget: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      budgetCategory: { updateMany: jest.fn(), update: jest.fn(), create: jest.fn() },
      transaction: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal('0') } }) },
    };
    prisma = { $transaction: jest.fn((callback) => callback(tx)), ...tx, budget: tx.budget };
    service = new BudgetsService(prisma as PrismaService);
  });

  it('crea presupuesto con dos categorías válidas', async () => {
    tx.category.findMany.mockResolvedValue([{ id: 'cat-1', type: TransactionType.EXPENSE }, { id: 'cat-2', type: TransactionType.EXPENSE }]);
    tx.budget.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve(budget({ ...data, categories: [
      { id: 'relation-1', categoryId: 'cat-1', deletedAt: null, category: { id: 'cat-1', name: 'Comida', type: TransactionType.EXPENSE } },
    ] })));
    await expect(service.create('user-1', { name: 'Comida', limit: '100', periodType: 'MONTHLY', startDate: '2026-10-01T00:00:00-05:00', categoryIds: ['cat-1', 'cat-2'] } as never)).resolves.toEqual(expect.objectContaining({
      limit: '100.00',
      categories: [{ id: 'cat-1', name: 'Comida', type: TransactionType.EXPENSE }],
    }));
  });

  it('serializa solo categorías de relaciones activas', async () => {
    tx.category.findMany.mockResolvedValue([{ id: 'cat-1', type: TransactionType.EXPENSE }, { id: 'cat-2', type: TransactionType.EXPENSE }]);
    tx.budget.create.mockResolvedValue(budget({
      categories: [
        { deletedAt: null, category: { id: 'cat-1', name: 'Comida', type: TransactionType.EXPENSE } },
        { deletedAt: new Date(), category: { id: 'cat-2', name: 'Eliminada', type: TransactionType.EXPENSE } },
        { deletedAt: null, category: null },
      ],
    }));
    const result = await service.create('user-1', { name: 'Comida', limit: '100', periodType: 'MONTHLY', startDate: '2026-10-01T00:00:00-05:00', categoryIds: ['cat-1', 'cat-2'] } as never);
    expect(result.categories).toEqual([{ id: 'cat-1', name: 'Comida', type: TransactionType.EXPENSE }]);
  });

  it('rechaza categorías vacías, ajenas y de ingreso', async () => {
    await expect(service.create('user-1', { name: 'x', limit: '10', periodType: 'MONTHLY', startDate: '2026-10-01T00:00:00-05:00', categoryIds: [] } as never)).rejects.toBeInstanceOf(BadRequestException);
    tx.category.findMany.mockResolvedValue([]);
    await expect(service.create('user-1', { name: 'x', limit: '10', periodType: 'MONTHLY', startDate: '2026-10-01T00:00:00-05:00', categoryIds: ['cat-1'] } as never)).rejects.toBeInstanceOf(NotFoundException);
    tx.category.findMany.mockResolvedValue([{ id: 'cat-1', type: TransactionType.INCOME }]);
    await expect(service.create('user-1', { name: 'x', limit: '10', periodType: 'MONTHLY', startDate: '2026-10-01T00:00:00-05:00', categoryIds: ['cat-1'] } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza límite cero y rango inválido', async () => {
    await expect(service.create('user-1', { name: 'x', limit: '0', periodType: 'MONTHLY', startDate: '2026-10-01T00:00:00-05:00', categoryIds: ['cat-1'] } as never)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create('user-1', { name: 'x', limit: '10', periodType: 'MONTHLY', startDate: '2026-10-31T00:00:00-05:00', endDate: '2026-10-01T00:00:00-05:00', categoryIds: ['cat-1'] } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filtra por activo y estado calculado', async () => {
    prisma.budget.findMany.mockResolvedValue([budget(), budget({ id: 'budget-2', amount: new Prisma.Decimal('50') })]);
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal('110') } });
    const active = await service.findAll('user-1', { active: 'true' });
    expect(prisma.budget.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ active: true }) }));
    expect(active.data[0].status).toBe(BudgetStatus.OVER_LIMIT);
    await expect(service.findAll('user-1', { status: BudgetStatus.OVER_LIMIT })).resolves.toEqual(expect.objectContaining({ data: expect.any(Array) }));
  });

  it.each([
    ['0', BudgetStatus.UNDER_LIMIT, 80],
    ['80', BudgetStatus.NEAR_LIMIT, 80],
    ['101', BudgetStatus.OVER_LIMIT, 80],
  ])('calcula uso %s como %s', async (spent, status, threshold) => {
    prisma.budget.findFirst.mockResolvedValue(budget({ categories: [{ categoryId: 'cat-1', deletedAt: null }] }));
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(spent) } });
    const usage = await service.usage('user-1', 'budget-1');
    expect(usage.data.status).toBe(status);
    expect(usage.data.alertThreshold).toBe(threshold);
  });

  it('respeta umbral personalizado y excluye relaciones eliminadas', async () => {
    prisma.budget.findFirst.mockResolvedValue(budget({ alertThreshold: 30, categories: [{ categoryId: 'cat-1', deletedAt: null }] }));
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal('40') } });
    const usage = await service.usage('user-1', 'budget-1');
    expect(usage.data.status).toBe(BudgetStatus.NEAR_LIMIT);
    expect(prisma.transaction.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ categoryId: { in: ['cat-1'] } }) }));
  });

  it('copia presupuesto y categorías activas', async () => {
    tx.budget.findFirst.mockResolvedValue(budget({ categories: [{ categoryId: 'cat-1', deletedAt: null }] }));
    tx.budget.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve(budget({ ...data, categories: [
      { deletedAt: null, category: { id: 'cat-1', name: 'Comida', type: TransactionType.EXPENSE } },
    ] })));
    await expect(service.copy('user-1', 'budget-1', { startDate: '2026-11-01T00:00:00-05:00' })).resolves.toEqual(expect.objectContaining({
      id: 'budget-1',
      categories: [{ id: 'cat-1', name: 'Comida', type: TransactionType.EXPENSE }],
    }));
  });

  it('actualiza relaciones, elimina y restaura presupuesto', async () => {
    tx.budget.findFirst.mockResolvedValue(budget({ categories: [{ id: 'relation-1', categoryId: 'cat-1', deletedAt: null }] }));
    tx.category.findMany.mockResolvedValue([{ id: 'cat-2', type: TransactionType.EXPENSE }]);
    tx.budget.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve(budget(data)));
    await expect(service.update('user-1', 'budget-1', { categoryIds: ['cat-2'] })).resolves.toEqual(expect.objectContaining({ id: 'budget-1' }));
    tx.budget.findFirst.mockResolvedValue(budget());
    await expect(service.remove('user-1', 'budget-1')).resolves.toBeUndefined();
    tx.budget.findFirst.mockResolvedValue(budget({ deletedAt: new Date() }));
    await expect(service.restore('user-1', 'budget-1')).resolves.toEqual(expect.objectContaining({ id: 'budget-1' }));
  });

  it('obtiene detalle o devuelve no encontrado', async () => {
    prisma.budget.findFirst.mockResolvedValue(null);
    await expect(service.findOne('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
