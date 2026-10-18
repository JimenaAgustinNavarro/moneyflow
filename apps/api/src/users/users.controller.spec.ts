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
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let usersService: {
    updateMe: jest.Mock;
    changePassword: jest.Mock;
    deleteMe: jest.Mock;
  };

  beforeAll(async () => {
    usersService = {
      updateMe: jest.fn(),
      changePassword: jest.fn().mockResolvedValue(undefined),
      deleteMe: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-access-secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
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
    usersService.changePassword.mockResolvedValue(undefined);
    usersService.deleteMe.mockResolvedValue(undefined);
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

  it('PATCH /users/me autenticado devuelve 200 con sobre data', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Nuevo nombre',
      timezone: 'America/Lima',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    usersService.updateMe.mockResolvedValue(user);

    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', authorizationHeader())
      .send({ name: 'Nuevo nombre' })
      .expect(200)
      .expect({ data: user });
    expect(usersService.updateMe).toHaveBeenCalledWith('user-1', {
      name: 'Nuevo nombre',
    });
  });

  it('PATCH /users/me sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .send({ name: 'Nuevo nombre' })
      .expect(401);
  });

  it('PATCH /users/me/password autenticado devuelve 204 sin body', async () => {
    const response = await request(app.getHttpServer())
      .patch('/users/me/password')
      .set('Authorization', authorizationHeader())
      .send({ currentPassword: 'old-password', newPassword: 'new-password' })
      .expect(204);

    expect(response.text).toBe('');
    expect(usersService.changePassword).toHaveBeenCalledWith('user-1', {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    });
  });

  it('PATCH /users/me/password sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .patch('/users/me/password')
      .send({ currentPassword: 'old-password', newPassword: 'new-password' })
      .expect(401);
  });

  it('DELETE /users/me autenticado devuelve 204 sin body', async () => {
    const response = await request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', authorizationHeader())
      .send({ password: 'old-password' })
      .expect(204);

    expect(response.text).toBe('');
    expect(usersService.deleteMe).toHaveBeenCalledWith('user-1', {
      password: 'old-password',
    });
  });

  it('DELETE /users/me sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .delete('/users/me')
      .send({ password: 'old-password' })
      .expect(401);
  });

  it('PATCH /users/me rechaza email no permitido con 400', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', authorizationHeader())
      .send({ email: 'other@example.com' })
      .expect(400);
  });
});
