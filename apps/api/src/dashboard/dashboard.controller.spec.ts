import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const dashboardService = { summary: jest.fn() };
  const summaryResult = {
    period: {
      from: '2026-10-01T00:00:00.000-05:00',
      to: '2026-10-31T23:59:59.999-05:00',
    },
    totalBalance: '0.00',
    periodIncome: '0.00',
    periodExpense: '0.00',
    netFlow: '0.00',
    topCategories: [],
    recentTransactions: [],
    committedMoney: null,
    upcomingPayments: [],
    topBudgets: [],
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-access-secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
            },
          },
        },
        JwtStrategy,
        JwtAuthGuard,
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
    dashboardService.summary.mockResolvedValue(summaryResult);
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

  it('GET /dashboard/summary devuelve { data } y aplica el período por defecto', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/summary')
      .set('Authorization', await authorizationHeader())
      .expect(200)
      .expect({ data: summaryResult });

    expect(dashboardService.summary).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ period: 'month' }),
    );
  });

  it('pasa filtros de período y cuenta al servicio', async () => {
    const accountId = '550e8400-e29b-41d4-a716-446655440000';

    await request(app.getHttpServer())
      .get(`/dashboard/summary?period=last_month&accountId=${accountId}`)
      .set('Authorization', await authorizationHeader())
      .expect(200);

    expect(dashboardService.summary).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ period: 'last_month', accountId }),
    );
  });

  it('acepta un período custom con fechas ISO', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/summary?period=custom&from=2026-01-01&to=2026-01-31')
      .set('Authorization', await authorizationHeader())
      .expect(200);

    expect(dashboardService.summary).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ period: 'custom', from: '2026-01-01', to: '2026-01-31' }),
    );
  });

  it('rechaza un período custom sin from o to', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/summary?period=custom')
      .set('Authorization', await authorizationHeader())
      .expect(400);

    expect(dashboardService.summary).not.toHaveBeenCalled();
  });

  it('rechaza un accountId que no sea UUID', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/summary?accountId=invalid')
      .set('Authorization', await authorizationHeader())
      .expect(400);

    expect(dashboardService.summary).not.toHaveBeenCalled();
  });

  it('requiere autenticación', async () => {
    await request(app.getHttpServer()).get('/dashboard/summary').expect(401);
    expect(dashboardService.summary).not.toHaveBeenCalled();
  });
});
