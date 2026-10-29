import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Recurrence, RecurrenceFrequency, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurrenceDto, RecurrenceQueryDto, UpdateRecurrenceDto } from './dto';

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

@Injectable()
export class RecurrencesService {
  constructor(private readonly prisma: PrismaService) {}

  private parseAmount(amount: string): Prisma.Decimal {
    const decimal = new Prisma.Decimal(amount);
    if (!decimal.isFinite() || decimal.lte(0)) {
      throw new BadRequestException('El monto debe ser mayor a cero.');
    }
    return decimal;
  }

  private validateDates(startDateValue: Date | string, endDateValue?: Date | string | null) {
    const startDate = typeof startDateValue === 'string' ? new Date(startDateValue) : startDateValue;
    const endDate =
      typeof endDateValue === 'string'
        ? new Date(endDateValue)
        : endDateValue instanceof Date
          ? endDateValue
          : null;
    if (Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
      throw new BadRequestException('Las fechas deben ser válidas.');
    }
    if (endDate && endDate < startDate) {
      throw new BadRequestException('La fecha final no puede ser anterior a la fecha inicial.');
    }
  }

  private toLimaIso(date: Date): string {
    return new Date(date.getTime() - LIMA_OFFSET_MS)
      .toISOString()
      .replace('.000Z', '-05:00')
      .replace(/Z$/, '-05:00');
  }

  private serialize(recurrence: Recurrence & {
    account: { id: string; name: string } | null;
    category: { id: string; name: string } | null;
  }) {
    return {
      id: recurrence.id,
      userId: recurrence.userId,
      name: recurrence.name,
      type: recurrence.type,
      amount: recurrence.amount.toFixed(2),
      currency: recurrence.currency,
      description: recurrence.description,
      frequency: recurrence.frequency,
      dayOfPeriod: recurrence.dayOfPeriod,
      startDate: recurrence.startDate.toISOString(),
      endDate: recurrence.endDate?.toISOString() ?? null,
      nextDueDate: this.calculateNextDueDate(recurrence),
      active: recurrence.active,
      accountId: recurrence.account?.id ?? null,
      accountName: recurrence.account?.name ?? null,
      categoryId: recurrence.category?.id ?? null,
      categoryName: recurrence.category?.name ?? null,
      createdAt: recurrence.createdAt.toISOString(),
      updatedAt: recurrence.updatedAt.toISOString(),
      deletedAt: recurrence.deletedAt?.toISOString() ?? null,
    };
  }

  private limaWall(date: Date): Date {
    return new Date(date.getTime() - LIMA_OFFSET_MS);
  }

  private limaInstant(wall: Date): Date {
    return new Date(wall.getTime() + LIMA_OFFSET_MS);
  }

