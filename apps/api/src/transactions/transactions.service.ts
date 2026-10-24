import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, Transaction, TransactionStatus, TransactionType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  AllowedTransactionType,
  CreateTransactionDto,
  TransactionQueryDto,
  TransactionStatusDto,
  UpdateTransactionDto,
} from './dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(transaction: Transaction) {
    return {
      id: transaction.id,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount.toFixed(2),
      currency: transaction.currency,
      description: transaction.description,
      date: transaction.date.toISOString(),
      status: transaction.status,
      transferId: transaction.transferId,
      counterpartAccountId: transaction.counterpartAccountId,
      obligationId: transaction.obligationId,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  }

  private toTransactionType(type: AllowedTransactionType): TransactionType {
    return type === AllowedTransactionType.INCOME
      ? TransactionType.INCOME
      : TransactionType.EXPENSE;
  }

  private toTransactionStatus(status: TransactionStatusDto): TransactionStatus {
    switch (status) {
      case TransactionStatusDto.PENDING:
        return TransactionStatus.PENDING;
      case TransactionStatusDto.CONFIRMED:
        return TransactionStatus.CONFIRMED;
      case TransactionStatusDto.CANCELLED:
        return TransactionStatus.CANCELLED;
    }
  }

  private parseAmount(amount: string): Prisma.Decimal {
    const decimal = new Prisma.Decimal(amount);
    if (!decimal.isFinite() || decimal.lte(0)) {
      throw new BadRequestException('El monto debe ser mayor a cero.');
    }
    return decimal;
  }

  private validateDate(dateValue: string): Date {
    const date = new Date(dateValue);
    if (date.getTime() > Date.now()) {
      throw new BadRequestException('La fecha no puede ser futura.');
    }
    return date;
  }

  private async validateAccount(tx: Prisma.TransactionClient, userId: string, accountId: string) {
    const account = await tx.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account || account.deletedAt !== null) {
      throw new NotFoundException('Cuenta no encontrada.');
    }
    if (account.archived) {
      throw new BadRequestException(
        'No puedes crear movimientos en una cuenta archivada o eliminada.',
      );
    }
    return account;
  }

  private async validateCategory(
    tx: Prisma.TransactionClient,
    userId: string,
    categoryId: string | null | undefined,
    type: TransactionType,
  ): Promise<void> {
    if (!categoryId) return;

    const category = await tx.category.findFirst({
      where: {
        id: categoryId,
        deletedAt: null,
        OR: [{ userId }, { isSystem: true, userId: null }],
      },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }
    if (category.type !== type) {
      throw new UnprocessableEntityException(
        'El tipo de la categoría no coincide con el tipo del movimiento.',
      );
    }
  }

  private limaDayStart(date: string): Date {
    return new Date(`${date}T00:00:00.000-05:00`);
  }

  private limaDayEnd(date: string): Date {
    const nextDay = this.limaDayStart(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return new Date(nextDay.getTime() - 1);
  }

  private async applyBalanceEffect(
    tx: Prisma.TransactionClient,
    transaction: Pick<Transaction, 'accountId' | 'type' | 'amount' | 'status'>,
    direction: 'apply' | 'revert',
  ): Promise<void> {
    if (transaction.status !== TransactionStatus.CONFIRMED) return;

    let delta: Prisma.Decimal;
    if (transaction.type === TransactionType.INCOME) {
      delta = direction === 'apply' ? transaction.amount : transaction.amount.negated();
    } else if (transaction.type === TransactionType.EXPENSE) {
      delta = direction === 'apply' ? transaction.amount.negated() : transaction.amount;
    } else {
      return;
    }

    await tx.account.update({
      where: { id: transaction.accountId },
      data: { balance: { increment: delta } },
    });
  }

  async findAll(userId: string, query: TransactionQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const includeDeleted = query.includeDeleted === 'true';
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(query.accountId && { accountId: query.accountId }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.type && { type: query.type }),
      ...(query.status && { status: this.toTransactionStatus(query.status) }),
    };

    if (query.from || query.to) {
      const from = query.from ? this.limaDayStart(query.from) : undefined;
      const to = query.to ? this.limaDayEnd(query.to) : undefined;
      if (from && to && from > to) {
        throw new BadRequestException('El rango de fechas no es válido.');
      }
      where.date = {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      };
    }

    const [total, transactions] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: transactions.map((transaction) => this.serialize(transaction)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(userId: string, dto: CreateTransactionDto) {
    const amount = this.parseAmount(dto.amount);
    const date = this.validateDate(dto.date);
    const type = this.toTransactionType(dto.type);
    const status = dto.status ? this.toTransactionStatus(dto.status) : TransactionStatus.CONFIRMED;

    return this.prisma.$transaction(async (tx) => {
      const account = await this.validateAccount(tx, userId, dto.accountId);
      await this.validateCategory(tx, userId, dto.categoryId, type);
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId: dto.accountId,
          categoryId: dto.categoryId ?? null,
          type,
          amount,
          currency: account.currency,
          description: dto.description ?? null,
          date,
          status,
        },
      });
      await this.applyBalanceEffect(tx, transaction, 'apply');
      return this.serialize(transaction);
    });
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!transaction) {
      throw new NotFoundException('Movimiento no encontrado.');
    }
    return this.serialize(transaction);
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException('Movimiento no encontrado.');
      }

      if (
        dto.type !== undefined &&
        dto.type !== existing.type &&
        existing.status === 'CONFIRMED'
      ) {
        throw new ConflictException('No puedes cambiar el tipo de un movimiento confirmado.');
      }

      const type = dto.type !== undefined ? this.toTransactionType(dto.type) : existing.type;
      const categoryId = dto.categoryId !== undefined ? dto.categoryId : existing.categoryId;
      if (dto.categoryId !== undefined || dto.type !== undefined) {
        await this.validateCategory(tx, userId, categoryId, type);
      }

      let accountCurrency: string | undefined;
      if (dto.accountId !== undefined && dto.accountId !== existing.accountId) {
        const account = await this.validateAccount(tx, userId, dto.accountId);
        accountCurrency = account.currency;
      }

      const data: Prisma.TransactionUncheckedUpdateInput = {
        ...(dto.accountId !== undefined && { accountId: dto.accountId }),
        ...(accountCurrency !== undefined && { currency: accountCurrency }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.type !== undefined && { type }),
        ...(dto.amount !== undefined && { amount: this.parseAmount(dto.amount) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.date !== undefined && { date: this.validateDate(dto.date) }),
        ...(dto.status !== undefined && {
          status: this.toTransactionStatus(dto.status),
        }),
      };

      await this.applyBalanceEffect(tx, existing, 'revert');
      const updated = await tx.transaction.update({ where: { id }, data });
      await this.applyBalanceEffect(tx, updated, 'apply');
      return this.serialize(updated);
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!transaction) {
        throw new NotFoundException('Movimiento no encontrado.');
      }

      await this.applyBalanceEffect(tx, transaction, 'revert');
      await tx.transaction.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  async restore(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id, userId, deletedAt: { not: null } },
      });
      if (!transaction) {
        throw new NotFoundException('Movimiento no encontrado o no está eliminado.');
      }

      const account = await tx.account.findFirst({
        where: { id: transaction.accountId, userId },
      });
      if (!account || account.deletedAt !== null) {
        throw new UnprocessableEntityException('La cuenta asociada está eliminada.');
      }
      if (account.archived) {
        throw new UnprocessableEntityException('La cuenta asociada está archivada.');
      }

      const restored = await tx.transaction.update({
        where: { id },
        data: { deletedAt: null },
      });
      await this.applyBalanceEffect(tx, restored, 'apply');
      return this.serialize(restored);
    });
  }
}
