import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AllowedTransactionType, CreateTransactionDto, TransactionQueryDto } from './dto';
import { TransactionsService } from './transactions.service';

const USER_ID = 'user-1';
const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440000';
const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440001';
const NOW = new Date('2026-10-15T15:00:00.000Z');

function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: ACCOUNT_ID,
    userId: USER_ID,
    currency: 'PEN',
    archived: false,
    deletedAt: null,
    ...overrides,
  };
}

function makeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'transaction-1',
    userId: USER_ID,
    accountId: ACCOUNT_ID,
    categoryId: CATEGORY_ID,
    type: 'INCOME',
    amount: new Prisma.Decimal('500.00'),
    currency: 'PEN',
    description: 'Ingreso',
    occurredAt: NOW,
    status: TransactionStatus.CONFIRMED,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: {
    account: Record<string, jest.Mock>;
    category: Record<string, jest.Mock>;
    transaction: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let tx: typeof prisma;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    tx = {
      account: { findFirst: jest.fn().mockResolvedValue(makeAccount()) },
      category: {
        findFirst: jest.fn().mockResolvedValue({
          id: CATEGORY_ID,
          userId: USER_ID,
          isSystem: false,
          deletedAt: null,
          type: 'INCOME',
        }),
      },
      transaction: {
        findFirst: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(makeTransaction(data))),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve(makeTransaction(data))),
      },
      $transaction: jest.fn(),
    };
    prisma = {
      ...tx,
      $transaction: jest
        .fn()
        .mockImplementation((operation) =>
          Array.isArray(operation) ? Promise.all(operation) : operation(tx),
        ),
    };
    service = new TransactionsService(prisma as unknown as PrismaService);
  });

  afterEach(() => jest.useRealTimers());

  it('lista movimientos usando occurredAt y serializa la fecha pública como date', async () => {
    prisma.transaction.count.mockResolvedValue(1);
    prisma.transaction.findMany.mockResolvedValue([makeTransaction()]);

    await expect(
      service.findAll(
        USER_ID,
        Object.assign(new TransactionQueryDto(), {
          from: '2026-10-01',
          to: '2026-10-31',
        }),
      ),
    ).resolves.toMatchObject({
      data: [{ date: NOW.toISOString(), type: 'INCOME' }],
      meta: { total: 1 },
    });
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          occurredAt: {
            gte: new Date('2026-10-01T05:00:00.000Z'),
            lte: new Date('2026-11-01T04:59:59.999Z'),
          },
        }),
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      }),
    );
  });

  it('crea un ingreso confirmado con occurredAt, sin persistir balance', async () => {
    const dto: CreateTransactionDto = {
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      type: AllowedTransactionType.INCOME,
      amount: '500.00',
      date: '2026-10-15T10:00:00-05:00',
    };

    const result = await service.create(USER_ID, dto);
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        type: 'INCOME',
        occurredAt: NOW,
        status: 'CONFIRMED',
      }),
    });
    expect(result.date).toBe(NOW.toISOString());
    expect(tx.account).not.toHaveProperty('update');
  });

  it('rechaza montos inválidos, fechas futuras, cuentas archivadas y categorías incompatibles', async () => {
    const dto: CreateTransactionDto = {
      accountId: ACCOUNT_ID,
      type: AllowedTransactionType.INCOME,
      amount: '1',
      date: '2026-10-15T10:00:00-05:00',
    };
    await expect(service.create(USER_ID, { ...dto, amount: '0' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.create(USER_ID, { ...dto, date: '2099-01-01T00:00:00Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    tx.account.findFirst.mockResolvedValueOnce(makeAccount({ archived: true }));
    await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(BadRequestException);
    tx.category.findFirst.mockResolvedValueOnce({ id: CATEGORY_ID, type: 'EXPENSE' });
    await expect(
      service.create(USER_ID, { ...dto, categoryId: CATEGORY_ID }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('devuelve 404 para un movimiento inexistente o ajeno', async () => {
    tx.transaction.findFirst.mockResolvedValue(null);
    await expect(service.findOne('other-user', 'transaction-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('actualiza occurredAt sin escribir balance y protege tipo confirmado', async () => {
    tx.transaction.findFirst.mockResolvedValue(makeTransaction());
    await expect(
      service.update(USER_ID, 'transaction-1', { date: '2026-10-14T10:00:00-05:00' }),
    ).resolves.toMatchObject({ date: '2026-10-14T15:00:00.000Z' });
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { id: 'transaction-1' },
      data: { occurredAt: new Date('2026-10-14T15:00:00.000Z') },
    });

    await expect(
      service.update(USER_ID, 'transaction-1', { type: AllowedTransactionType.EXPENSE }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('aplica soft delete y restaura el movimiento en el ledger', async () => {
    tx.transaction.findFirst.mockResolvedValue(makeTransaction());
    await service.remove(USER_ID, 'transaction-1');
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { id: 'transaction-1' },
      data: { deletedAt: NOW },
    });

    tx.transaction.findFirst.mockResolvedValue(makeTransaction({ deletedAt: NOW }));
    await expect(service.restore(USER_ID, 'transaction-1')).resolves.toMatchObject({
      id: 'transaction-1',
    });
  });

  it('rechaza restaurar si la cuenta está eliminada o archivada', async () => {
    tx.transaction.findFirst.mockResolvedValue(makeTransaction({ deletedAt: NOW }));
    tx.account.findFirst.mockResolvedValue(makeAccount({ deletedAt: NOW }));

    await expect(service.restore(USER_ID, 'transaction-1')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('acepta los tipos de movimiento actuales y serializa solo los campos del modelo v2', async () => {
    tx.transaction.findFirst.mockResolvedValue(
      makeTransaction({ type: 'EXPENSE', status: TransactionStatus.PENDING }),
    );
    const result = await service.findOne(USER_ID, 'transaction-1');

    expect(result).not.toHaveProperty('direction');
    expect(result).not.toHaveProperty('transferId');
    expect(result).not.toHaveProperty('counterpartAccountId');
    expect(result).not.toHaveProperty('obligationId');
  });
});
