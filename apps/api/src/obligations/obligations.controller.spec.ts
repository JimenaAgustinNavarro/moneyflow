import { CreateObligationDto, UpdateObligationDto, PayObligationDto, ObligationQueryDto } from './dto';
import { ObligationsController } from './obligations.controller';
import { ObligationsService } from './obligations.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';

const user = { id: 'user-1' } as AuthenticatedUser;

describe('ObligationsController', () => {
  let service: jest.Mocked<ObligationsService>;
  let controller: ObligationsController;

  beforeEach(() => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'obligation-1' }),
      findAll: jest.fn().mockResolvedValue({ data: [] }),
      upcoming: jest.fn().mockResolvedValue({ data: [] }),
      findOne: jest.fn().mockResolvedValue({ id: 'obligation-1' }),
      pay: jest.fn().mockResolvedValue({ id: 'obligation-1', status: 'PAID' }),
      update: jest.fn().mockResolvedValue({ id: 'obligation-1' }),
      remove: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue({ id: 'obligation-1' }),
      generate: jest.fn().mockResolvedValue({ generated: 1, skipped: 0 }),
    } as unknown as jest.Mocked<ObligationsService>;
    controller = new ObligationsController(service);
  });

  it('crea una obligación', async () => {
    await expect(controller.create(user, {} as CreateObligationDto)).resolves.toEqual({ data: { id: 'obligation-1' } });
  });

  it('lista, obtiene próximas y genera obligaciones', async () => {
    await expect(controller.findAll(user, {} as ObligationQueryDto)).resolves.toEqual({ data: [] });
    await expect(controller.upcoming(user)).resolves.toEqual({ data: [] });
    await expect(controller.generate(user)).resolves.toEqual({ generated: 1, skipped: 0 });
  });

  it('obtiene y paga una obligación', async () => {
    await expect(controller.findOne(user, 'obligation-1')).resolves.toEqual({ data: { id: 'obligation-1' } });
    await expect(controller.pay(user, 'obligation-1', {} as PayObligationDto)).resolves.toEqual({
      data: { id: 'obligation-1', status: 'PAID' },
    });
  });

  it('actualiza, elimina y restaura una obligación', async () => {
    await expect(controller.update(user, 'obligation-1', {} as UpdateObligationDto)).resolves.toEqual({ data: { id: 'obligation-1' } });
    await expect(controller.remove(user, 'obligation-1')).resolves.toBeUndefined();
    await expect(controller.restore(user, 'obligation-1')).resolves.toEqual({ data: { id: 'obligation-1' } });
  });
});
