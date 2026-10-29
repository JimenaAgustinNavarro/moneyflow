import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ObligationPaymentStatus,
  ObligationStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateObligationDto,
  ObligationQueryDto,
  PayObligationDto,
  UpdateObligationDto,
} from './dto';

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

@Injectable()
export class ObligationsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseAmount(amount: string | number | Prisma.Decimal): Prisma.Decimal {
    const decimal = amount instanceof Prisma.Decimal ? amount : new Prisma.Decimal(String(amount));
    if (!decimal.isFinite() || decimal.lte(0)) {
      throw new BadRequestException('El monto debe ser mayor a cero.');
    }
    return decimal;
  }

  private validateDate(value: Date | string): Date {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) throw new BadRequestException('La fecha debe ser válida.');
    return date;
  }

  private toLimaIso(date: Date): string {
    return new Date(date.getTime() - LIMA_OFFSET_MS).toISOString().replace(/Z$/, '-05:00');
  }

  private calculateOverdue(obligation: { status: ObligationStatus; dueDate: Date }): ObligationStatus {
    if (
      (obligation.status === ObligationStatus.PENDING ||
        obligation.status === ObligationStatus.PARTIALLY_PAID ||
        obligation.status === ObligationStatus.OVERDUE) &&
      obligation.dueDate < new Date()
    ) {
      return ObligationStatus.OVERDUE;
    }
    return obligation.status;
  }

  private serialize(obligation: Prisma.ObligationGetPayload<Record<string, never>> & {
    payments?: Prisma.ObligationPaymentGetPayload<Record<string, never>>[];
  }) {
    const status = this.calculateOverdue(obligation);
    return {
      id: obligation.id,
      userId: obligation.userId,
      recurrenceId: obligation.recurrenceId,
      accountId: obligation.accountId,
      categoryId: obligation.categoryId,
      name: obligation.name,
      type: obligation.type,
      amount: obligation.amount.toFixed(2),
      currency: obligation.currency,
      description: obligation.description,
      dueDate: this.toLimaIso(obligation.dueDate),
      status,
      periodStart: obligation.periodStart ? this.toLimaIso(obligation.periodStart) : null,
      periodEnd: obligation.periodEnd ? this.toLimaIso(obligation.periodEnd) : null,
      paidAt: obligation.paidAt ? this.toLimaIso(obligation.paidAt) : null,
      cancelledAt: obligation.cancelledAt ? this.toLimaIso(obligation.cancelledAt) : null,
      createdAt: obligation.createdAt.toISOString(),
      updatedAt: obligation.updatedAt.toISOString(),
      deletedAt: obligation.deletedAt?.toISOString() ?? null,
      ...(obligation.payments && {
        payments: obligation.payments.map((payment) => ({
          id: payment.id,
          amount: payment.amount.toFixed(2),
          paidAt: this.toLimaIso(payment.paidAt),
          status: payment.status,
        })),
      }),
    };
  }

  private async validateAccount(tx: Prisma.TransactionClient, userId: string, accountId: string) {
    const account = await tx.account.findFirst({
      where: { id: accountId, userId, deletedAt: null, archived: false },
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada.');
    return account;
  }

  private async validateCategory(
    tx: Prisma.TransactionClient,
    userId: string,
    categoryId: string | null | undefined,
    type: TransactionType,
  ) {
    if (!categoryId) return;
    const category = await tx.category.findFirst({
      where: { id: categoryId, deletedAt: null, OR: [{ userId }, { isSystem: true, userId: null }] },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada.');
    if (category.type !== type) throw new BadRequestException('El tipo de la categoría no coincide con la obligación.');
  }

  private async validateRecurrence(tx: Prisma.TransactionClient, userId: string, recurrenceId?: string) {
    if (!recurrenceId) return;
    const recurrence = await tx.recurrence.findFirst({ where: { id: recurrenceId, userId, deletedAt: null, active: true } });
    if (!recurrence) throw new NotFoundException('Recurrencia no encontrada.');
    return recurrence;
  }

  async create(userId: string, dto: CreateObligationDto) {
    const amount = this.parseAmount(dto.amount);
    const dueDate = this.validateDate(dto.dueDate);
    const periodStart = dto.periodStart ? this.validateDate(dto.periodStart) : null;
    const periodEnd = dto.periodEnd ? this.validateDate(dto.periodEnd) : null;
    if (periodEnd && periodEnd < dueDate) throw new BadRequestException('El período de la obligación no es válido.');

    return this.prisma.$transaction(async (tx) => {
      await this.validateAccount(tx, userId, dto.accountId);
      await this.validateCategory(tx, userId, dto.categoryId, dto.type);
      await this.validateRecurrence(tx, userId, dto.recurrenceId);
      const obligation = await tx.obligation.create({
        data: {
          userId,
          recurrenceId: dto.recurrenceId ?? null,
          accountId: dto.accountId,
          categoryId: dto.categoryId ?? null,
          name: dto.name,
          type: dto.type,
          amount,
          currency: dto.currency ?? 'PEN',
          description: dto.description ?? null,
          dueDate,
          periodStart,
          periodEnd,
          status: ObligationStatus.PENDING,
        },
      });
      return this.serialize(obligation);
    });
  }

  async findAll(userId: string, query: ObligationQueryDto) {
    const overdue = query.overdue === 'true';
    const where: Prisma.ObligationWhereInput = {
      userId,
      ...(query.includeDeleted !== 'true' && { deletedAt: null }),
      ...(query.status && query.status !== ObligationStatus.OVERDUE && { status: query.status }),
      ...(query.recurrenceId && { recurrenceId: query.recurrenceId }),
      ...(query.accountId && { accountId: query.accountId }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.from && { dueDate: { gte: this.validateDate(query.from) } }),
      ...(query.to && { dueDate: { lte: this.validateDate(query.to) } }),
      ...(overdue && {
        status: { in: [ObligationStatus.PENDING, ObligationStatus.PARTIALLY_PAID] },
        dueDate: { lt: new Date() },
      }),
    };
    const obligations = await this.prisma.obligation.findMany({ where, orderBy: { dueDate: 'asc' } });
    return { data: obligations.map((obligation) => this.serialize(obligation)) };
  }

  async upcoming(userId: string) {
    const obligations = await this.prisma.obligation.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: [ObligationStatus.PENDING, ObligationStatus.PARTIALLY_PAID] },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });
    return { data: obligations.map((obligation) => this.serialize(obligation)) };
  }

  async findOne(userId: string, id: string) {
    const obligation = await this.prisma.obligation.findFirst({
      where: { id, userId, deletedAt: null },
      include: { payments: true },
    });
    if (!obligation) throw new NotFoundException('Obligación no encontrada.');
    return this.serialize(obligation);
  }

  async pay(userId: string, id: string, dto: PayObligationDto) {
    return this.prisma.$transaction(async (tx) => {
      const obligation = await tx.obligation.findFirst({ where: { id, userId }, include: { payments: true } });
      if (!obligation) throw new NotFoundException('Obligación no encontrada.');
      if (
        obligation.status === ObligationStatus.PAID ||
        obligation.status === ObligationStatus.CANCELLED
      ) {
        throw new ConflictException('La obligación ya está pagada o cancelada.');
      }
      await this.validateAccount(tx, userId, dto.accountId);
      const paid = obligation.payments
        .filter((payment) => payment.status !== ObligationPaymentStatus.CANCELLED)
        .reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
      const paymentAmount = dto.amount ? this.parseAmount(dto.amount) : obligation.amount.sub(paid);
      if (paid.add(paymentAmount).gt(obligation.amount)) throw new BadRequestException('El pago excede el monto de la obligación.');
      const paidAt = dto.paidAt ? this.validateDate(dto.paidAt) : new Date();
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId: dto.accountId,
          categoryId: obligation.categoryId,
          type: TransactionType.EXPENSE,
          amount: paymentAmount,
          currency: obligation.currency,
          description: dto.description ?? `Pago de obligación: ${obligation.name}`,
          occurredAt: paidAt,
          status: TransactionStatus.CONFIRMED,
        },
      });
      await tx.obligationPayment.create({
        data: {
          obligationId: obligation.id,
          transactionId: transaction.id,
          amount: paymentAmount,
          paidAt,
          status: ObligationPaymentStatus.CONFIRMED,
        },
      });
      const totalPaid = paid.add(paymentAmount);
      const status = totalPaid.gte(obligation.amount)
        ? ObligationStatus.PAID
        : ObligationStatus.PARTIALLY_PAID;
      const updated = await tx.obligation.update({
        where: { id: obligation.id },
        data: { status, paidAt: status === ObligationStatus.PAID ? paidAt : null },
      });
      return this.serialize(updated);
    });
  }

  async update(userId: string, id: string, dto: UpdateObligationDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.obligation.findFirst({ where: { id, userId, deletedAt: null } });
      if (!existing) throw new NotFoundException('Obligación no encontrada.');
      const type = dto.type ?? existing.type;
      if (dto.accountId !== undefined) await this.validateAccount(tx, userId, dto.accountId);
      if (dto.categoryId !== undefined || dto.type !== undefined) {
        await this.validateCategory(tx, userId, dto.categoryId ?? existing.categoryId, type);
      }
      if (dto.recurrenceId !== undefined) await this.validateRecurrence(tx, userId, dto.recurrenceId);
      const updated = await tx.obligation.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.amount !== undefined && { amount: this.parseAmount(dto.amount) }),
          ...(dto.dueDate !== undefined && { dueDate: this.validateDate(dto.dueDate) }),
          ...(dto.accountId !== undefined && { accountId: dto.accountId }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.currency !== undefined && { currency: dto.currency }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.recurrenceId !== undefined && { recurrenceId: dto.recurrenceId }),
          ...(dto.periodStart !== undefined && { periodStart: dto.periodStart ? this.validateDate(dto.periodStart) : null }),
          ...(dto.periodEnd !== undefined && { periodEnd: dto.periodEnd ? this.validateDate(dto.periodEnd) : null }),
        },
      });
      return this.serialize(updated);
    });
  }

  async remove(userId: string, id: string) {
    const obligation = await this.prisma.obligation.findFirst({ where: { id, userId, deletedAt: null } });
    if (!obligation) throw new NotFoundException('Obligación no encontrada.');
    await this.prisma.obligation.update({
      where: { id },
      data: { deletedAt: new Date(), status: ObligationStatus.CANCELLED, cancelledAt: new Date() },
    });
  }

  async restore(userId: string, id: string) {
    const obligation = await this.prisma.obligation.findFirst({ where: { id, userId, deletedAt: { not: null } } });
    if (!obligation) throw new NotFoundException('Obligación no encontrada.');
    const restored = await this.prisma.obligation.update({
      where: { id },
      data: { deletedAt: null, status: ObligationStatus.PENDING, paidAt: null, cancelledAt: null },
    });
    return this.serialize(restored);
  }

  async generate(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const limaNow = new Date(now.getTime() - LIMA_OFFSET_MS);
      const year = limaNow.getUTCFullYear();
      const month = limaNow.getUTCMonth();
      const periodStart = new Date(Date.UTC(year, month, 1));
      const periodEnd = new Date(Date.UTC(year, month + 1, 0));
      const recurrences = await tx.recurrence.findMany({
        where: { userId, active: true, deletedAt: null },
      });
      let generated = 0;
      let skipped = 0;
      for (const recurrence of recurrences) {
        if (recurrence.startDate > periodEnd || (recurrence.endDate && recurrence.endDate < periodStart)) continue;
        const dueDay = recurrence.dayOfPeriod ?? new Date(recurrence.startDate.getTime() - LIMA_OFFSET_MS).getUTCDate();
        const day = Math.min(dueDay, periodEnd.getUTCDate());
        const dueDate = new Date(Date.UTC(year, month, day, 5, 0, 0));
        const existing = await tx.obligation.findUnique({
          where: { recurrenceId_periodStart: { recurrenceId: recurrence.id, periodStart } },
        });
        if (existing) {
          skipped += 1;
          continue;
        }
        await tx.obligation.create({
          data: {
            userId,
            recurrenceId: recurrence.id,
            accountId: recurrence.accountId,
            categoryId: recurrence.categoryId,
            name: recurrence.name,
            type: recurrence.type,
            amount: recurrence.amount,
            currency: recurrence.currency,
            description: recurrence.description,
            dueDate,
            periodStart,
            periodEnd,
            status: ObligationStatus.PENDING,
          },
        });
        await tx.recurrence.update({ where: { id: recurrence.id }, data: { lastGeneratedAt: now } });
        generated += 1;
      }
      return { generated, skipped };
    });
  }
}
