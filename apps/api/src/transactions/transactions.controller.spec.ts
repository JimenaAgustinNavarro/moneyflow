import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AllowedTransactionType } from './dto';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

describe('TransactionsController', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let transactionsService: {
    findAll: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    restore: jest.Mock;
  };

  beforeAll(async () => {
    transactionsService = {
      findAll: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
      create: jest.fn().mockResolvedValue({ id: 'transaction-1' }),
      findOne: jest.fn().mockResolvedValue({ id: 'transaction-1' }),
      update: jest.fn().mockResolvedValue({ id: 'transaction-1' }),
      remove: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue({ id: 'transaction-1' }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-access-secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [TransactionsController],
      providers: [
        { provide: TransactionsService, useValue: transactionsService },
        JwtStrategy,
        Reflector,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string): string => {
              if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
              throw new Error(`Configuración requerida ausente: ${key}`);
            },
          },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwtService = moduleRef.get(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    transactionsService.findAll.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    transactionsService.create.mockResolvedValue({ id: 'transaction-1' });
    transactionsService.findOne.mockResolvedValue({ id: 'transaction-1' });
    transactionsService.update.mockResolvedValue({ id: 'transaction-1' });
    transactionsService.remove.mockResolvedValue(undefined);
    transactionsService.restore.mockResolvedValue({ id: 'transaction-1' });
  });

  afterAll(async () => {
    await app.close();
  });

  async function authorizationHeader(): Promise<string> {
    const token = await jwtService.signAsync({
      sub: 'user-1',
      email: 'test@example.com',
    });
    return `Bearer ${token}`;
  }

  it('GET /transactions devuelve { data, meta } y pasa filtros', async () => {
    transactionsService.findAll.mockResolvedValue({
      data: [{ id: 'transaction-1' }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await request(app.getHttpServer())
      .get('/transactions?type=INCOME&page=1&limit=10')
      .set('Authorization', await authorizationHeader())
      .expect(200)
      .expect({
        data: [{ id: 'transaction-1' }],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

    expect(transactionsService.findAll).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ type: AllowedTransactionType.INCOME, page: 1, limit: 10 }),
    );
  });

  it('POST /transactions valida y devuelve { data }', async () => {
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', await authorizationHeader())
      .send({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'INCOME',
        amount: '500',
        date: '2026-10-15T10:00:00-05:00',
      })
      .expect(201)
      .expect({ data: { id: 'transaction-1' } });

    expect(transactionsService.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ type: AllowedTransactionType.INCOME, amount: '500' }),
    );
  });

  it('rechaza POST /transactions con type TRANSFER', async () => {
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', await authorizationHeader())
      .send({
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'TRANSFER',
        amount: '500',
        date: '2026-10-15T10:00:00-05:00',
      })
      .expect(400);

    expect(transactionsService.create).not.toHaveBeenCalled();
  });

  it('GET detalle y PATCH devuelven { data }', async () => {
    const authorization = await authorizationHeader();

    await request(app.getHttpServer())
      .get('/transactions/transaction-1')
      .set('Authorization', authorization)
      .expect(200)
      .expect({ data: { id: 'transaction-1' } });

    await request(app.getHttpServer())
      .patch('/transactions/transaction-1')
      .set('Authorization', authorization)
      .send({ amount: '300' })
      .expect(200)
      .expect({ data: { id: 'transaction-1' } });

    expect(transactionsService.findOne).toHaveBeenCalledWith('user-1', 'transaction-1');
    expect(transactionsService.update).toHaveBeenCalledWith('user-1', 'transaction-1', {
      amount: '300',
    });
  });

  it('DELETE devuelve 204 y restore devuelve { data }', async () => {
    const authorization = await authorizationHeader();

    await request(app.getHttpServer())
      .delete('/transactions/transaction-1')
      .set('Authorization', authorization)
      .expect(204);
    await request(app.getHttpServer())
      .post('/transactions/transaction-1/restore')
      .set('Authorization', authorization)
      .expect(200)
      .expect({ data: { id: 'transaction-1' } });

    expect(transactionsService.remove).toHaveBeenCalledWith('user-1', 'transaction-1');
    expect(transactionsService.restore).toHaveBeenCalledWith('user-1', 'transaction-1');
  });

  it('requiere autenticación en todos los endpoints', async () => {
    const paths = [
      request(app.getHttpServer()).get('/transactions'),
      request(app.getHttpServer()).post('/transactions').send({}),
      request(app.getHttpServer()).get('/transactions/transaction-1'),
      request(app.getHttpServer()).patch('/transactions/transaction-1').send({}),
      request(app.getHttpServer()).delete('/transactions/transaction-1'),
      request(app.getHttpServer()).post('/transactions/transaction-1/restore'),
    ];

    await Promise.all(paths.map((response) => response.expect(401)));
  });
});
