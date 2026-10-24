import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto';
import { TransfersService } from './transfers.service';

const USER_ID = 'user-1';
const ORIGIN_ID = '550e8400-e29b-41d4-a716-446655440000';
const DESTINATION_ID = '550e8400-e29b-41d4-a716-446655440001';
const TRANSFER_ID = '550e8400-e29b-41d4-a716-446655440002';
const NOW = new Date('2026-10-15T15:00:00.000Z');

type AccountMock = {
  findFirst: jest.Mock;
  update: jest.Mock;
};

type TransactionMock = {
  create: jest.Mock;
  findMany: jest.Mock;
  updateMany: jest.Mock;
};

type TransactionClientMock = {
  account: AccountMock;
  transaction: TransactionMock;
};

function makeAccount(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    userId: USER_ID,
    currency: 'PEN',
    archived: false,
    deletedAt: null,
    ...overrides,
  };
}

function makeLeg(direction: 'IN' | 'OUT', overrides: Record<string, unknown> = {}) {
  const isOrigin = direction === 'OUT';
  return {
    id: isOrigin ? 'origin-leg' : 'destination-leg',
    userId: USER_ID,
    accountId: isOrigin ? ORIGIN_ID : DESTINATION_ID,
    counterpartAccountId: isOrigin ? DESTINATION_ID : ORIGIN_ID,
    type: TransactionType.TRANSFER,
    direction,
    amount: new Prisma.Decimal('300.00'),
    currency: 'PEN',
    description: 'Ahorro mensual',
    date: NOW,
    status: TransactionStatus.CONFIRMED,
    transferId: TRANSFER_ID,
    ...overrides,
  };
}

