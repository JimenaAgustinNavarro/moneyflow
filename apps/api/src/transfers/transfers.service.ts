import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, Transfer, TransferStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto, TransferQueryDto, UpdateTransferDto } from './dto';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(transfer: Transfer) {
    return {
      id: transfer.id,
      originAccountId: transfer.originAccountId,
      destinationAccountId: transfer.destinationAccountId,
      amount: transfer.amount.toFixed(2),
      currency: transfer.currency,
      description: transfer.description,
      occurredAt: transfer.occurredAt.toISOString(),
      status: transfer.status,
      cancelledAt: transfer.cancelledAt?.toISOString() ?? null,
      createdAt: transfer.createdAt.toISOString(),
      updatedAt: transfer.updatedAt.toISOString(),
    };
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

  private queryDateBoundary(dateValue: string, endOfDay: boolean): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return new Date(dateValue);
    }

    const date = new Date(`${dateValue}T00:00:00.000-05:00`);
    if (endOfDay) {
      date.setUTCDate(date.getUTCDate() + 1);
      date.setTime(date.getTime() - 1);
    }
    return date;
  }

  private async validateAccount(
    tx: Prisma.TransactionClient,
    userId: string,
    accountId: string,
    role: 'origen' | 'destino',
  ) {
    const account = await tx.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account || account.deletedAt !== null) {
      throw new NotFoundException(`Cuenta ${role} no encontrada.`);
    }
    if (account.archived) {
      throw new BadRequestException(`No puedes usar una cuenta ${role} archivada.`);
    }
    return account;
  }

  async create(userId: string, dto: CreateTransferDto) {
    if (dto.originAccountId === dto.destinationAccountId) {
      throw new UnprocessableEntityException(
        'Las cuentas de origen y destino deben ser distintas.',
      );
    }

    const amount = this.parseAmount(dto.amount);
    const occurredAt = this.validateDate(dto.date);

    const transfer = await this.prisma.$transaction(async (tx) => {
      const origin = await this.validateAccount(tx, userId, dto.originAccountId, 'origen');
      const destination = await this.validateAccount(
        tx,
        userId,
        dto.destinationAccountId,
        'destino',
      );
      if (origin.currency !== destination.currency) {
        throw new UnprocessableEntityException('Las cuentas deben tener la misma moneda.');
      }

      return tx.transfer.create({
        data: {
          userId,
          originAccountId: origin.id,
          destinationAccountId: destination.id,
          amount,
          currency: origin.currency,
          description: dto.description ?? null,
          occurredAt,
          status: TransferStatus.CONFIRMED,
        },
      });
    });

    return this.serialize(transfer);
  }

  async findAll(userId: string, query: TransferQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = query.from ? this.queryDateBoundary(query.from, false) : undefined;
    const to = query.to ? this.queryDateBoundary(query.to, true) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException('El rango de fechas no es válido.');
    }

    const where: Prisma.TransferWhereInput = {
      userId,
      ...(query.includeCancelled !== 'true' ? { status: TransferStatus.CONFIRMED } : {}),
      ...(query.accountId && {
        OR: [{ originAccountId: query.accountId }, { destinationAccountId: query.accountId }],
      }),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const [total, transfers] = await this.prisma.$transaction([
      this.prisma.transfer.count({ where }),
      this.prisma.transfer.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: transfers.map((transfer) => this.serialize(transfer)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(userId: string, id: string) {
    const transfer = await this.prisma.transfer.findFirst({ where: { id, userId } });
    if (!transfer) {
      throw new NotFoundException('Transferencia no encontrada.');
    }
    return this.serialize(transfer);
  }

  async update(userId: string, id: string, dto: UpdateTransferDto) {
    const transfer = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.transfer.findFirst({ where: { id, userId } });
      if (!existing) {
        throw new NotFoundException('Transferencia no encontrada.');
      }
      if (existing.status !== TransferStatus.CONFIRMED) {
        throw new ConflictException('Solo se pueden editar transferencias confirmadas.');
      }

      const originAccountId = dto.originAccountId ?? existing.originAccountId;
      const destinationAccountId = dto.destinationAccountId ?? existing.destinationAccountId;
      if (originAccountId === destinationAccountId) {
        throw new UnprocessableEntityException(
          'Las cuentas de origen y destino deben ser distintas.',
        );
      }

      const origin = await this.validateAccount(tx, userId, originAccountId, 'origen');
      const destination = await this.validateAccount(tx, userId, destinationAccountId, 'destino');
      if (origin.currency !== destination.currency) {
        throw new UnprocessableEntityException('Las cuentas deben tener la misma moneda.');
      }

      return tx.transfer.update({
        where: { id },
        data: {
          originAccountId,
          destinationAccountId,
          amount: dto.amount === undefined ? existing.amount : this.parseAmount(dto.amount),
          occurredAt: dto.date === undefined ? existing.occurredAt : this.validateDate(dto.date),
          description: dto.description === undefined ? existing.description : dto.description,
          currency: origin.currency,
        },
      });
    });

    return this.serialize(transfer);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findFirst({ where: { id, userId } });
      if (!transfer) {
        throw new NotFoundException('Transferencia no encontrada.');
      }
      if (transfer.status !== TransferStatus.CONFIRMED) {
        throw new ConflictException('Solo se pueden cancelar transferencias confirmadas.');
      }

      await tx.transfer.update({
        where: { id },
        data: { status: TransferStatus.CANCELLED, cancelledAt: new Date() },
      });
    });
  }
}
