jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

describe('AccountsController', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let accountsService: {
    findAll: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    restore: jest.Mock;
    recalculate: jest.Mock;
  };

  beforeAll(async () => {
    accountsService = {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'account-1' }),
      findOne: jest.fn().mockResolvedValue({ id: 'account-1' }),
      update: jest.fn().mockResolvedValue({ id: 'account-1' }),
      remove: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue({ id: 'account-1' }),
      recalculate: jest.fn().mockResolvedValue({
        id: 'account-1',
        balance: '1000',
        recalculatedAt: '2026-01-01T00:00:00.000Z',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-access-secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AccountsController],
      providers: [
        { provide: AccountsService, useValue: accountsService },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
              }),
            },
          },
        },
        JwtStrategy,
        Reflector,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string): string => {
              if (key === 'JWT_ACCESS_SECRET') {
                return 'test-access-secret';
              }
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
    accountsService.findAll.mockResolvedValue([]);
    accountsService.create.mockResolvedValue({ id: 'account-1' });
    accountsService.findOne.mockResolvedValue({ id: 'account-1' });
    accountsService.update.mockResolvedValue({ id: 'account-1' });
    accountsService.remove.mockResolvedValue(undefined);
    accountsService.restore.mockResolvedValue({ id: 'account-1' });
    accountsService.recalculate.mockResolvedValue({
      id: 'account-1',
      balance: '1000',
      recalculatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  function authorizationHeader(): string {
    return `Bearer ${jwtService.sign({
      sub: 'user-1',
      email: 'test@example.com',
    })}`;
  }

  it('GET /accounts devuelve { data } y filtra por el usuario autenticado', async () => {
    accountsService.findAll.mockResolvedValue([{ id: 'account-1' }]);

    await request(app.getHttpServer())
      .get('/accounts')
      .set('Authorization', authorizationHeader())
      .expect(200)
      .expect({ data: [{ id: 'account-1' }] });

    expect(accountsService.findAll).toHaveBeenCalledWith('user-1', undefined, false);
  });

  it.each(['/accounts', '/accounts/account-1'])('GET %s sin token devuelve 401', async (path) => {
    await request(app.getHttpServer()).get(path).expect(401);
  });

  it('GET /accounts transforma archived=false a boolean false', async () => {
    await request(app.getHttpServer())
      .get('/accounts?archived=false')
      .set('Authorization', authorizationHeader())
      .expect(200);

    expect(accountsService.findAll).toHaveBeenCalledWith('user-1', false, false);
  });

  it('GET /accounts rechaza filtros booleanos inválidos', async () => {
    await request(app.getHttpServer())
      .get('/accounts?archived=maybe')
      .set('Authorization', authorizationHeader())
      .expect(400);

    expect(accountsService.findAll).not.toHaveBeenCalled();
  });

  it('POST /accounts devuelve 201 con { data } y DTO validado', async () => {
    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', authorizationHeader())
      .send({
        name: 'Ahorros',
        type: 'BANK',
        initialBalance: '1000.00',
      })
      .expect(201)
      .expect({ data: { id: 'account-1' } });

    expect(accountsService.create).toHaveBeenCalledWith('user-1', {
      name: 'Ahorros',
      type: 'BANK',
      initialBalance: '1000.00',
    });
  });

  it('POST /accounts sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/accounts')
      .send({
        name: 'Ahorros',
        type: 'BANK',
        initialBalance: '1000.00',
      })
      .expect(401);
  });

  it('GET /accounts/:id devuelve el detalle envuelto en data', async () => {
    await request(app.getHttpServer())
      .get('/accounts/account-1')
      .set('Authorization', authorizationHeader())
      .expect(200)
      .expect({ data: { id: 'account-1' } });

    expect(accountsService.findOne).toHaveBeenCalledWith('user-1', 'account-1');
  });

  it('PATCH /accounts/:id devuelve la cuenta actualizada envuelta en data', async () => {
    await request(app.getHttpServer())
      .patch('/accounts/account-1')
      .set('Authorization', authorizationHeader())
      .send({ name: 'Efectivo' })
      .expect(200)
      .expect({ data: { id: 'account-1' } });

    expect(accountsService.update).toHaveBeenCalledWith('user-1', 'account-1', {
      name: 'Efectivo',
    });
  });

  it.each(['initialBalance', 'currency'])(
    'PATCH /accounts/:id rechaza el campo protegido %s',
    async (field) => {
      await request(app.getHttpServer())
        .patch('/accounts/account-1')
        .set('Authorization', authorizationHeader())
        .send({ [field]: field === 'initialBalance' ? '2000' : 'USD' })
        .expect(400);

      expect(accountsService.update).not.toHaveBeenCalled();
    },
  );

  it('DELETE /accounts/:id devuelve 204 sin body', async () => {
    const response = await request(app.getHttpServer())
      .delete('/accounts/account-1')
      .set('Authorization', authorizationHeader())
      .expect(204);

    expect(response.text).toBe('');
    expect(accountsService.remove).toHaveBeenCalledWith('user-1', 'account-1');
  });

  it('POST /accounts/:id/restore devuelve { data }', async () => {
    await request(app.getHttpServer())
      .post('/accounts/account-1/restore')
      .set('Authorization', authorizationHeader())
      .expect(200)
      .expect({ data: { id: 'account-1' } });

    expect(accountsService.restore).toHaveBeenCalledWith('user-1', 'account-1');
  });

  it('POST /accounts/:id/recalculate devuelve { data }', async () => {
    await request(app.getHttpServer())
      .post('/accounts/account-1/recalculate')
      .set('Authorization', authorizationHeader())
      .expect(200)
      .expect({
        data: {
          id: 'account-1',
          balance: '1000',
          recalculatedAt: '2026-01-01T00:00:00.000Z',
        },
      });

    expect(accountsService.recalculate).toHaveBeenCalledWith('user-1', 'account-1');
  });
});
