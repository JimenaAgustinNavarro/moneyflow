import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';

const user = { id: 'user-1' } as AuthenticatedUser;

describe('BudgetsController', () => {
  let service: jest.Mocked<BudgetsService>;
  let controller: BudgetsController;

  beforeEach(() => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'budget-1' }),
      findAll: jest.fn().mockResolvedValue({ data: [] }),
      findOne: jest.fn().mockResolvedValue({ id: 'budget-1' }),
      usage: jest.fn().mockResolvedValue({ data: { status: 'UNDER_LIMIT' } }),
      copy: jest.fn().mockResolvedValue({ id: 'budget-2' }),
      update: jest.fn().mockResolvedValue({ id: 'budget-1' }),
      remove: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue({ id: 'budget-1' }),
    } as unknown as jest.Mocked<BudgetsService>;
    controller = new BudgetsController(service);
  });

  it('crea y lista presupuestos', async () => {
    await expect(controller.create(user, {} as never)).resolves.toEqual({ data: { id: 'budget-1' } });
    await expect(controller.findAll(user, {} as never)).resolves.toEqual({ data: [] });
  });

  it('obtiene detalle y uso', async () => {
    await expect(controller.findOne(user, 'budget-1')).resolves.toEqual({ data: { id: 'budget-1' } });
    await expect(controller.usage(user, 'budget-1')).resolves.toEqual({ data: { status: 'UNDER_LIMIT' } });
  });

  it('copia, actualiza, elimina y restaura', async () => {
    await expect(controller.copy(user, 'budget-1', {} as never)).resolves.toEqual({ data: { id: 'budget-2' } });
    await expect(controller.update(user, 'budget-1', {} as never)).resolves.toEqual({ data: { id: 'budget-1' } });
    await expect(controller.remove(user, 'budget-1')).resolves.toBeUndefined();
    await expect(controller.restore(user, 'budget-1')).resolves.toEqual({ data: { id: 'budget-1' } });
  });
});
