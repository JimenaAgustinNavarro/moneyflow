import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

type AccountRecord = {
  id: string;
  name: string;
  type: string;
  currency: string;
  initialBalance: Prisma.Decimal;
  balance: Prisma.Decimal;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(account: AccountRecord) {
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      initialBalance: account.initialBalance.toFixed(2),
      balance: account.balance.toFixed(2),
      archived: account.archived,
      deletedAt: account.deletedAt ? account.deletedAt.toISOString() : null,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
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

    return accounts.map((account) => this.serialize(account));
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

    const initialBalance = new Prisma.Decimal(dto.initialBalance);

    try {
      const account = await this.prisma.account.create({
        data: {
          userId,
          name: dto.name,
          type: dto.type,
          currency: dto.currency ?? 'PEN',
          initialBalance,
          balance: initialBalance,
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

    return this.serialize(account);
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
      return this.serialize(updated);
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

    const confirmedCount = await this.prisma.transaction.count({
      where: {
        accountId: id,
        status: 'CONFIRMED',
        deletedAt: null,
      },
    });

    if (confirmedCount > 0) {
      throw new ConflictException(
        'No se puede eliminar una cuenta con movimientos confirmados. Archivala en su lugar.',
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
      return this.serialize(restored);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe otra cuenta activa con el mismo nombre.');
      }
      throw error;
    }
  }

  async recalculate(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id, userId, deletedAt: null },
      });

      if (!account) {
        throw new NotFoundException('Cuenta no encontrada.');
      }

      const groups = await tx.transaction.groupBy({
        by: ['type', 'direction'],
        where: {
          accountId: id,
          status: 'CONFIRMED',
          deletedAt: null,
          type: { in: ['INCOME', 'EXPENSE', 'TRANSFER'] },
        },
        _sum: { amount: true },
      });

      let balance = new Prisma.Decimal(account.initialBalance);
      for (const group of groups) {
        const amount = group._sum.amount ?? new Prisma.Decimal(0);
        if (group.type === 'INCOME') {
          balance = balance.plus(amount);
        } else if (group.type === 'EXPENSE') {
          balance = balance.minus(amount);
        } else if (group.type === 'TRANSFER' && group.direction === 'IN') {
          balance = balance.plus(amount);
        } else if (group.type === 'TRANSFER' && group.direction === 'OUT') {
          balance = balance.minus(amount);
        }
      }

      await tx.account.update({
        where: { id },
        data: { balance },
      });

      return {
        id,
        balance: balance.toFixed(2),
        recalculatedAt: new Date().toISOString(),
      };
    });
  }
}
