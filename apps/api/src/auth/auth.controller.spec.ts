jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

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
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
        JwtModule.register({
          secret: 'test-access-secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
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
    app.use(cookieParser());
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
    const response = await request(app.getHttpServer())
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
    const cookieHeaders = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie']
      : [response.headers['set-cookie']].filter((value): value is string => Boolean(value));
    expect(cookieHeaders).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^accessToken=.*HttpOnly.*SameSite=Strict/i),
        expect.stringMatching(/^refreshToken=.*HttpOnly.*SameSite=Strict/i),
      ]),
    );

    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' }),
      'controller-test',
      expect.any(String),
    );
  });

  it('POST /auth/refresh es público y devuelve tokens dentro de data', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', 'refreshToken=old-refresh-token')
      .expect(200)
      .expect({
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });
  });

  it('POST /auth/refresh conserva el fallback del body y rota las cookies', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'body-refresh-token' })
      .expect(200);

    expect(authService.refresh).toHaveBeenCalledWith(
      'body-refresh-token',
      undefined,
      expect.any(String),
    );
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^accessToken=.*HttpOnly.*SameSite=Strict/i),
        expect.stringMatching(/^refreshToken=.*HttpOnly.*SameSite=Strict/i),
      ]),
    );
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
      .set('Cookie', 'refreshToken=refresh-token')
      .expect(204);

    expect(response.text).toBe('');
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^accessToken=;.*Expires=Thu, 01 Jan 1970/i),
        expect.stringMatching(/^refreshToken=;.*Expires=Thu, 01 Jan 1970/i),
      ]),
    );
    expect(authService.logout).toHaveBeenCalledWith(
      'user-1',
      'refresh-token',
    );
  });

  it('POST /auth/login establece cookies Secure en producción', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);
      const cookieHeaders = Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie']
        : [response.headers['set-cookie']].filter((value): value is string => Boolean(value));

      expect(cookieHeaders).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^accessToken=.*; Secure/i),
          expect.stringMatching(/^refreshToken=.*; Secure/i),
        ]),
      );
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
    }
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

  it('GET /auth/me acepta access token en cookie', async () => {
    const accessToken = jwtService.sign({
      sub: 'user-1',
      email: 'test@example.com',
    });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', `accessToken=${accessToken}`)
      .expect(200);
  });

});
