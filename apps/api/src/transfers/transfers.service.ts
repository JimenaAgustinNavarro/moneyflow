import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto, UpdateTransferDto } from './dto';

type SerializedTransaction = {
  id: string;
  transferId: string | null;
  accountId: string;
  counterpartAccountId: string | null;
  type: TransactionType;
  amount: string;
  currency: string;
  date: string;
  status: TransactionStatus;
  direction: string | null;
  description: string | null;
};

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(transaction: {
    id: string;
    transferId: string | null;
    accountId: string;
    counterpartAccountId: string | null;
    type: TransactionType;
    amount: Prisma.Decimal;
    currency: string;
    date: Date;
    status: TransactionStatus;
    direction: string | null;
    description: string | null;
  }): SerializedTransaction {
    return {
      id: transaction.id,
      transferId: transaction.transferId,
      accountId: transaction.accountId,
      counterpartAccountId: transaction.counterpartAccountId,
      type: transaction.type,
      amount: transaction.amount.toFixed(2),
      currency: transaction.currency,
      date: transaction.date.toISOString(),
      status: transaction.status,
      direction: transaction.direction,
      description: transaction.description,
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

  private async applyTransferBalance(
    tx: Prisma.TransactionClient,
    accountId: string,
    delta: Prisma.Decimal,
  ): Promise<void> {
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: delta } },
    });
  }

  async create(userId: string, dto: CreateTransferDto) {
    if (dto.originAccountId === dto.destinationAccountId) {
      throw new UnprocessableEntityException(
        'Las cuentas de origen y destino deben ser distintas.',
      );
    }

    const amount = this.parseAmount(dto.amount);
    const date = this.validateDate(dto.date);

    return this.prisma.$transaction(async (tx) => {
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

      const transferId = randomUUID();
      const description = dto.description ?? null;
      const originLeg = await tx.transaction.create({
        data: {
          userId,
          accountId: origin.id,
          counterpartAccountId: destination.id,
          type: TransactionType.TRANSFER,
          direction: 'OUT',
          amount,
          currency: origin.currency,
          description,
          date,
          status: TransactionStatus.CONFIRMED,
          transferId,
        },
      });
      const destinationLeg = await tx.transaction.create({
        data: {
          userId,
          accountId: destination.id,
          counterpartAccountId: origin.id,
          type: TransactionType.TRANSFER,
          direction: 'IN',
          amount,
          currency: destination.currency,
          description,
          date,
          status: TransactionStatus.CONFIRMED,
          transferId,
        },
      });

      await this.applyTransferBalance(tx, origin.id, amount.negated());
      await this.applyTransferBalance(tx, destination.id, amount);

      return {
        transferId,
        origin: this.serialize(originLeg),
        destination: this.serialize(destinationLeg),
      };
    });
  }

  async update(userId: string, transferId: string, dto: UpdateTransferDto) {
    return this.prisma.$transaction(async (tx) => {
      const legs = await tx.transaction.findMany({
        where: { transferId, userId, deletedAt: null },
      });

      if (legs.length !== 2) {
        throw new NotFoundException('Transferencia no encontrada.');
      }

      const originLeg = legs.find((leg) => leg.direction === 'OUT');
      const destinationLeg = legs.find((leg) => leg.direction === 'IN');
      if (
        !originLeg ||
        !destinationLeg ||
        originLeg.type !== TransactionType.TRANSFER ||
        destinationLeg.type !== TransactionType.TRANSFER ||
        originLeg.status !== TransactionStatus.CONFIRMED ||
        destinationLeg.status !== TransactionStatus.CONFIRMED ||
        originLeg.accountId === destinationLeg.accountId ||
        originLeg.counterpartAccountId !== destinationLeg.accountId ||
        destinationLeg.counterpartAccountId !== originLeg.accountId ||
        !originLeg.amount.equals(destinationLeg.amount) ||
        originLeg.currency !== destinationLeg.currency
      ) {
        throw new NotFoundException('Transferencia inconsistente.');
      }

      await this.applyTransferBalance(tx, originLeg.accountId, originLeg.amount);
      await this.applyTransferBalance(
        tx,
        destinationLeg.accountId,
        destinationLeg.amount.negated(),
      );

      const newOriginId = dto.originAccountId ?? originLeg.accountId;
      const newDestinationId = dto.destinationAccountId ?? destinationLeg.accountId;

      if (newOriginId === newDestinationId) {
        throw new UnprocessableEntityException('Las cuentas deben ser distintas.');
      }

      const newOrigin = await this.validateAccount(tx, userId, newOriginId, 'origen');
      const newDestination = await this.validateAccount(tx, userId, newDestinationId, 'destino');
      if (newOrigin.currency !== newDestination.currency) {
        throw new UnprocessableEntityException('Las cuentas deben tener la misma moneda.');
      }

      const newAmount = dto.amount ? this.parseAmount(dto.amount) : originLeg.amount;
      const newDate = dto.date ? this.validateDate(dto.date) : originLeg.date;
      const newDescription = dto.description !== undefined ? dto.description ?? null : originLeg.description;

      const updatedOrigin = await tx.transaction.update({
        where: { id: originLeg.id },
        data: {
          accountId: newOriginId,
          counterpartAccountId: newDestinationId,
          amount: newAmount,
          date: newDate,
          description: newDescription,
        },
      });

      const updatedDestination = await tx.transaction.update({
        where: { id: destinationLeg.id },
        data: {
          accountId: newDestinationId,
          counterpartAccountId: newOriginId,
          amount: newAmount,
          date: newDate,
          description: newDescription,
        },
      });

      await this.applyTransferBalance(tx, newOriginId, newAmount.negated());
      await this.applyTransferBalance(tx, newDestinationId, newAmount);

      return {
        transferId,
        origin: this.serialize(updatedOrigin),
        destination: this.serialize(updatedDestination),
      };
    });
  }

  async remove(userId: string, transferId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const legs = await tx.transaction.findMany({
        where: { transferId, userId, deletedAt: null },
      });
      if (legs.length !== 2) {
        throw new NotFoundException('Transferencia no encontrada.');
      }

      const originLeg = legs.find((leg) => leg.direction === 'OUT');
      const destinationLeg = legs.find((leg) => leg.direction === 'IN');
      if (
        !originLeg ||
        !destinationLeg ||
        originLeg.type !== TransactionType.TRANSFER ||
        destinationLeg.type !== TransactionType.TRANSFER ||
        originLeg.status !== TransactionStatus.CONFIRMED ||
        destinationLeg.status !== TransactionStatus.CONFIRMED ||
        originLeg.accountId === destinationLeg.accountId ||
        originLeg.counterpartAccountId !== destinationLeg.accountId ||
        destinationLeg.counterpartAccountId !== originLeg.accountId ||
        !originLeg.amount.equals(destinationLeg.amount) ||
        originLeg.currency !== destinationLeg.currency
      ) {
        throw new NotFoundException('Transferencia no encontrada.');
      }

      const deleted = await tx.transaction.updateMany({
        where: { transferId, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (deleted.count !== 2) {
        throw new NotFoundException('Transferencia no encontrada.');
      }

      await this.applyTransferBalance(tx, originLeg.accountId, originLeg.amount);
      await this.applyTransferBalance(
        tx,
        destinationLeg.accountId,
        destinationLeg.amount.negated(),
      );
    });
  }
}
