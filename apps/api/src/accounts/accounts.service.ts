import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Account, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(account: Account, balance = account.initialBalance) {
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      initialBalance: account.initialBalance.toFixed(2),
      balance: balance.toFixed(2),
      archived: account.archived,
      deletedAt: account.deletedAt?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  private async calculateBalance(tx: Prisma.TransactionClient, account: Account) {
    const [groups, transfers] = await Promise.all([
      tx.transaction.groupBy({
        by: ['type'],
        where: {
          userId: account.userId,
          accountId: account.id,
          status: 'CONFIRMED',
          deletedAt: null,
          occurredAt: { gte: account.initialBalanceAt },
        },
        _sum: { amount: true },
      }),
      tx.transfer.findMany({
        where: {
          userId: account.userId,
          status: 'CONFIRMED',
          cancelledAt: null,
          OR: [{ originAccountId: account.id }, { destinationAccountId: account.id }],
        },
        select: { originAccountId: true, destinationAccountId: true, amount: true },
      }),
    ]);

    let balance = new Prisma.Decimal(account.initialBalance);
    for (const group of groups) {
      const amount = group._sum.amount ?? new Prisma.Decimal(0);
      balance = group.type === 'INCOME' ? balance.plus(amount) : balance.minus(amount);
    }

    for (const transfer of transfers) {
      if (transfer.originAccountId === account.id) {
        balance = balance.minus(transfer.amount);
      } else if (transfer.destinationAccountId === account.id) {
        balance = balance.plus(transfer.amount);
      }
    }

    return balance;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  async findAll(userId: string, archived?: boolean, includeDeleted = false) {
    const accounts = await this.prisma.account.findMany({
      where: {
        userId,
        ...(includeDeleted ? {} : { deletedAt: null }),
        archived: archived ?? false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      accounts.map(async (account) =>
        this.serialize(account, await this.calculateBalance(this.prisma, account)),
      ),
    );
  }

  async create(userId: string, dto: CreateAccountDto) {
    if (!/^\d+(\.\d{1,2})?$/.test(dto.initialBalance)) {
      throw new BadRequestException(
        'initialBalance debe ser un número decimal con hasta 2 decimales',
      );
    }

    const existing = await this.prisma.account.findFirst({
      where: { userId, name: dto.name, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese nombre.');
    }

    try {
      const account = await this.prisma.account.create({
        data: {
          userId,
          name: dto.name,
          type: dto.type,
          currency: dto.currency ?? 'PEN',
          initialBalance: new Prisma.Decimal(dto.initialBalance),
        },
      });
      return this.serialize(account);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe una cuenta con ese nombre.');
      }
      throw error;
    }
  }

  async findOne(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada.');
    }
    return this.serialize(account, await this.calculateBalance(this.prisma, account));
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada.');
    }

    if (dto.name !== undefined && dto.name !== account.name) {
      const existing = await this.prisma.account.findFirst({
        where: { userId, name: dto.name, deletedAt: null, NOT: { id } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Ya existe una cuenta con ese nombre.');
      }
    }

    try {
      const updated = await this.prisma.account.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.archived !== undefined && { archived: dto.archived }),
        },
      });
      return this.serialize(updated, await this.calculateBalance(this.prisma, updated));
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe una cuenta con ese nombre.');
      }
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada.');
    }

    const [confirmedTransactionCount, confirmedTransferCount] = await Promise.all([
      this.prisma.transaction.count({
        where: { userId, accountId: id, status: 'CONFIRMED', deletedAt: null },
      }),
      this.prisma.transfer.count({
        where: {
          userId,
          status: 'CONFIRMED',
          OR: [{ originAccountId: id }, { destinationAccountId: id }],
        },
      }),
    ]);

    if (confirmedTransactionCount + confirmedTransferCount > 0) {
      throw new ConflictException(
        'No se puede eliminar una cuenta con movimientos confirmados. Archívala en su lugar.',
      );
    }

    await this.prisma.account.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, deletedAt: { not: null } },
    });
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada o no está eliminada.');
    }

    const existing = await this.prisma.account.findFirst({
      where: { userId, name: account.name, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe otra cuenta activa con el mismo nombre.');
    }

    try {
      const restored = await this.prisma.account.update({
        where: { id },
        data: { deletedAt: null },
      });
      return this.serialize(restored, await this.calculateBalance(this.prisma, restored));
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe otra cuenta activa con el mismo nombre.');
      }
      throw error;
    }
  }

  async recalculate(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada.');
    }

    const balance = await this.calculateBalance(this.prisma, account);
    return { id, balance: balance.toFixed(2), recalculatedAt: new Date().toISOString() };
  }
}
