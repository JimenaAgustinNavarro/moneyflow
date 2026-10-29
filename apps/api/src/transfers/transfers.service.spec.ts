import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, TransferStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto, TransferQueryDto } from './dto';
import { TransfersService } from './transfers.service';

const USER_ID = 'user-1';
const ORIGIN_ID = '550e8400-e29b-41d4-a716-446655440000';
const DESTINATION_ID = '550e8400-e29b-41d4-a716-446655440001';
const TRANSFER_ID = '550e8400-e29b-41d4-a716-446655440002';
const NOW = new Date('2026-10-15T15:00:00.000Z');

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

function makeTransfer(overrides: Record<string, unknown> = {}) {
  return {
    id: TRANSFER_ID,
    userId: USER_ID,
    originAccountId: ORIGIN_ID,
    destinationAccountId: DESTINATION_ID,
    amount: new Prisma.Decimal('300.00'),
    currency: 'PEN',
    description: 'Ahorro mensual',
    occurredAt: NOW,
    status: TransferStatus.CONFIRMED,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('TransfersService', () => {
  let service: TransfersService;
  let prisma: {
    account: { findFirst: jest.Mock };
    transfer: {
      create: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let tx: typeof prisma;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    tx = {
      account: {
        findFirst: jest
          .fn()
          .mockImplementation(({ where }: { where: { id: string } }) =>
            Promise.resolve(makeAccount(where.id)),
          ),
      },
      transfer: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(makeTransfer(data))),
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve(makeTransfer({ ...makeTransfer(), ...data, updatedAt: NOW })),
          ),
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
    service = new TransfersService(prisma as unknown as PrismaService);
  });

  afterEach(() => jest.useRealTimers());

  const dto: CreateTransferDto = {
    originAccountId: ORIGIN_ID,
    destinationAccountId: DESTINATION_ID,
    amount: '300.00',
    description: 'Ahorro mensual',
    date: '2026-10-15T10:00:00-05:00',
  };

  it('crea un registro CONFIRMED y devuelve la transferencia serializada', async () => {
    await expect(service.create(USER_ID, dto)).resolves.toMatchObject({
      id: TRANSFER_ID,
      originAccountId: ORIGIN_ID,
      destinationAccountId: DESTINATION_ID,
      amount: '300.00',
      status: 'CONFIRMED',
      cancelledAt: null,
    });
    expect(tx.transfer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        originAccountId: ORIGIN_ID,
        destinationAccountId: DESTINATION_ID,
        amount: new Prisma.Decimal('300'),
        currency: 'PEN',
        status: TransferStatus.CONFIRMED,
      }),
    });
    expect(tx.account.findFirst).toHaveBeenCalledTimes(2);
  });

  it('rechaza cuentas iguales y monedas distintas', async () => {
    await expect(
      service.create(USER_ID, { ...dto, destinationAccountId: ORIGIN_ID }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    tx.account.findFirst.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(makeAccount(where.id, { currency: where.id === ORIGIN_ID ? 'PEN' : 'USD' })),
    );
    await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rechaza cuenta ajena o archivada', async () => {
    tx.account.findFirst.mockResolvedValueOnce(null);
    await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(NotFoundException);
    tx.account.findFirst.mockResolvedValueOnce(makeAccount(ORIGIN_ID, { archived: true }));
    await expect(service.create(USER_ID, dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza monto cero y fecha futura', async () => {
    await expect(service.create(USER_ID, { ...dto, amount: '0' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.create(USER_ID, { ...dto, date: '2026-10-16T00:00:00Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lista confirmadas por defecto con filtros y paginación', async () => {
    tx.transfer.count.mockResolvedValue(1);
    tx.transfer.findMany.mockResolvedValue([makeTransfer()]);

    const result = await service.findAll(USER_ID, {
      accountId: ORIGIN_ID,
      from: '2026-10-01',
      to: '2026-10-31',
      page: 2,
      limit: 5,
    });

    expect(tx.transfer.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: USER_ID,
        status: 'CONFIRMED',
        OR: [{ originAccountId: ORIGIN_ID }, { destinationAccountId: ORIGIN_ID }],
        occurredAt: {
          gte: new Date('2026-10-01T05:00:00.000Z'),
          lte: new Date('2026-11-01T04:59:59.999Z'),
        },
      }),
      orderBy: { occurredAt: 'desc' },
      skip: 5,
      take: 5,
    });
    expect(result.meta).toEqual({ page: 2, limit: 5, total: 1, totalPages: 1 });
    expect(result.data).toHaveLength(1);
  });

  it('incluye canceladas solo cuando se solicita', async () => {
    tx.transfer.count.mockResolvedValue(0);
    tx.transfer.findMany.mockResolvedValue([]);

    await service.findAll(
      USER_ID,
      Object.assign(new TransferQueryDto(), { includeCancelled: 'true' }),
    );

    expect(tx.transfer.findMany.mock.calls[0][0].where.status).toBeUndefined();
  });

  it('obtiene una transferencia y responde 404 cuando no existe', async () => {
    tx.transfer.findFirst.mockResolvedValue(makeTransfer());
    await expect(service.findOne(USER_ID, TRANSFER_ID)).resolves.toMatchObject({
      id: TRANSFER_ID,
      occurredAt: NOW.toISOString(),
    });
    tx.transfer.findFirst.mockResolvedValue(null);
    await expect(service.findOne(USER_ID, TRANSFER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('actualiza una transferencia confirmada con datos parciales', async () => {
    tx.transfer.findFirst.mockResolvedValue(makeTransfer());
    tx.transfer.update.mockImplementation(({ data }) =>
      Promise.resolve(makeTransfer({ ...makeTransfer(), ...data })),
    );

    await expect(service.update(USER_ID, TRANSFER_ID, { amount: '150.00' })).resolves.toMatchObject(
      {
        amount: '150.00',
        status: 'CONFIRMED',
      },
    );
    expect(tx.transfer.update).toHaveBeenCalledWith({
      where: { id: TRANSFER_ID },
      data: expect.objectContaining({
        amount: new Prisma.Decimal('150'),
        originAccountId: ORIGIN_ID,
        destinationAccountId: DESTINATION_ID,
      }),
    });
  });

  it('rechaza editar transferencias canceladas o ajenas', async () => {
    tx.transfer.findFirst.mockResolvedValue(makeTransfer({ status: TransferStatus.CANCELLED }));
    await expect(service.update(USER_ID, TRANSFER_ID, { amount: '150' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    tx.transfer.findFirst.mockResolvedValue(null);
    await expect(service.update(USER_ID, TRANSFER_ID, { amount: '150' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('cancela una transferencia confirmada y conserva su registro', async () => {
    tx.transfer.findFirst.mockResolvedValue(makeTransfer());
    await service.remove(USER_ID, TRANSFER_ID);

    expect(tx.transfer.update).toHaveBeenCalledWith({
      where: { id: TRANSFER_ID },
      data: { status: TransferStatus.CANCELLED, cancelledAt: NOW },
    });
  });

  it('rechaza cancelar dos veces', async () => {
    tx.transfer.findFirst.mockResolvedValue(makeTransfer({ status: TransferStatus.CANCELLED }));
    await expect(service.remove(USER_ID, TRANSFER_ID)).rejects.toBeInstanceOf(ConflictException);
  });
});
