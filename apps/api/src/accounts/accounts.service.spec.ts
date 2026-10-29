import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AccountType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from './accounts.service';

const now = new Date('2026-10-15T15:00:00.000Z');
const account = {
  id: 'account-1',
  userId: 'user-1',
  name: 'Ahorros',
  type: AccountType.BANK,
  currency: 'PEN',
  initialBalance: new Prisma.Decimal('1000.00'),
  initialBalanceAt: new Date('2026-01-01T00:00:00.000Z'),
  archived: false,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: {
    account: Record<string, jest.Mock>;
    transaction: Record<string, jest.Mock>;
    transfer: Record<string, jest.Mock>;
  };

  beforeEach(() => {
    prisma = {
      account: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(account),
        create: jest.fn().mockResolvedValue(account),
        update: jest.fn().mockResolvedValue(account),
      },
      transaction: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      transfer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new AccountsService(prisma as unknown as PrismaService);
  });

  it('lista cuentas con balance inicial más el ledger confirmado', async () => {
    prisma.account.findMany.mockResolvedValue([account]);
    prisma.transaction.groupBy.mockResolvedValue([
      { type: 'INCOME', _sum: { amount: new Prisma.Decimal('500.25') } },
      { type: 'EXPENSE', _sum: { amount: new Prisma.Decimal('100.10') } },
    ]);
    prisma.transfer.findMany.mockResolvedValue([
      {
        originAccountId: 'account-1',
        destinationAccountId: 'account-2',
        amount: new Prisma.Decimal('50.15'),
      },
      {
        originAccountId: 'account-2',
        destinationAccountId: 'account-1',
        amount: new Prisma.Decimal('20.00'),
      },
    ]);

    await expect(service.findAll('user-1')).resolves.toMatchObject([
      { initialBalance: '1000.00', balance: '1370.00', deletedAt: null },
    ]);
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['type'],
        where: expect.objectContaining({
          accountId: 'account-1',
          status: 'CONFIRMED',
          deletedAt: null,
          occurredAt: { gte: account.initialBalanceAt },
        }),
      }),
    );
    expect(prisma.transfer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          status: 'CONFIRMED',
          cancelledAt: null,
        }),
      }),
    );
  });

  it('crea cuenta sin persistir balance y rechaza saldos iniciales inválidos', async () => {
    prisma.account.findFirst.mockResolvedValue(null);
    await service.create('user-1', {
      name: 'Nueva',
      type: AccountType.BANK,
      initialBalance: '25.50',
    });
    expect(prisma.account.create.mock.calls[0][0].data).toEqual({
      userId: 'user-1',
      name: 'Nueva',
      type: AccountType.BANK,
      currency: 'PEN',
      initialBalance: new Prisma.Decimal('25.50'),
    });

    await expect(
      service.create('user-1', {
        name: 'Inválida',
        type: AccountType.BANK,
        initialBalance: '-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deriva balance en detalle y recalcula sin escribir una columna balance', async () => {
    prisma.transaction.groupBy.mockResolvedValue([
      { type: 'INCOME', _sum: { amount: new Prisma.Decimal('500.00') } },
      { type: 'EXPENSE', _sum: { amount: new Prisma.Decimal('100.00') } },
    ]);
    prisma.transfer.findMany.mockResolvedValue([
      {
        originAccountId: 'account-2',
        destinationAccountId: 'account-1',
        amount: new Prisma.Decimal('200.00'),
      },
      {
        originAccountId: 'account-1',
        destinationAccountId: 'account-3',
        amount: new Prisma.Decimal('300.00'),
        occurredAt: new Date('2025-12-31T23:59:59.000Z'),
      },
    ]);

    await expect(service.findOne('user-1', 'account-1')).resolves.toMatchObject({
      balance: '1300.00',
    });
    await expect(service.recalculate('user-1', 'account-1')).resolves.toMatchObject({
      id: 'account-1',
      balance: '1300.00',
    });
    expect(prisma.account.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ balance: expect.anything() }) }),
    );
    expect(prisma.transfer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          status: 'CONFIRMED',
          cancelledAt: null,
          OR: [{ originAccountId: 'account-1' }, { destinationAccountId: 'account-1' }],
        },
      }),
    );
  });

  it('resta una transferencia confirmada cuando la cuenta es el origen', async () => {
    prisma.transfer.findMany.mockResolvedValue([
      {
        originAccountId: 'account-1',
        destinationAccountId: 'account-2',
        amount: new Prisma.Decimal('50.00'),
      },
    ]);

    await expect(service.recalculate('user-1', 'account-1')).resolves.toMatchObject({
      balance: '950.00',
    });
  });

  it('suma una transferencia confirmada cuando la cuenta es el destino', async () => {
    prisma.transfer.findMany.mockResolvedValue([
      {
        originAccountId: 'account-2',
        destinationAccountId: 'account-1',
        amount: new Prisma.Decimal('50.00'),
      },
    ]);

    await expect(service.recalculate('user-1', 'account-1')).resolves.toMatchObject({
      balance: '1050.00',
    });
  });

  it('no incluye transferencias canceladas al calcular el balance', async () => {
    await expect(service.recalculate('user-1', 'account-1')).resolves.toMatchObject({
      balance: '1000.00',
    });
    expect(prisma.transfer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'CONFIRMED',
          cancelledAt: null,
        }),
      }),
    );
  });

  it('suma ingresos confirmados al balance derivado', async () => {
    prisma.transaction.groupBy.mockResolvedValue([
      { type: 'INCOME', _sum: { amount: new Prisma.Decimal('50.25') } },
    ]);

    await expect(service.recalculate('user-1', 'account-1')).resolves.toMatchObject({
      balance: '1050.25',
    });
  });

  it('resta egresos confirmados del balance derivado', async () => {
    prisma.transaction.groupBy.mockResolvedValue([
      { type: 'EXPENSE', _sum: { amount: new Prisma.Decimal('50.25') } },
    ]);

    await expect(service.recalculate('user-1', 'account-1')).resolves.toMatchObject({
      balance: '949.75',
    });
  });

  it('combina ingresos confirmados y transferencias salientes', async () => {
    prisma.transaction.groupBy.mockResolvedValue([
      { type: 'INCOME', _sum: { amount: new Prisma.Decimal('75.00') } },
    ]);
    prisma.transfer.findMany.mockResolvedValue([
      {
        originAccountId: 'account-1',
        destinationAccountId: 'account-2',
        amount: new Prisma.Decimal('50.00'),
      },
    ]);

    await expect(service.recalculate('user-1', 'account-1')).resolves.toMatchObject({
      balance: '1025.00',
    });
  });

  it('bloquea el borrado lógico si hay una transacción confirmada', async () => {
    prisma.account.findFirst.mockResolvedValue({ id: 'account-1' });
    prisma.transaction.count.mockResolvedValue(1);

    await expect(service.remove('user-1', 'account-1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.transfer.count).toHaveBeenCalled();
    expect(prisma.account.update).not.toHaveBeenCalled();
  });

  it('bloquea el borrado lógico si hay una transferencia confirmada vinculada', async () => {
    prisma.account.findFirst.mockResolvedValue({ id: 'account-1' });
    prisma.transfer.count.mockResolvedValue(1);

    await expect(service.remove('user-1', 'account-1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.transfer.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: 'CONFIRMED',
        OR: [{ originAccountId: 'account-1' }, { destinationAccountId: 'account-1' }],
      },
    });
    expect(prisma.account.update).not.toHaveBeenCalled();
  });

  it('responde 404 al recalcular una cuenta ajena o inexistente', async () => {
    prisma.account.findFirst.mockResolvedValue(null);
    await expect(service.recalculate('another-user', 'account-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
