import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

describe('TransfersController', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let transfersService: {
    create: jest.Mock;
    remove: jest.Mock;
  };

  beforeAll(async () => {
    transfersService = {
      create: jest.fn().mockResolvedValue({
        transferId: 'transfer-1',
        origin: { id: 'origin-leg' },
        destination: { id: 'destination-leg' },
      }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-access-secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [TransfersController],
      providers: [
        { provide: TransfersService, useValue: transfersService },
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
    transfersService.create.mockResolvedValue({
      transferId: 'transfer-1',
      origin: { id: 'origin-leg' },
      destination: { id: 'destination-leg' },
    });
    transfersService.remove.mockResolvedValue(undefined);
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

  const validTransfer = {
    originAccountId: '550e8400-e29b-41d4-a716-446655440000',
    destinationAccountId: '550e8400-e29b-41d4-a716-446655440001',
    amount: '300.00',
    date: '2026-10-15T10:00:00-05:00',
  };

  it('POST /transfers devuelve 201 con { data }', async () => {
    await request(app.getHttpServer())
      .post('/transfers')
      .set('Authorization', await authorizationHeader())
      .send(validTransfer)
      .expect(201)
      .expect({
        data: {
          transferId: 'transfer-1',
          origin: { id: 'origin-leg' },
          destination: { id: 'destination-leg' },
        },
      });

    expect(transfersService.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining(validTransfer),
    );
  });

  it('POST /transfers rechaza campos requeridos inválidos', async () => {
    await request(app.getHttpServer())
      .post('/transfers')
      .set('Authorization', await authorizationHeader())
      .send({ ...validTransfer, date: undefined })
      .expect(400);

    expect(transfersService.create).not.toHaveBeenCalled();
  });

  it('DELETE /transfers/:transferId devuelve 204 sin cuerpo', async () => {
    const response = await request(app.getHttpServer())
      .delete('/transfers/transfer-1')
      .set('Authorization', await authorizationHeader())
      .expect(204);

    expect(response.text).toBe('');
    expect(transfersService.remove).toHaveBeenCalledWith('user-1', 'transfer-1');
  });

  it('requiere autenticación', async () => {
    await request(app.getHttpServer()).post('/transfers').send(validTransfer).expect(401);
    await request(app.getHttpServer()).delete('/transfers/transfer-1').expect(401);
  });
});
