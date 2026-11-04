import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ObligationStatus, Prisma, RecurrenceFrequency } from '@prisma/client';
import { ObligationsService } from './obligations.service';
import { PrismaService } from '../prisma/prisma.service';

const obligation = (overrides: Record<string, unknown> = {}) => ({
  id: 'obligation-1', userId: 'user-1', recurrenceId: null, accountId: 'account-1', categoryId: null,
  name: 'Luz', type: 'EXPENSE', amount: new Prisma.Decimal('100.00'), currency: 'PEN', description: null,
  dueDate: new Date('2026-12-01T05:00:00.000Z'), status: ObligationStatus.PENDING,
  periodStart: null, periodEnd: null, paidAt: null, cancelledAt: null,
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null, payments: [],
  account: { id: 'account-1', name: 'Cuenta principal' }, category: null,
  ...overrides,
}) as never;

describe('ObligationsService', () => {
  // Los mocks conservan la forma de Prisma sin acoplarse a todos sus tipos generados.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  let service: ObligationsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tx: any;

  beforeEach(() => {
    tx = {
      account: { findFirst: jest.fn().mockResolvedValue({ id: 'account-1' }) },
      category: { findFirst: jest.fn() },
      recurrence: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      obligation: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve(obligation(data))), findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0), update: jest.fn() },
      transaction: { create: jest.fn() }, obligationPayment: { create: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn((callbackOrQueries) => Array.isArray(callbackOrQueries) ? Promise.all(callbackOrQueries) : callbackOrQueries(tx)),
      obligation: tx.obligation,
      recurrence: tx.recurrence,
    };
    service = new ObligationsService(prisma as PrismaService);
  });

  it('rechaza montos iguales a cero', async () => {
    await expect(service.create('user-1', { amount: '0', accountId: 'account-1' } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza cuentas ajenas', async () => {
    tx.account.findFirst.mockResolvedValue(null);
    await expect(service.create('user-1', { amount: '100', dueDate: '2026-12-01T00:00:00-05:00', accountId: 'account-1', type: 'EXPENSE', name: 'Luz' } as never)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza recurrencias ajenas', async () => {
    tx.recurrence.findFirst.mockResolvedValue(null);
    await expect(service.create('user-1', { amount: '100', dueDate: '2026-12-01T00:00:00-05:00', accountId: 'account-1', recurrenceId: 'recurrence-1', type: 'EXPENSE', name: 'Luz' } as never)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lista filtros y próximos cinco con paginación', async () => {
    prisma.obligation.findMany.mockResolvedValue([obligation()]);
    prisma.obligation.count.mockResolvedValue(21);
    await expect(service.findAll('user-1', { status: ObligationStatus.PENDING, page: 2, limit: 20 })).resolves.toEqual(expect.objectContaining({
      data: expect.any(Array),
      meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
    }));
    await expect(service.upcoming('user-1')).resolves.toEqual(expect.objectContaining({ data: expect.any(Array) }));
    expect(prisma.obligation.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 5 }));
  });

  it('serializa los nombres de cuenta y categoría, incluyendo relaciones nulas', async () => {
    prisma.obligation.findMany.mockResolvedValue([
      obligation(),
      obligation({ id: 'obligation-2', account: { id: 'account-1', name: 'Cuenta principal' }, category: { id: 'category-1', name: 'Servicios' } }),
    ]);

    const result = await service.findAll('user-1', {} as never);

    expect(result.data[0]).toEqual(expect.objectContaining({ accountName: 'Cuenta principal', categoryName: null }));
    expect(result.meta).toEqual(expect.objectContaining({ page: 1, limit: 20 }));
    expect(result.data[1]).toEqual(expect.objectContaining({ accountName: 'Cuenta principal', categoryName: 'Servicios' }));
  });

  it('marca pago parcial y total', async () => {
    tx.obligation.findFirst.mockResolvedValue(obligation());
    tx.transaction.create.mockResolvedValue({ id: 'transaction-1' });
    tx.obligation.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve(obligation(data)));
    await expect(service.pay('user-1', 'obligation-1', { amount: '40', accountId: 'account-1' })).resolves.toEqual(expect.objectContaining({ status: ObligationStatus.PARTIALLY_PAID }));

    tx.obligation.findFirst.mockResolvedValue(obligation({ payments: [] }));
    await expect(service.pay('user-1', 'obligation-1', { amount: '100', accountId: 'account-1' })).resolves.toEqual(expect.objectContaining({ status: ObligationStatus.PAID }));
  });

  it('rechaza pago excesivo y estados bloqueados', async () => {
    tx.obligation.findFirst.mockResolvedValue(obligation({ payments: [{ amount: new Prisma.Decimal('80'), status: 'CONFIRMED' }] }));
    await expect(service.pay('user-1', 'obligation-1', { amount: '30', accountId: 'account-1' })).rejects.toBeInstanceOf(BadRequestException);
    tx.obligation.findFirst.mockResolvedValue(obligation({ status: ObligationStatus.CANCELLED }));
    await expect(service.pay('user-1', 'obligation-1', { amount: '10', accountId: 'account-1' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('genera sin duplicar', async () => {
    tx.recurrence.findMany.mockResolvedValue([]);
    await expect(service.generate('user-1')).resolves.toEqual({ generated: 0, skipped: 0 });
  });

  const recurrence = (overrides: Record<string, unknown> = {}) => ({
    id: 'recurrence-1',
    userId: 'user-1',
    name: 'Luz',
    type: 'EXPENSE',
    amount: new Prisma.Decimal('100.00'),
    currency: 'PEN',
    description: null,
    accountId: 'account-1',
    categoryId: null,
    frequency: RecurrenceFrequency.MONTHLY,
    dayOfPeriod: null,
    startDate: new Date('2026-08-01T05:00:00.000Z'),
    endDate: null,
    active: true,
    deletedAt: null,
    ...overrides,
  });

  it.each([
    [RecurrenceFrequency.MONTHLY, new Date('2026-09-01T05:00:00.000Z'), 3],
    [RecurrenceFrequency.WEEKLY, new Date('2026-10-14T05:00:00.000Z'), 3],
    [RecurrenceFrequency.BIWEEKLY, new Date('2026-09-23T05:00:00.000Z'), 3],
    [RecurrenceFrequency.QUARTERLY, new Date('2026-05-01T05:00:00.000Z'), 3],
    [RecurrenceFrequency.YEARLY, new Date('2024-11-01T05:00:00.000Z'), 3],
  ])('genera el backfill usando la frecuencia %s', async (frequency, startDate, expectedCount) => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-03T12:00:00.000Z'));
    tx.recurrence.findMany.mockResolvedValue([recurrence({ frequency, startDate })]);

    const result = await service.generate('user-1');

    expect(tx.obligation.create).toHaveBeenCalledTimes(expectedCount);
    expect(result.generated).toBe(expectedCount);
    expect(result.skipped).toBe(0);
    jest.useRealTimers();
  });

  it('respeta endDate y genera hasta ella', async () => {
    tx.recurrence.findMany.mockResolvedValue([
      recurrence({
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: new Date('2026-08-01T05:00:00.000Z'),
        endDate: new Date('2026-10-31T05:00:00.000Z'),
      }),
    ]);

    const result = await service.generate('user-1');

    expect(result.generated).toBe(3);
  });

  it('no genera recurrencias iniciadas en el futuro', async () => {
    tx.recurrence.findMany.mockResolvedValue([
      recurrence({ startDate: new Date('2099-01-01T05:00:00.000Z') }),
    ]);

    await expect(service.generate('user-1')).resolves.toEqual({ generated: 0, skipped: 0 });
  });

  it('es idempotente con periodStart existente', async () => {
    tx.recurrence.findMany.mockResolvedValue([
      recurrence({
        startDate: new Date('2026-10-01T05:00:00.000Z'),
      }),
    ]);
    tx.obligation.findUnique.mockResolvedValue(obligation());

    await expect(service.generate('user-1')).resolves.toEqual(
      expect.objectContaining({ generated: 0, skipped: expect.any(Number) }),
    );
    expect(tx.obligation.create).not.toHaveBeenCalled();
  });

  it('usa periodStart igual a la fecha de ocurrencia semanal y fija dueDate desde dayOfPeriod', async () => {
    tx.recurrence.findMany.mockResolvedValue([
      recurrence({
        frequency: RecurrenceFrequency.WEEKLY,
        dayOfPeriod: 31,
        startDate: new Date('2026-10-01T05:00:00.000Z'),
      }),
    ]);

    await service.generate('user-1');

    const creation = tx.obligation.create.mock.calls[0][0];
    expect(creation.data.periodStart).toEqual(new Date('2026-10-01T05:00:00.000Z'));
    expect(creation.data.dueDate).toEqual(new Date(Date.UTC(2026, 9, 31, 5, 0, 0)));
  });

  it('no genera antes de startDate ni duplica una ocurrencia existente', async () => {
    tx.recurrence.findMany.mockResolvedValue([
      recurrence({ startDate: new Date('2026-10-01T05:00:00.000Z') }),
    ]);
    tx.obligation.findUnique
      .mockResolvedValueOnce(obligation())
      .mockResolvedValueOnce(null);

    const result = await service.generate('user-1');

    expect(tx.obligation.create).toHaveBeenCalled();
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(tx.obligation.create.mock.calls.every(({ data }: { data: { periodStart: Date } }) =>
      data.periodStart >= new Date('2026-10-01T05:00:00.000Z'),
    )).toBe(true);
  });

  it('actualiza, elimina, restaura y obtiene una obligación', async () => {
    tx.obligation.findFirst.mockResolvedValue(obligation());
    tx.obligation.update.mockResolvedValue(obligation());
    await expect(service.update('user-1', 'obligation-1', {})).resolves.toEqual(expect.objectContaining({ id: 'obligation-1' }));
    await expect(service.remove('user-1', 'obligation-1')).resolves.toBeUndefined();
    tx.obligation.findFirst.mockResolvedValue(obligation({ deletedAt: new Date() }));
    await expect(service.restore('user-1', 'obligation-1')).resolves.toEqual(expect.objectContaining({ id: 'obligation-1' }));
    tx.obligation.findFirst.mockResolvedValue(null);
    await expect(service.findOne('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
