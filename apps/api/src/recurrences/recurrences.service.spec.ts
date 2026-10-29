import { Prisma, Recurrence, RecurrenceFrequency } from '@prisma/client';
import { CreateRecurrenceDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { RecurrencesService } from './recurrences.service';

type RecurrenceWithRelations = Recurrence & {
  account: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
};

const recurrence = (overrides: Record<string, unknown> = {}): RecurrenceWithRelations =>
  ({
    id: 'recurrence-1',
    userId: 'user-1',
    name: 'Luz',
    type: 'EXPENSE',
    amount: new Prisma.Decimal('120.00'),
    currency: 'PEN',
    description: null,
    frequency: RecurrenceFrequency.MONTHLY,
    dayOfPeriod: 15,
    startDate: new Date('2026-01-15T05:00:00.000Z'),
    endDate: null,
    active: true,
    createdAt: new Date('2026-01-01T05:00:00.000Z'),
    updatedAt: new Date('2026-01-01T05:00:00.000Z'),
    deletedAt: null,
    account: { id: 'account-1', name: 'Cuenta principal' },
    category: { id: 'category-1', name: 'Servicios' },
    ...overrides,
  }) as unknown as RecurrenceWithRelations;

describe('RecurrencesService', () => {
  let service: RecurrencesService;

  beforeEach(() => {
    service = new RecurrencesService({} as PrismaService);
  });

  afterEach(() => jest.useRealTimers());

  it('serializa los datos de cuenta y categoría', () => {
    const result = service['serialize'](recurrence());

    expect(result).toMatchObject({
      accountId: 'account-1',
      accountName: 'Cuenta principal',
      categoryId: 'category-1',
      categoryName: 'Servicios',
    });
  });

  it('serializa relaciones nulas sin datos derivados', () => {
    const result = service['serialize'](recurrence({ account: null, category: null }));

    expect(result).toMatchObject({
      accountId: null,
      accountName: null,
      categoryId: null,
      categoryName: null,
    });
  });

  it('rechaza montos iguales o menores a cero', async () => {
    await expect(
      service.create('user-1', {
        amount: '0',
        accountId: 'account-1',
        startDate: '2026-01-01T00:00:00-05:00',
      } as CreateRecurrenceDto),
    ).rejects.toThrow('El monto debe ser mayor a cero.');
  });

  it('calcula una recurrencia quincenal desde hoy', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-20T12:00:00.000Z'));
    const result = service.calculateNextDueDate(
      recurrence({
        frequency: RecurrenceFrequency.BIWEEKLY,
        startDate: new Date('2026-01-01T05:00:00.000Z'),
      }),
    );
    expect(result).toBe('2026-01-29T00:00:00-05:00');
  });

  it('calcula una recurrencia trimestral', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-20T12:00:00.000Z'));
    const result = service.calculateNextDueDate(
      recurrence({ frequency: RecurrenceFrequency.QUARTERLY, dayOfPeriod: 15 }),
    );
    expect(result).toBe('2026-04-15T00:00:00-05:00');
  });

  it('ajusta el día 31 al último día de febrero', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-01T12:00:00.000Z'));
    const result = service.calculateNextDueDate(
      recurrence({
        dayOfPeriod: 31,
        startDate: new Date('2026-01-31T05:00:00.000Z'),
      }),
    );
    expect(result).toBe('2026-02-28T00:00:00-05:00');
  });

  it('devuelve null cuando el endDate ya terminó', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-01T12:00:00.000Z'));
    expect(service.calculateNextDueDate(recurrence({ endDate: new Date('2026-02-15T05:00:00.000Z') }))).toBeNull();
  });
});
