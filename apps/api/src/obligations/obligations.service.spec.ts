import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ObligationStatus, Prisma } from '@prisma/client';
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
      obligation: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve(obligation(data))), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      transaction: { create: jest.fn() }, obligationPayment: { create: jest.fn() },
    };
    prisma = { $transaction: jest.fn((callback) => callback(tx)), obligation: tx.obligation, recurrence: tx.recurrence };
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

  it('lista filtros y próximos cinco', async () => {
    prisma.obligation.findMany.mockResolvedValue([obligation()]);
    await expect(service.findAll('user-1', { status: ObligationStatus.PENDING })).resolves.toEqual(expect.objectContaining({ data: expect.any(Array) }));
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
