import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
      transaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal('0') } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
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

  it('rechaza superposición con mismo nombre y categoría', async () => {
    tx.category.findMany.mockResolvedValue([{ id: 'cat-1', type: TransactionType.EXPENSE }]);
    tx.budget.findFirst.mockResolvedValue(budget({ name: ' COMIDA ' }));
    await expect(service.create('user-1', {
      name: 'comida',
      limit: '100',
      periodType: 'MONTHLY',
      startDate: '2026-10-01T00:00:00-05:00',
      endDate: '2026-10-31T00:00:00-05:00',
      categoryIds: ['cat-1'],
    } as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('permite presupuestos sin categorías compartidas o sin solapamiento temporal', async () => {
    tx.category.findMany.mockResolvedValue([{ id: 'cat-1', type: TransactionType.EXPENSE }]);
    tx.budget.findFirst.mockResolvedValue(null);
    tx.budget.create.mockResolvedValue(budget({ categories: [] }));
    await expect(service.create('user-1', {
      name: 'Comida',
      limit: '100',
      periodType: 'MONTHLY',
      startDate: '2026-10-01T00:00:00-05:00',
      endDate: '2026-10-31T00:00:00-05:00',
      categoryIds: ['cat-1'],
    } as never)).resolves.toBeDefined();

    expect(tx.budget.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        categories: expect.objectContaining({
          some: expect.objectContaining({ categoryId: { in: ['cat-1'] } }),
        }),
      }),
    }));
  });

  it('consulta solo presupuestos activos, no eliminados y con fechas solapadas', async () => {
    tx.category.findMany.mockResolvedValue([{ id: 'cat-1', type: TransactionType.EXPENSE }]);
    tx.budget.findFirst.mockResolvedValue(null);
    tx.budget.create.mockResolvedValue(budget({ categories: [] }));

    await service.create('user-1', {
      name: 'Comida',
      limit: '100',
      periodType: 'MONTHLY',
      startDate: '2026-11-01T00:00:00-05:00',
      endDate: '2026-11-30T00:00:00-05:00',
      categoryIds: ['cat-1'],
    } as never);

    expect(tx.budget.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        active: true,
        deletedAt: null,
        startDate: { lte: expect.any(Date) },
        OR: [
          { endDate: null },
          { endDate: { gte: expect.any(Date) } },
        ],
      }),
    }));
  });

  it('permite mismo nombre con categorías distintas y nombre distinto con categorías compartidas', async () => {
    tx.category.findMany.mockResolvedValue([{ id: 'cat-1', type: TransactionType.EXPENSE }]);
    tx.budget.findFirst.mockResolvedValue(null);
    tx.budget.create.mockResolvedValue(budget({ categories: [] }));

    await expect(service.create('user-1', {
      name: 'Comida',
      limit: '100',
      periodType: 'MONTHLY',
      startDate: '2026-10-01T00:00:00-05:00',
      categoryIds: ['cat-1'],
    } as never)).resolves.toBeDefined();
    await expect(service.create('user-1', {
      name: 'Entretenimiento',
      limit: '100',
      periodType: 'MONTHLY',
      startDate: '2026-10-01T00:00:00-05:00',
      categoryIds: ['cat-1'],
    } as never)).resolves.toBeDefined();
  });

  it('filtra por activo y estado calculado', async () => {
    prisma.budget.findMany.mockResolvedValue([budget(), budget({ id: 'budget-2', amount: new Prisma.Decimal('50') })]);
    prisma.budget.findMany.mockResolvedValue([
      budget({ categories: [{ categoryId: 'cat-1', deletedAt: null }] }),
      budget({ id: 'budget-2', categories: [{ categoryId: 'cat-1', deletedAt: null }] }),
    ]);
    prisma.transaction.groupBy.mockResolvedValue([
      { categoryId: 'cat-1', _sum: { amount: new Prisma.Decimal('110') } },
    ]);
    const active = await service.findAll('user-1', { active: 'true' });
    expect(prisma.budget.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ active: true }) }));
    expect(active.data[0]).toEqual(expect.objectContaining({ spent: '110.00', percentage: 110, status: BudgetStatus.OVER_LIMIT }));
    await expect(service.findAll('user-1', { status: BudgetStatus.OVER_LIMIT })).resolves.toEqual(expect.objectContaining({ data: expect.any(Array) }));
  });

  it.each([
    ['UNDER_LIMIT', BudgetStatus.UNDER_LIMIT],
    ['NEAR_LIMIT', BudgetStatus.NEAR_LIMIT],
    ['OVER_LIMIT', BudgetStatus.OVER_LIMIT],
  ])('filtra post-query por estado %s', async (_name, status) => {
    prisma.budget.findMany.mockResolvedValue([
      budget({ id: 'budget-under', amount: new Prisma.Decimal('200'), alertThreshold: 80, categories: [{ categoryId: 'cat-1', deletedAt: null }] }),
      budget({ id: 'budget-near', amount: new Prisma.Decimal('100'), alertThreshold: 80, categories: [{ categoryId: 'cat-1', deletedAt: null }] }),
      budget({ id: 'budget-over', amount: new Prisma.Decimal('50'), alertThreshold: 80, categories: [{ categoryId: 'cat-1', deletedAt: null }] }),
    ]);
    prisma.transaction.groupBy.mockResolvedValue([
      { categoryId: 'cat-1', _sum: new Prisma.Decimal('90') },
    ]);
    const result = await service.findAll('user-1', { status });
    const expectedId = status === BudgetStatus.UNDER_LIMIT
      ? 'budget-under'
      : status === BudgetStatus.NEAR_LIMIT ? 'budget-near' : 'budget-over';
    expect(result.data.map((item: { id: string }) => item.id)).toEqual([expectedId]);
    expect(result.data.every((item: { status: BudgetStatus }) => item.status === status)).toBe(true);
  });

  it('combina filtro status con activo en findAll', async () => {
    prisma.budget.findMany.mockResolvedValue([
      budget({ categories: [{ categoryId: 'cat-1', deletedAt: null }] }),
    ]);
    prisma.transaction.groupBy.mockResolvedValue([
      { categoryId: 'cat-1', _sum: new Prisma.Decimal('101') },
    ]);
    const result = await service.findAll('user-1', { active: 'true', status: BudgetStatus.OVER_LIMIT });
    expect(prisma.budget.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ active: true }),
    }));
    expect(result.data.every((item: { status: BudgetStatus }) => item.status === BudgetStatus.OVER_LIMIT)).toBe(true);
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
    tx.budget.findFirst
      .mockResolvedValueOnce(budget({ categories: [{ categoryId: 'cat-1', deletedAt: null }] }))
      .mockResolvedValueOnce(null);
    tx.budget.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve(budget({ ...data, categories: [
      { deletedAt: null, category: { id: 'cat-1', name: 'Comida', type: TransactionType.EXPENSE } },
    ] })));
    await expect(service.copy('user-1', 'budget-1', { startDate: '2026-11-01T00:00:00-05:00' })).resolves.toEqual(expect.objectContaining({
      id: 'budget-1',
      categories: [{ id: 'cat-1', name: 'Comida', type: TransactionType.EXPENSE }],
    }));
  });

  it('rechaza copy con conflicto y permite excluir el original', async () => {
    tx.budget.findFirst
      .mockResolvedValueOnce(budget({ categories: [{ categoryId: 'cat-1', deletedAt: null }] }))
      .mockResolvedValueOnce(budget({ name: 'Comida' }));
    await expect(service.copy('user-1', 'budget-1', {
      name: 'Comida',
      startDate: '2026-10-01T00:00:00-05:00',
    })).rejects.toBeInstanceOf(ConflictException);

    tx.budget.findFirst
      .mockReset()
      .mockResolvedValueOnce(budget({ categories: [{ categoryId: 'cat-1', deletedAt: null }] }))
      .mockResolvedValueOnce(null);
    tx.budget.create.mockResolvedValue(budget({ categories: [] }));
    await expect(service.copy('user-1', 'budget-1', {
      name: 'Comida distinta',
      startDate: '2026-10-01T00:00:00-05:00',
    })).resolves.toBeDefined();
    expect(tx.budget.findFirst.mock.calls[1][0].where.id).toEqual({ not: 'budget-1' });
  });

  it('actualiza relaciones, elimina y restaura presupuesto', async () => {
    tx.budget.findFirst
      .mockResolvedValueOnce(budget({ categories: [{ id: 'relation-1', categoryId: 'cat-1', deletedAt: null }] }))
      .mockResolvedValueOnce(null);
    tx.category.findMany.mockResolvedValue([{ id: 'cat-2', type: TransactionType.EXPENSE }]);
    tx.budget.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve(budget(data)));
    await expect(service.update('user-1', 'budget-1', { categoryIds: ['cat-2'] })).resolves.toEqual(expect.objectContaining({ id: 'budget-1' }));
    tx.budget.findFirst.mockResolvedValue(budget());
    await expect(service.remove('user-1', 'budget-1')).resolves.toBeUndefined();
    tx.budget.findFirst.mockResolvedValue(budget({ deletedAt: new Date() }));
    await expect(service.restore('user-1', 'budget-1')).resolves.toEqual(expect.objectContaining({ id: 'budget-1' }));
  });

  it('rechaza update con conflicto y excluye el propio presupuesto', async () => {
    tx.budget.findFirst
      .mockResolvedValueOnce(budget({ categories: [{ id: 'relation-1', categoryId: 'cat-1', deletedAt: null }] }))
      .mockResolvedValueOnce(budget({ name: 'Comida' }));
    await expect(service.update('user-1', 'budget-1', {
      name: 'comida',
    })).rejects.toBeInstanceOf(ConflictException);

    tx.budget.findFirst
      .mockReset()
      .mockResolvedValueOnce(budget({ categories: [{ id: 'relation-1', categoryId: 'cat-1', deletedAt: null }] }))
      .mockResolvedValueOnce(null);
    tx.budget.update.mockResolvedValue(budget({ categories: [] }));
    await expect(service.update('user-1', 'budget-1', {
      name: 'Comida distinta',
    })).resolves.toBeDefined();
    expect(tx.budget.findFirst.mock.calls[1][0].where.id).toEqual({ not: 'budget-1' });
  });

  it('detecta conflicto al cambiar fechas o categorías', async () => {
    tx.budget.findFirst
      .mockResolvedValueOnce(budget({ categories: [{ id: 'relation-1', categoryId: 'cat-1', deletedAt: null }] }))
      .mockResolvedValueOnce(budget({ name: 'Comida' }));
    await expect(service.update('user-1', 'budget-1', {
      startDate: '2026-10-15T00:00:00-05:00',
    })).rejects.toBeInstanceOf(ConflictException);

    tx.category.findMany.mockResolvedValue([{ id: 'cat-2', type: TransactionType.EXPENSE }]);
    tx.budget.findFirst
      .mockReset()
      .mockResolvedValueOnce(budget({ categories: [{ id: 'relation-1', categoryId: 'cat-1', deletedAt: null }] }))
      .mockResolvedValueOnce(budget({ name: 'Comida' }));
    await expect(service.update('user-1', 'budget-1', {
      categoryIds: ['cat-2'],
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('obtiene detalle o devuelve no encontrado', async () => {
    prisma.budget.findFirst.mockResolvedValue(null);
    await expect(service.findOne('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
