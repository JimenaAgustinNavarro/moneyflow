jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

describe('AuthController', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    me: jest.Mock;
  };

  beforeAll(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      login: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      }),
      refresh: jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
      logout: jest.fn().mockResolvedValue(undefined),
      me: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'America/Lima',
        createdAt: '2026-01-01T00:00:00.000Z',
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
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
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
    authService.register.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    });
    authService.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    authService.logout.mockResolvedValue(undefined);
    authService.me.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      timezone: 'America/Lima',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register es público y devuelve 201 con sobre data', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'TEST@example.com',
        password: 'password123',
        name: 'Test User',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toEqual(
          expect.objectContaining({
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
          }),
        );
        expect(body.data).not.toHaveProperty('passwordHash');
      });

    expect(authService.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' }),
    );
  });

  it('POST /auth/login es público y devuelve tokens y usuario dentro de data', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('User-Agent', 'controller-test')
      .send({ email: 'TEST@example.com', password: 'password123' })
      .expect(200)
      .expect({
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        },
      });

    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' }),
      'controller-test',
      expect.any(String),
    );
  });

  it('POST /auth/refresh es público y devuelve tokens dentro de data', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'old-refresh-token' })
      .expect(200)
      .expect({
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });
  });

  it('POST /auth/logout sin access token devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: 'refresh-token' })
      .expect(401);
  });

  it('POST /auth/logout autenticado devuelve 204 sin body', async () => {
    const accessToken = jwtService.sign({
      sub: 'user-1',
      email: 'test@example.com',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken: 'refresh-token' })
      .expect(204);

    expect(response.text).toBe('');
    expect(authService.logout).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ refreshToken: 'refresh-token' }),
    );
  });

  it('GET /auth/me sin access token devuelve 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me autenticado devuelve usuario dentro de data', async () => {
    const accessToken = jwtService.sign({
      sub: 'user-1',
      email: 'test@example.com',
    });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(
          expect.objectContaining({
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
            timezone: 'America/Lima',
          }),
        );
        expect(body.data).not.toHaveProperty('passwordHash');
      });

    expect(authService.me).toHaveBeenCalledWith('user-1');
  });
});
