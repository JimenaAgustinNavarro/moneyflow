import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContributionType, GoalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SavingsGoalsService } from './savings-goals.service';

const NOW = new Date('2026-10-01T05:00:00.000Z');

describe('SavingsGoalsService', () => {
  let service: SavingsGoalsService;
  let prisma: any;

  const goal = {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Vacaciones',
    targetAmount: new Prisma.Decimal('1000.00'),
    targetDate: new Date('2027-06-30T05:00:00.000Z'),
    accountId: null,
    status: GoalStatus.ACTIVE,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };

  beforeEach(() => {
    prisma = {
      savingsGoal: { create: jest.fn(), count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      goalContribution: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      account: { findFirst: jest.fn() },
      transaction: { findFirst: jest.fn() },
      $transaction: jest.fn((value: any) => Array.isArray(value) ? Promise.all(value) : value(prisma)),
    };
    service = new SavingsGoalsService(prisma as unknown as PrismaService);
  });

  it('crea una meta activa', async () => {
    prisma.savingsGoal.create.mockResolvedValue(goal);
    await expect(service.create('user-1', { name: 'Vacaciones', targetAmount: '1000.00' })).resolves.toMatchObject({
      id: 'goal-1', currentAmount: '0.00', status: GoalStatus.ACTIVE,
    });
  });

  it('rechaza una cuenta ajena', async () => {
    prisma.account.findFirst.mockResolvedValue(null);
    await expect(service.create('user-1', {
      name: 'Vacaciones', targetAmount: '1000.00', accountId: 'account-1',
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lista metas con paginación', async () => {
    prisma.savingsGoal.count.mockResolvedValue(1);
    prisma.savingsGoal.findMany.mockResolvedValue([goal]);
    prisma.goalContribution.findMany.mockResolvedValue([]);
    await expect(service.findAll('user-1', { page: 1, limit: 20 })).resolves.toMatchObject({
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('retorna 404 cuando la meta no existe', async () => {
    prisma.savingsGoal.findFirst.mockResolvedValue(null);
    await expect(service.findOne('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('actualiza una meta', async () => {
    prisma.savingsGoal.findFirst.mockResolvedValue(goal);
    prisma.savingsGoal.update.mockResolvedValue({ ...goal, name: 'Viaje' });
    prisma.goalContribution.findMany.mockResolvedValue([]);
    await expect(service.update('user-1', 'goal-1', { name: 'Viaje' })).resolves.toMatchObject({ name: 'Viaje' });
  });

  it('elimina y restaura una meta con sus aportes', async () => {
    prisma.savingsGoal.findFirst.mockResolvedValueOnce(goal).mockResolvedValueOnce({ ...goal, deletedAt: NOW });
    prisma.savingsGoal.update.mockResolvedValue({ ...goal, deletedAt: null });
    prisma.goalContribution.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.remove('user-1', 'goal-1')).resolves.toBeUndefined();
    await expect(service.restore('user-1', 'goal-1')).resolves.toMatchObject({ id: 'goal-1' });
  });

  it('crea depósitos y retiros válidos, y bloquea retiros excesivos', async () => {
    prisma.savingsGoal.findFirst.mockResolvedValue(goal);
    prisma.goalContribution.findMany.mockResolvedValue([
      { amount: new Prisma.Decimal('500.00'), type: ContributionType.DEPOSIT },
    ]);
    prisma.goalContribution.create.mockResolvedValue({
      id: 'contribution-1', goalId: 'goal-1', transactionId: null,
      amount: new Prisma.Decimal('100.00'), type: ContributionType.WITHDRAWAL,
      occurredAt: NOW, createdAt: NOW, deletedAt: null,
    });
    await expect(service.createContribution('user-1', 'goal-1', {
      amount: '100.00', date: NOW.toISOString(), type: ContributionType.WITHDRAWAL,
    })).resolves.toMatchObject({ id: 'contribution-1' });
    await expect(service.createContribution('user-1', 'goal-1', {
      amount: '600.00', date: NOW.toISOString(), type: ContributionType.WITHDRAWAL,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un transactionId ajeno', async () => {
    prisma.savingsGoal.findFirst.mockResolvedValue(goal);
    prisma.goalContribution.findMany.mockResolvedValue([]);
    prisma.transaction.findFirst.mockResolvedValue(null);
    await expect(service.createContribution('user-1', 'goal-1', {
      amount: '100.00', date: NOW.toISOString(), transactionId: 'transaction-1',
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('calcula saldo con depósitos y retiros', async () => {
    prisma.goalContribution.findMany.mockResolvedValue([
      { amount: new Prisma.Decimal('800.00'), type: ContributionType.DEPOSIT },
      { amount: new Prisma.Decimal('200.00'), type: ContributionType.WITHDRAWAL },
    ]);
    await expect(service.calculateCurrentAmount(prisma as unknown as PrismaService, 'goal-1'))
      .resolves.toEqual(new Prisma.Decimal('600.00'));
  });

  it('calcula estados on-the-fly y respeta CANCELLED', () => {
    expect(service.calculateEffectiveStatus(GoalStatus.ACTIVE, '1000.00', '1000.00')).toBe(GoalStatus.COMPLETED);
    expect(service.calculateEffectiveStatus(GoalStatus.COMPLETED, '999.00', '1000.00')).toBe(GoalStatus.ACTIVE);
    expect(service.calculateEffectiveStatus(GoalStatus.CANCELLED, '1000.00', '1000.00')).toBe(GoalStatus.CANCELLED);
  });
});