describe('TransfersService', () => {
  let service: TransfersService;
  let prisma: TransactionClientMock & { $transaction: jest.Mock };
  let tx: TransactionClientMock;
  let accountBalances: Map<string, Prisma.Decimal>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    accountBalances = new Map([
      [ORIGIN_ID, new Prisma.Decimal('1000.00')],
      [DESTINATION_ID, new Prisma.Decimal('1000.00')],
    ]);

    tx = {
      account: {
        findFirst: jest
          .fn()
          .mockImplementation(({ where }: { where: { id: string } }) =>
            Promise.resolve(
              where.id === ORIGIN_ID ? makeAccount(ORIGIN_ID) : makeAccount(DESTINATION_ID),
            ),
          ),
        update: jest
          .fn()
          .mockImplementation(
            ({
              where,
              data,
            }: {
              where: { id: string };
              data: { balance: { increment: Prisma.Decimal } };
            }) => {
              const balance = accountBalances.get(where.id) ?? new Prisma.Decimal(0);
              accountBalances.set(where.id, balance.plus(data.balance.increment));
              return Promise.resolve({ id: where.id });
            },
          ),
      },
      transaction: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: data.direction === 'OUT' ? 'origin-leg' : 'destination-leg',
            ...data,
          }),
        ),
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    prisma = {
      ...tx,
      $transaction: jest
        .fn()
        .mockImplementation((operation: (transaction: TransactionClientMock) => Promise<unknown>) =>
          operation(tx),
        ),
    };
    service = new TransfersService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const dto: CreateTransferDto = {
    originAccountId: ORIGIN_ID,
    destinationAccountId: DESTINATION_ID,
    amount: '300.00',
    description: 'Ahorro mensual',
    date: '2026-10-15T10:00:00-05:00',
  };

  describe('create', () => {
    it('crea dos patas enlazadas con direction y actualiza ambos balances', async () => {
      const result = await service.create(USER_ID, dto);
      const originData = tx.transaction.create.mock.calls[0][0].data;
      const destinationData = tx.transaction.create.mock.calls[1][0].data;

      expect(result).toMatchObject({
        transferId: originData.transferId,
        origin: { direction: 'OUT', amount: '300.00' },
        destination: { direction: 'IN', amount: '300.00' },
      });
      expect(originData).toMatchObject({
        userId: USER_ID,
        accountId: ORIGIN_ID,
        counterpartAccountId: DESTINATION_ID,
        type: TransactionType.TRANSFER,
        direction: 'OUT',
        status: TransactionStatus.CONFIRMED,
        currency: 'PEN',
      });
      expect(destinationData).toMatchObject({
        userId: USER_ID,
        accountId: DESTINATION_ID,
        counterpartAccountId: ORIGIN_ID,
        type: TransactionType.TRANSFER,
        direction: 'IN',
        status: TransactionStatus.CONFIRMED,
        currency: 'PEN',
      });
      expect(destinationData.transferId).toBe(originData.transferId);
      expect(tx.account.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: ORIGIN_ID },
          data: { balance: { increment: new Prisma.Decimal('-300') } },
        }),
      );
      expect(tx.account.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: DESTINATION_ID },
          data: { balance: { increment: new Prisma.Decimal('300') } },
        }),
      );
      expect(accountBalances.get(ORIGIN_ID)?.toFixed(2)).toBe('700.00');
      expect(accountBalances.get(DESTINATION_ID)?.toFixed(2)).toBe('1300.00');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rechaza cuentas iguales con 422', async () => {
      await expect(
        service.create(USER_ID, { ...dto, destinationAccountId: ORIGIN_ID }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([
      ['origen', ORIGIN_ID],
      ['destino', DESTINATION_ID],
    ])('responde 404 si la cuenta %s no existe o no pertenece al usuario', async (_, id) => {
      tx.account.findFirst.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === id ? null : makeAccount(where.id)),
      );

      await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.transaction.create).not.toHaveBeenCalled();
    });

    it('responde 400 si alguna cuenta está archivada', async () => {
      tx.account.findFirst.mockResolvedValueOnce(makeAccount(ORIGIN_ID, { archived: true }));

      await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.transaction.create).not.toHaveBeenCalled();
    });

    it('responde 404 si alguna cuenta está eliminada', async () => {
      tx.account.findFirst.mockResolvedValueOnce(makeAccount(ORIGIN_ID, { deletedAt: NOW }));

      await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('responde 422 si las monedas son distintas', async () => {
      tx.account.findFirst.mockResolvedValueOnce(makeAccount(ORIGIN_ID, { currency: 'PEN' }));
      tx.account.findFirst.mockResolvedValueOnce(makeAccount(DESTINATION_ID, { currency: 'USD' }));

      await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(tx.transaction.create).not.toHaveBeenCalled();
    });

    it.each(['0', '-10'])('responde 400 para amount %s', async (amount) => {
      await expect(service.create(USER_ID, { ...dto, amount })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('responde 400 para una fecha futura', async () => {
      await expect(
        service.create(USER_ID, { ...dto, date: '2099-01-01T00:00:00-05:00' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('revierte ambos balances y borra ambas patas dentro de la misma transacción', async () => {
      accountBalances.set(ORIGIN_ID, new Prisma.Decimal('700.00'));
      accountBalances.set(DESTINATION_ID, new Prisma.Decimal('1300.00'));
      tx.transaction.findMany.mockResolvedValue([makeLeg('OUT'), makeLeg('IN')]);

      await service.remove(USER_ID, TRANSFER_ID);

      expect(tx.account.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: ORIGIN_ID },
          data: { balance: { increment: new Prisma.Decimal('300') } },
        }),
      );
      expect(tx.account.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: DESTINATION_ID },
          data: { balance: { increment: new Prisma.Decimal('-300') } },
        }),
      );
      expect(tx.transaction.updateMany).toHaveBeenCalledWith({
        where: { transferId: TRANSFER_ID, userId: USER_ID, deletedAt: null },
        data: { deletedAt: NOW },
      });
      expect(accountBalances.get(ORIGIN_ID)?.toFixed(2)).toBe('1000.00');
      expect(accountBalances.get(DESTINATION_ID)?.toFixed(2)).toBe('1000.00');
    });

    const invalidLegSets: Array<{ description: string; legs: ReturnType<typeof makeLeg>[] }> = [
      { description: 'ninguna pata', legs: [] },
      { description: 'una pata', legs: [makeLeg('OUT')] },
      { description: 'más de dos patas', legs: [makeLeg('OUT'), makeLeg('IN'), makeLeg('IN')] },
    ];
    it.each(invalidLegSets)(
      'responde 404 si hay $description',
      async ({ legs }) => {
        tx.transaction.findMany.mockResolvedValue(legs);

        await expect(service.remove(USER_ID, TRANSFER_ID)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(tx.account.update).not.toHaveBeenCalled();
        expect(tx.transaction.updateMany).not.toHaveBeenCalled();
      },
    );

    it('responde 404 sin tocar balances si las dos patas no tienen directions complementarias', async () => {
      tx.transaction.findMany.mockResolvedValue([
        makeLeg('OUT'),
        makeLeg('OUT', { id: 'duplicate-out' }),
      ]);

      await expect(service.remove(USER_ID, TRANSFER_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.account.update).not.toHaveBeenCalled();
      expect(tx.transaction.updateMany).not.toHaveBeenCalled();
    });

    it('responde 404 sin tocar balances si otra operación ya borró las patas', async () => {
      tx.transaction.findMany.mockResolvedValue([makeLeg('OUT'), makeLeg('IN')]);
      tx.transaction.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.remove(USER_ID, TRANSFER_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.account.update).not.toHaveBeenCalled();
    });
  });

  it('mantiene la consistencia de balances tras crear y borrar una transferencia', async () => {
    const initialOrigin = new Prisma.Decimal('1000');
    const initialDestination = new Prisma.Decimal('1000');
    const created = await service.create(USER_ID, dto);
    const originAfterCreate = accountBalances.get(ORIGIN_ID)!;
    const destinationAfterCreate = accountBalances.get(DESTINATION_ID)!;

    tx.transaction.findMany.mockResolvedValue([makeLeg('OUT'), makeLeg('IN')]);
    await service.remove(USER_ID, created.transferId);

    const originNetTransfer = new Prisma.Decimal('300').negated();
    const destinationNetTransfer = new Prisma.Decimal('300');
    expect(originAfterCreate.toFixed(2)).toBe(initialOrigin.plus(originNetTransfer).toFixed(2));
    expect(destinationAfterCreate.toFixed(2)).toBe(
      initialDestination.plus(destinationNetTransfer).toFixed(2),
    );
    expect(accountBalances.get(ORIGIN_ID)?.toFixed(2)).toBe(initialOrigin.toFixed(2));
    expect(accountBalances.get(DESTINATION_ID)?.toFixed(2)).toBe(initialDestination.toFixed(2));
  });
});
