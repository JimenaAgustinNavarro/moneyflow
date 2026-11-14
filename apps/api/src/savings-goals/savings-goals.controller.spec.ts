import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { SavingsGoalsController } from './savings-goals.controller';
import { SavingsGoalsService } from './savings-goals.service';

const user = { id: 'user-1' } as AuthenticatedUser;

describe('SavingsGoalsController', () => {
  let service: jest.Mocked<SavingsGoalsService>;
  let controller: SavingsGoalsController;

  beforeEach(() => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'goal-1' }),
      findAll: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
      findOne: jest.fn().mockResolvedValue({ id: 'goal-1' }),
      update: jest.fn().mockResolvedValue({ id: 'goal-1' }),
      remove: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue({ id: 'goal-1' }),
      listContributions: jest.fn().mockResolvedValue({ data: [] }),
      createContribution: jest.fn().mockResolvedValue({ id: 'contribution-1' }),
      removeContribution: jest.fn().mockResolvedValue(undefined),
      restoreContribution: jest.fn().mockResolvedValue({ id: 'contribution-1' }),
    } as unknown as jest.Mocked<SavingsGoalsService>;
    controller = new SavingsGoalsController(service);
  });

  it('crea y lista metas', async () => {
    await expect(controller.create(user, {} as never)).resolves.toEqual({ data: { id: 'goal-1' } });
    await expect(controller.findAll(user, {} as never)).resolves.toMatchObject({ data: [] });
  });

  it('obtiene y modifica metas', async () => {
    await expect(controller.findOne(user, 'goal-1')).resolves.toEqual({ data: { id: 'goal-1' } });
    await expect(controller.update(user, 'goal-1', {} as never)).resolves.toEqual({ data: { id: 'goal-1' } });
    await expect(controller.remove(user, 'goal-1')).resolves.toBeUndefined();
    await expect(controller.restore(user, 'goal-1')).resolves.toEqual({ data: { id: 'goal-1' } });
  });

  it('gestiona aportes y retiros', async () => {
    await expect(controller.listContributions(user, 'goal-1')).resolves.toEqual({ data: [] });
    await expect(controller.createContribution(user, 'goal-1', {} as never)).resolves.toEqual({ data: { id: 'contribution-1' } });
    await expect(controller.removeContribution(user, 'goal-1', 'contribution-1')).resolves.toBeUndefined();
    await expect(controller.restoreContribution(user, 'goal-1', 'contribution-1'))
      .resolves.toEqual({ data: { id: 'contribution-1' } });
  });
});