  private wallDaysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  }

  calculateNextDueDate(recurrence: Recurrence): string | null {
    const now = new Date();
    if (recurrence.endDate && recurrence.endDate < now) return null;

    const startWall = this.limaWall(recurrence.startDate);
    const timeParts = [
      startWall.getUTCHours(),
      startWall.getUTCMinutes(),
      startWall.getUTCSeconds(),
      startWall.getUTCMilliseconds(),
    ];

    const occurrence = (index: number): Date => {
      if (recurrence.frequency === RecurrenceFrequency.WEEKLY || recurrence.frequency === RecurrenceFrequency.BIWEEKLY) {
        const days = index * (recurrence.frequency === RecurrenceFrequency.WEEKLY ? 7 : 14);
        const wall = new Date(startWall.getTime());
        wall.setUTCDate(wall.getUTCDate() + days);
        return this.limaInstant(wall);
      }

      let monthOffset = index;
      if (recurrence.frequency === RecurrenceFrequency.QUARTERLY) monthOffset *= 3;
      if (recurrence.frequency === RecurrenceFrequency.YEARLY) monthOffset *= 12;
      const monthIndex = startWall.getUTCMonth() + monthOffset;
      const year = startWall.getUTCFullYear() + Math.floor(monthIndex / 12);
      const month = ((monthIndex % 12) + 12) % 12;
      const preferredDay = recurrence.dayOfPeriod ?? startWall.getUTCDate();
      const day = Math.min(preferredDay, this.wallDaysInMonth(year, month));
      const wall = new Date(
        Date.UTC(year, month, day, timeParts[0], timeParts[1], timeParts[2], timeParts[3]),
      );
      return this.limaInstant(wall);
    };

    let index = 0;
    while (index < 120000) {
      const candidate = occurrence(index);
      if (candidate > now && (!recurrence.endDate || candidate <= recurrence.endDate)) {
        return this.toLimaIso(candidate);
      }
      if (recurrence.endDate && candidate > recurrence.endDate) return null;
      index += 1;
    }
    return null;
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
  ): Promise<void> {
    if (!categoryId) return;
    const category = await tx.category.findFirst({
      where: { id: categoryId, deletedAt: null, OR: [{ userId }, { isSystem: true, userId: null }] },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada.');
    if (category.type !== type) {
      throw new BadRequestException('El tipo de la categoría no coincide con el tipo de la recurrencia.');
    }
  }

  async create(userId: string, dto: CreateRecurrenceDto) {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    this.validateDates(startDate, endDate);
    const amount = this.parseAmount(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      await this.validateAccount(tx, userId, dto.accountId);
      await this.validateCategory(tx, userId, dto.categoryId, dto.type);
      const recurrence = await tx.recurrence.create({
        data: {
          userId,
          name: dto.name,
          type: dto.type,
          amount,
          currency: dto.currency ?? 'PEN',
          description: dto.description ?? null,
          frequency: dto.frequency,
          dayOfPeriod: dto.dayOfPeriod ?? null,
          startDate,
          endDate,
          accountId: dto.accountId,
          categoryId: dto.categoryId ?? null,
        },
        include: {
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      });
      return this.serialize(recurrence);
    });
  }

  async findAll(userId: string, query: RecurrenceQueryDto) {
    const includeDeleted = query.includeDeleted === 'true';
    const where: Prisma.RecurrenceWhereInput = {
      userId,
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(query.active !== undefined && { active: query.active === 'true' }),
      ...(query.type && { type: query.type }),
      ...(query.accountId && { accountId: query.accountId }),
      ...(query.categoryId && { categoryId: query.categoryId }),
    };
    const recurrences = await this.prisma.recurrence.findMany({
      orderBy: { createdAt: 'desc' },
      where,
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    return { data: recurrences.map((recurrence) => this.serialize(recurrence)) };
  }

  async findOne(userId: string, id: string) {
    const recurrence = await this.prisma.recurrence.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    if (!recurrence) throw new NotFoundException('Recurrencia no encontrada.');
    return this.serialize(recurrence);
  }

  async update(userId: string, id: string, dto: UpdateRecurrenceDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.recurrence.findFirst({ where: { id, userId, deletedAt: null } });
      if (!existing) throw new NotFoundException('Recurrencia no encontrada.');
      const startDate = dto.startDate !== undefined ? new Date(dto.startDate) : existing.startDate;
      const endDate = dto.endDate === null ? null : dto.endDate !== undefined ? new Date(dto.endDate) : existing.endDate;
      this.validateDates(startDate, endDate);
      const type = dto.type ?? existing.type;
      if (dto.accountId !== undefined) await this.validateAccount(tx, userId, dto.accountId);
      if (dto.categoryId !== undefined || dto.type !== undefined) {
        await this.validateCategory(tx, userId, dto.categoryId ?? existing.categoryId, type);
      }
      const recurrence = await tx.recurrence.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.amount !== undefined && { amount: this.parseAmount(dto.amount) }),
          ...(dto.currency !== undefined && { currency: dto.currency }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.frequency !== undefined && { frequency: dto.frequency }),
          ...(dto.dayOfPeriod !== undefined && { dayOfPeriod: dto.dayOfPeriod }),
          ...(dto.startDate !== undefined && { startDate }),
          ...(dto.endDate !== undefined && { endDate }),
          ...(dto.accountId !== undefined && { accountId: dto.accountId }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        },
        include: {
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      });
      return this.serialize(recurrence);
    });
  }

  async remove(userId: string, id: string) {
    const recurrence = await this.prisma.recurrence.findFirst({ where: { id, userId, deletedAt: null } });
    if (!recurrence) throw new NotFoundException('Recurrencia no encontrada.');
    await this.prisma.recurrence.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restore(userId: string, id: string) {
    const recurrence = await this.prisma.recurrence.findFirst({ where: { id, userId, deletedAt: { not: null } } });
    if (!recurrence) throw new NotFoundException('Recurrencia no encontrada.');
    const restored = await this.prisma.recurrence.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    return this.serialize(restored);
  }

  async toggle(userId: string, id: string) {
    const recurrence = await this.prisma.recurrence.findFirst({ where: { id, userId, deletedAt: null } });
    if (!recurrence) throw new NotFoundException('Recurrencia no encontrada.');
    const toggled = await this.prisma.recurrence.update({
      where: { id },
      data: { active: !recurrence.active },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    return this.serialize(toggled);
  }
}
