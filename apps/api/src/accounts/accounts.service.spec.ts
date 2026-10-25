import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AccountType, Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';
import { AccountsService } from './accounts.service';

const account = {
  id: 'account-1',
  userId: 'user-1',
  name: 'Ahorros',
  type: AccountType.BANK,
  currency: 'PEN',
  initialBalance: new Prisma.Decimal('1000.00'),
  balance: new Prisma.Decimal('1000.00'),
  archived: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  deletedAt: null,
};

const createDto: CreateAccountDto = {
  name: 'Ahorros',
  type: AccountType.BANK,
  initialBalance: '1000.00',
};

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: {
    account: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    transaction: {
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    const transactionClient = {
      account: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };
    prisma = {
      ...transactionClient,
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [AccountsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(AccountsService);
  });

  describe('findAll', () => {
    it('por defecto filtra cuentas activas y no archivadas', async () => {
      prisma.account.findMany.mockResolvedValue([account]);

      const result = await service.findAll('user-1');

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null, archived: false },
        orderBy: { createdAt: 'desc' },
      });
      expect(result[0]).toMatchObject({
        id: 'account-1',
        initialBalance: '1000.00',
        balance: '1000.00',
      });
    });

    it('filtra las cuentas archivadas cuando archived=true', async () => {
      prisma.account.findMany.mockResolvedValue([]);

      await service.findAll('user-1', true);

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null, archived: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('incluye borradas cuando includeDeleted=true', async () => {
      prisma.account.findMany.mockResolvedValue([]);

      await service.findAll('user-1', false, true);

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', archived: false },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('crea una cuenta con balance inicial exacto y default PEN', async () => {
      prisma.account.findFirst.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue(account);

      const result = await service.create('user-1', createDto);
      const createCall = prisma.account.create.mock.calls[0][0];

      expect(createCall.data).toMatchObject({
        userId: 'user-1',
        name: 'Ahorros',
        type: AccountType.BANK,
        currency: 'PEN',
      });
      expect(createCall.data.initialBalance.toString()).toBe('1000');
      expect(createCall.data.balance.toString()).toBe('1000');
      expect(result.initialBalance).toBe('1000.00');
      expect(result.balance).toBe('1000.00');
      expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('usa la moneda opcional indicada', async () => {
      prisma.account.findFirst.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue({ ...account, currency: 'USD' });

      const result = await service.create('user-1', {
        ...createDto,
        currency: 'USD',
      });

      expect(prisma.account.create.mock.calls[0][0].data.currency).toBe('USD');
      expect(result.currency).toBe('USD');
    });

    it('rechaza un nombre activo duplicado con 409', async () => {
      prisma.account.findFirst.mockResolvedValue({ id: 'account-existing' });

      await expect(service.create('user-1', createDto)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.account.create).not.toHaveBeenCalled();
    });

    it('convierte P2002 durante la creación en 409', async () => {
      prisma.account.findFirst.mockResolvedValue(null);
      prisma.account.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique constraint', {
          code: 'P2002',
          clientVersion: '6.19.3',
          meta: { target: ['user_id', 'name'] },
        }),
      );

      await expect(service.create('user-1', createDto)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('rechaza un saldo inicial no decimal con 400', async () => {
      await expect(
        service.create('user-1', { ...createDto, initialBalance: '-100' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.account.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('devuelve una cuenta activa del usuario', async () => {
      prisma.account.findFirst.mockResolvedValue(account);

      await expect(service.findOne('user-1', 'account-1')).resolves.toMatchObject({
        id: 'account-1',
        balance: '1000.00',
      });
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'account-1', userId: 'user-1', deletedAt: null },
      });
    });

    it('responde 404 si la cuenta no existe o pertenece a otro usuario', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(service.findOne('another-user', 'account-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'account-1',
          userId: 'another-user',
          deletedAt: null,
        },
      });
    });
  });

  describe('update', () => {
    it('actualiza solo los campos permitidos', async () => {
      prisma.account.findFirst.mockResolvedValueOnce(account).mockResolvedValueOnce(null);
      prisma.account.update.mockResolvedValue({
        ...account,
        name: 'Efectivo',
        type: AccountType.CASH,
        archived: true,
      });

      const dto: UpdateAccountDto = {
        name: 'Efectivo',
        type: AccountType.CASH,
        archived: true,
      };
      const result = await service.update('user-1', 'account-1', dto);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { name: 'Efectivo', type: AccountType.CASH, archived: true },
      });
      expect(result).toMatchObject({
        name: 'Efectivo',
        type: AccountType.CASH,
        archived: true,
      });
    });

    it('rechaza un nombre existente', async () => {
      prisma.account.findFirst
        .mockResolvedValueOnce(account)
        .mockResolvedValueOnce({ id: 'account-2' });

      await expect(
        service.update('user-1', 'account-1', { name: 'Otra cuenta' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('responde 404 si la cuenta no es del usuario', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.update('another-user', 'account-1', { archived: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('aplica soft delete si no hay movimientos confirmados', async () => {
      prisma.account.findFirst.mockResolvedValue({ id: 'account-1' });
      prisma.transaction.count.mockResolvedValue(0);
      prisma.account.update.mockResolvedValue(account);

      await expect(service.remove('user-1', 'account-1')).resolves.toBeUndefined();
      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: {
          accountId: 'account-1',
          status: 'CONFIRMED',
          deletedAt: null,
        },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('rechaza borrar con movimientos confirmados', async () => {
      prisma.account.findFirst.mockResolvedValue({ id: 'account-1' });
      prisma.transaction.count.mockResolvedValue(1);

      await expect(service.remove('user-1', 'account-1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('responde 404 si la cuenta no existe', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'account-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('restore', () => {
    it('restaura una cuenta borrada', async () => {
      prisma.account.findFirst
        .mockResolvedValueOnce({ ...account, deletedAt: new Date() })
        .mockResolvedValueOnce(null);
      prisma.account.update.mockResolvedValue(account);

      const result = await service.restore('user-1', 'account-1');

      expect(prisma.account.findFirst).toHaveBeenNthCalledWith(1, {
        where: { id: 'account-1', userId: 'user-1', deletedAt: { not: null } },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { deletedAt: null },
      });
      expect(result.id).toBe('account-1');
    });

    it('responde 404 si no encuentra una cuenta borrada', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(service.restore('user-1', 'account-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('responde 409 si hay conflicto de nombre al restaurar', async () => {
      prisma.account.findFirst
        .mockResolvedValueOnce({ ...account, deletedAt: new Date() })
        .mockResolvedValueOnce({ id: 'account-2' });

      await expect(service.restore('user-1', 'account-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('convierte P2002 durante restauración en 409', async () => {
      prisma.account.findFirst
        .mockResolvedValueOnce({ ...account, deletedAt: new Date() })
        .mockResolvedValueOnce(null);
      prisma.account.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique constraint', {
          code: 'P2002',
          clientVersion: '6.19.3',
          meta: { target: ['user_id', 'name'] },
        }),
      );

      await expect(service.restore('user-1', 'account-1')).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('recalculate', () => {
    it('ejecuta la búsqueda, agregación y actualización dentro de una transacción', async () => {
      prisma.account.findFirst.mockResolvedValue(account);
      prisma.transaction.groupBy.mockResolvedValue([]);
      prisma.account.update.mockResolvedValue(account);

      await service.recalculate('user-1', 'account-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'account-1', userId: 'user-1', deletedAt: null },
      });
      expect(prisma.transaction.groupBy).toHaveBeenCalled();
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { balance: new Prisma.Decimal('1000') },
      });
    });

    it('conserva saldo inicial si no hay movimientos confirmados', async () => {
      prisma.account.findFirst.mockResolvedValue(account);
      prisma.transaction.groupBy.mockResolvedValue([]);
      prisma.account.update.mockResolvedValue(account);

      const result = await service.recalculate('user-1', 'account-1');

      expect(prisma.transaction.groupBy).toHaveBeenCalledWith({
        by: ['type', 'direction'],
        where: {
          accountId: 'account-1',
          status: 'CONFIRMED',
          deletedAt: null,
          type: { in: ['INCOME', 'EXPENSE', 'TRANSFER'] },
        },
        _sum: { amount: true },
      });
      expect(prisma.account.update.mock.calls[0][0].data.balance.toString()).toBe('1000');
      expect(result).toMatchObject({
        id: 'account-1',
        balance: '1000.00',
      });
      expect(new Date(result.recalculatedAt).toISOString()).toBe(result.recalculatedAt);
    });

    it('suma income y resta expense con precisión Decimal', async () => {
      prisma.account.findFirst.mockResolvedValue(account);
      prisma.transaction.groupBy.mockResolvedValue([
        {
          type: 'INCOME',
          _sum: { amount: new Prisma.Decimal('500.25') },
        },
        {
          type: 'EXPENSE',
          _sum: { amount: new Prisma.Decimal('100.10') },
        },
      ]);
      prisma.account.update.mockResolvedValue({
        ...account,
        balance: new Prisma.Decimal('1400.15'),
      });

      const result = await service.recalculate('user-1', 'account-1');

      expect(prisma.account.update.mock.calls[0][0].data.balance.toString()).toBe('1400.15');
      expect(result.balance).toBe('1400.15');
    });

    it('incluye transferencias IN y OUT en el saldo recalculado', async () => {
      prisma.account.findFirst.mockResolvedValue(account);
      prisma.transaction.groupBy.mockResolvedValue([
        { type: 'INCOME', _sum: { amount: null } },
        {
          type: 'TRANSFER',
          direction: 'OUT',
          _sum: { amount: new Prisma.Decimal('300') },
        },
        {
          type: 'TRANSFER',
          direction: 'IN',
          _sum: { amount: new Prisma.Decimal('200') },
        },
      ]);
      prisma.account.update.mockResolvedValue(account);

      const result = await service.recalculate('user-1', 'account-1');

      expect(result.balance).toBe('900.00');
      expect(prisma.transaction.groupBy).toHaveBeenCalledWith({
        by: ['type', 'direction'],
        where: {
          accountId: 'account-1',
          status: 'CONFIRMED',
          deletedAt: null,
          type: { in: ['INCOME', 'EXPENSE', 'TRANSFER'] },
        },
        _sum: { amount: true },
      });
    });

    it('mantiene consistencia con ingresos, egresos y transferencias', async () => {
      prisma.account.findFirst.mockResolvedValue(account);
      prisma.transaction.groupBy.mockResolvedValue([
        {
          type: 'INCOME',
          direction: null,
          _sum: { amount: new Prisma.Decimal('500') },
        },
        {
          type: 'EXPENSE',
          direction: null,
          _sum: { amount: new Prisma.Decimal('100') },
        },
        {
          type: 'TRANSFER',
          direction: 'IN',
          _sum: { amount: new Prisma.Decimal('200') },
        },
        {
          type: 'TRANSFER',
          direction: 'OUT',
          _sum: { amount: new Prisma.Decimal('300') },
        },
      ]);
      prisma.account.update.mockResolvedValue(account);

      const result = await service.recalculate('user-1', 'account-1');

      expect(result.balance).toBe('1300.00');
      const groupByWhere = prisma.transaction.groupBy.mock.calls[0][0].where;
      expect(groupByWhere.type.in).toEqual(['INCOME', 'EXPENSE', 'TRANSFER']);
    });

    it('responde 404 para cuentas inexistentes o ajenas', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(service.recalculate('another-user', 'account-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.transaction.groupBy).not.toHaveBeenCalled();
    });
  });
});
