import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateRecurrenceDto, UpdateRecurrenceDto } from './dto';
import { RecurrencesController } from './recurrences.controller';
import { RecurrencesService } from './recurrences.service';

const user = { id: 'user-1' } as AuthenticatedUser;

describe('RecurrencesController', () => {
  let service: jest.Mocked<RecurrencesService>;
  let controller: RecurrencesController;

  beforeEach(() => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'recurrence-1' }),
      findAll: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
      findOne: jest.fn().mockResolvedValue({ id: 'recurrence-1' }),
      update: jest.fn().mockResolvedValue({ id: 'recurrence-1' }),
      remove: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue({ id: 'recurrence-1' }),
      toggle: jest.fn().mockResolvedValue({ id: 'recurrence-1', active: false }),
    } as unknown as jest.Mocked<RecurrencesService>;
    controller = new RecurrencesController(service);
  });

  it('crea una recurrencia', async () => {
    await expect(controller.create(user, {} as CreateRecurrenceDto)).resolves.toEqual({
      data: { id: 'recurrence-1' },
    });
    expect(service.create).toHaveBeenCalledWith('user-1', {});
  });

  it('lista recurrencias paginadas', async () => {
    await expect(controller.findAll(user, {})).resolves.toEqual({
      data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  it('obtiene, actualiza, elimina, restaura y alterna recurrencias', async () => {
    await expect(controller.findOne(user, 'recurrence-1')).resolves.toEqual({ data: { id: 'recurrence-1' } });
    await expect(
      controller.update(user, 'recurrence-1', {} as UpdateRecurrenceDto),
    ).resolves.toEqual({ data: { id: 'recurrence-1' } });
    await expect(controller.remove(user, 'recurrence-1')).resolves.toBeUndefined();
    await expect(controller.restore(user, 'recurrence-1')).resolves.toEqual({ data: { id: 'recurrence-1' } });
    await expect(controller.toggle(user, 'recurrence-1')).resolves.toEqual({ data: { id: 'recurrence-1', active: false } });
  });
});
