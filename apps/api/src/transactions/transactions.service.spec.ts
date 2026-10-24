import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';

import { PrismaService as DatabaseService } from '../prisma/prisma.service';
import {
  AllowedTransactionType,
  CreateTransactionDto,
  TransactionQueryDto,
  TransactionStatusDto,
} from './dto';
import { TransactionsService } from './transactions.service';

const USER_ID = 'user-1';
const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440002';
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
    date: new Date('2026-10-15T15:00:00.000Z'),
    status: TransactionStatus.CONFIRMED,
    transferId: null,
    counterpartAccountId: null,
    obligationId: null,
    createdAt: new Date('2026-10-15T15:01:00.000Z'),
    updatedAt: new Date('2026-10-15T15:01:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('TransactionsService', () => {
  type MockClient = {
    account: Record<string, jest.Mock>;
    category: Record<string, jest.Mock>;
    transaction: Record<string, jest.Mock>;
  };
  let service: TransactionsService;
  let prisma: MockClient & { $transaction: jest.Mock };
  let tx: MockClient;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);

    tx = {
      account: {
        findFirst: jest.fn().mockResolvedValue(makeAccount()),
        update: jest.fn().mockResolvedValue(makeAccount()),
      },
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
        create: jest
          .fn()
          .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
            Promise.resolve(makeTransaction(data)),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
            Promise.resolve(makeTransaction(data)),
          ),
      },
    };

    prisma = {
      ...tx,
      $transaction: jest
        .fn()
        .mockImplementation(
          (operation: ((transaction: MockClient) => Promise<unknown>) | Promise<unknown>[]) => {
            if (typeof operation === 'function') {
              return operation(tx);
            }
            return Promise.all(operation);
          },
        ),
    };

    service = new TransactionsService(prisma as unknown as DatabaseService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('findAll', () => {
    it('devuelve lista y metadatos con valores por defecto', async () => {
      prisma.transaction.count.mockResolvedValue(0);
      prisma.transaction.findMany.mockResolvedValue([]);

      await expect(service.findAll(USER_ID, new TransactionQueryDto())).resolves.toEqual({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, deletedAt: null },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          skip: 0,
          take: 20,
        }),
      );
    });

    it('aplica filtros, fechas de Lima inclusivas, paginación e includeDeleted', async () => {
      prisma.transaction.count.mockResolvedValue(15);
      prisma.transaction.findMany.mockResolvedValue([]);
      const query = Object.assign(new TransactionQueryDto(), {
        accountId: ACCOUNT_ID,
        categoryId: CATEGORY_ID,
        type: AllowedTransactionType.INCOME,
        status: TransactionStatusDto.CONFIRMED,
        from: '2026-10-01',
        to: '2026-10-31',
        page: 2,
        limit: 5,
        includeDeleted: 'true',
      });

      const result = await service.findAll(USER_ID, query);
      const call = prisma.transaction.findMany.mock.calls[0][0];

      expect(call.where).toMatchObject({
        userId: USER_ID,
        accountId: ACCOUNT_ID,
        categoryId: CATEGORY_ID,
        type: 'INCOME',
        status: 'CONFIRMED',
        date: {
          gte: new Date('2026-10-01T05:00:00.000Z'),
          lte: new Date('2026-11-01T04:59:59.999Z'),
        },
      });
      expect(call.where.deletedAt).toBeUndefined();
      expect(call.skip).toBe(5);
      expect(call.take).toBe(5);
      expect(result.meta).toEqual({ page: 2, limit: 5, total: 15, totalPages: 3 });
    });

    it('rechaza un rango de fechas invertido', async () => {
      await expect(
        service.findAll(
          USER_ID,
          Object.assign(new TransactionQueryDto(), {
            from: '2026-10-20',
            to: '2026-10-01',
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('create', () => {
    const dto: CreateTransactionDto = {
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      type: AllowedTransactionType.INCOME,
      amount: '500',
      date: '2026-10-15T10:00:00-05:00',
    };

    it('crea un ingreso confirmado y suma el balance en la misma transacción', async () => {
      const result = await service.create(USER_ID, dto);

      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          accountId: ACCOUNT_ID,
          categoryId: CATEGORY_ID,
          type: 'INCOME',
          status: 'CONFIRMED',
          currency: 'PEN',
        }),
      });
      expect(tx.account.update.mock.calls[0][0].data.balance.increment.toString()).toBe('500');
      expect(result.amount).toBe('500.00');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('resta un egreso confirmado del balance', async () => {
      tx.category.findFirst.mockResolvedValue({ id: CATEGORY_ID, type: 'EXPENSE' });

      await service.create(USER_ID, { ...dto, type: AllowedTransactionType.EXPENSE });

      expect(tx.account.update.mock.calls[0][0].data.balance.increment.toString()).toBe('-500');
    });

    it('no altera el balance para un movimiento pendiente', async () => {
      await service.create(USER_ID, {
        ...dto,
        status: TransactionStatusDto.PENDING,
      });

      expect(tx.account.update).not.toHaveBeenCalled();
    });

    it.each(['0', '-10'])('rechaza amount %s', async (amount) => {
      await expect(service.create(USER_ID, { ...dto, amount })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza una fecha futura con 400', async () => {
      await expect(
        service.create(USER_ID, { ...dto, date: '2099-01-01T00:00:00-05:00' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza una cuenta archivada con 400 y una cuenta borrada con 404', async () => {
      tx.account.findFirst.mockResolvedValueOnce(makeAccount({ archived: true }));

      await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(BadRequestException);

      tx.account.findFirst.mockResolvedValueOnce(makeAccount({ deletedAt: NOW }));
      await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza categoría inexistente con 404 o tipo incompatible con 422', async () => {
      tx.category.findFirst.mockResolvedValueOnce(null);
      await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(NotFoundException);

      tx.category.findFirst.mockResolvedValueOnce({ id: CATEGORY_ID, type: 'EXPENSE' });
      await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });
  });

  describe('findOne', () => {
    it('devuelve un movimiento activo del usuario', async () => {
      tx.transaction.findFirst.mockResolvedValue(makeTransaction());

      await expect(service.findOne(USER_ID, 'transaction-1')).resolves.toMatchObject({
        id: 'transaction-1',
        amount: '500.00',
      });
      expect(tx.transaction.findFirst).toHaveBeenCalledWith({
        where: { id: 'transaction-1', userId: USER_ID, deletedAt: null },
      });
    });

    it('devuelve 404 cuando no existe o pertenece a otro usuario', async () => {
      tx.transaction.findFirst.mockResolvedValue(null);

      await expect(service.findOne('other-user', 'transaction-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rechaza cambiar type de un movimiento CONFIRMED con 409', async () => {
      tx.transaction.findFirst.mockResolvedValue(
        makeTransaction({ type: 'INCOME', status: 'CONFIRMED' }),
      );

      await expect(
        service.update(USER_ID, 'transaction-1', { type: AllowedTransactionType.EXPENSE }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(tx.category.findFirst).not.toHaveBeenCalled();
      expect(tx.transaction.update).not.toHaveBeenCalled();
    });

    it('revierte y reaplica el efecto al cambiar el monto', async () => {
      tx.transaction.findFirst.mockResolvedValue(makeTransaction());

      await service.update(USER_ID, 'transaction-1', { amount: '300' });

      expect(tx.account.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: { balance: { increment: new Prisma.Decimal('-500') } } }),
      );
      expect(tx.account.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: { balance: { increment: new Prisma.Decimal('300') } } }),
      );
    });

    it('aplica saldo al pasar de PENDING a CONFIRMED y lo revierte al cancelar', async () => {
      tx.transaction.findFirst
        .mockResolvedValueOnce(makeTransaction({ status: 'PENDING' }))
        .mockResolvedValueOnce(makeTransaction());

      await service.update(USER_ID, 'transaction-1', {
        status: TransactionStatusDto.CONFIRMED,
      });
      expect(tx.account.update).toHaveBeenCalledTimes(1);

      tx.account.update.mockClear();
      await service.update(USER_ID, 'transaction-1', {
        status: TransactionStatusDto.CANCELLED,
      });
      expect(tx.account.update).toHaveBeenCalledTimes(1);
      expect(tx.account.update.mock.calls[0][0].data.balance.increment.toString()).toBe('-500');
    });

    it('rechaza cambiar type en CONFIRMED y lo permite en PENDING', async () => {
      tx.transaction.findFirst
        .mockResolvedValueOnce(makeTransaction({ status: 'CONFIRMED' }))
        .mockResolvedValueOnce(makeTransaction({ status: 'PENDING' }));
      tx.category.findFirst.mockResolvedValue({
        id: CATEGORY_ID,
        userId: USER_ID,
        isSystem: false,
        deletedAt: null,
        type: 'EXPENSE',
      });
      tx.transaction.update.mockImplementationOnce(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(makeTransaction({ status: 'PENDING', ...data })),
      );

      await expect(
        service.update(USER_ID, 'transaction-1', { type: AllowedTransactionType.EXPENSE }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.update(USER_ID, 'transaction-1', { type: AllowedTransactionType.EXPENSE }),
      ).resolves.toMatchObject({ type: 'EXPENSE' });
    });

    it('valida la cuenta destino y aplica el balance a la cuenta nueva', async () => {
      tx.transaction.findFirst.mockResolvedValue(makeTransaction());
      tx.account.findFirst.mockResolvedValue(makeAccount({ id: OTHER_ACCOUNT_ID }));

      await service.update(USER_ID, 'transaction-1', { accountId: OTHER_ACCOUNT_ID });

      expect(tx.account.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: ACCOUNT_ID },
          data: { balance: { increment: new Prisma.Decimal('-500') } },
        }),
      );
      expect(tx.account.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: OTHER_ACCOUNT_ID },
          data: { balance: { increment: new Prisma.Decimal('500') } },
        }),
      );
    });

    it('no permite asignar una categoría de tipo incompatible', async () => {
      tx.transaction.findFirst.mockResolvedValue(makeTransaction());
      tx.category.findFirst.mockResolvedValue({ id: CATEGORY_ID, type: 'EXPENSE' });

      await expect(
        service.update(USER_ID, 'transaction-1', { categoryId: CATEGORY_ID }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('remove', () => {
    it('aplica soft delete y revierte el saldo del movimiento confirmado', async () => {
      tx.transaction.findFirst.mockResolvedValue(makeTransaction());

      await service.remove(USER_ID, 'transaction-1');

      expect(tx.transaction.update).toHaveBeenCalledWith({
        where: { id: 'transaction-1' },
        data: { deletedAt: NOW },
      });
      expect(tx.account.update.mock.calls[0][0].data.balance.increment.toString()).toBe('-500');
    });

    it('no altera el saldo de un movimiento pendiente', async () => {
      tx.transaction.findFirst.mockResolvedValue(makeTransaction({ status: 'PENDING' }));

      await service.remove(USER_ID, 'transaction-1');

      expect(tx.account.update).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('restaura un movimiento confirmado y aplica su efecto al balance', async () => {
      tx.transaction.findFirst.mockResolvedValue(makeTransaction({ deletedAt: NOW }));

      const result = await service.restore(USER_ID, 'transaction-1');

      expect(result.id).toBe('transaction-1');
      expect(tx.transaction.update).toHaveBeenCalledWith({
        where: { id: 'transaction-1' },
        data: { deletedAt: null },
      });
      expect(tx.account.update.mock.calls[0][0].data.balance.increment.toString()).toBe('500');
    });

    it.each([
      [makeAccount({ deletedAt: NOW }), 'eliminada'],
      [makeAccount({ archived: true }), 'archivada'],
    ])('rechaza restaurar con cuenta %s', async (account) => {
      tx.transaction.findFirst.mockResolvedValue(makeTransaction({ deletedAt: NOW }));
      tx.account.findFirst.mockResolvedValue(account);

      await expect(service.restore(USER_ID, 'transaction-1')).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(tx.transaction.update).not.toHaveBeenCalled();
    });
  });

  it('mantiene la consistencia del balance en operaciones mixtas', async () => {
    let balance = new Prisma.Decimal('1000.00');
    tx.account.update.mockImplementation(({ data }) => {
      balance = balance.plus(data.balance.increment);
      return Promise.resolve(makeAccount({ balance }));
    });
    tx.transaction.create
      .mockImplementationOnce(({ data }) => Promise.resolve(makeTransaction(data)))
      .mockImplementationOnce(({ data }) => Promise.resolve(makeTransaction(data)));
    tx.transaction.findFirst
      .mockResolvedValueOnce(makeTransaction({ amount: new Prisma.Decimal('100') }))
      .mockResolvedValueOnce(
        makeTransaction({
          id: 'transaction-2',
          type: 'EXPENSE',
          amount: new Prisma.Decimal('50'),
        }),
      );
    tx.transaction.update.mockImplementationOnce(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(
        makeTransaction({
          id: 'transaction-2',
          type: 'EXPENSE',
          amount: new Prisma.Decimal('50'),
          ...data,
        }),
      ),
    );

    await service.create(USER_ID, {
      accountId: ACCOUNT_ID,
      type: AllowedTransactionType.INCOME,
      amount: '100',
      date: '2026-10-15T10:00:00-05:00',
    });
    await service.create(USER_ID, {
      accountId: ACCOUNT_ID,
      type: AllowedTransactionType.EXPENSE,
      amount: '50',
      date: '2026-10-15T10:00:00-05:00',
    });
    await service.remove(USER_ID, 'transaction-1');
    await service.update(USER_ID, 'transaction-2', {
      status: TransactionStatusDto.CANCELLED,
    });

    expect(balance.toFixed(2)).toBe('1000.00');
  });
});
