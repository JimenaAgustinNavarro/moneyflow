jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../types/jwt-payload.type';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Controller()
class GuardTestController {
  @Get('protected')
  getProtected(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Public()
  @Get('public')
  getPublic(): { status: string } {
    return { status: 'public' };
  }
}

describe('JwtAuthGuard', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-access-secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [GuardTestController],
      providers: [
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
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('acepta un token válido e inyecta el usuario autenticado', async () => {
    const token = jwtService.sign({
      sub: 'user-1',
      email: 'jimena@example.com',
    });

    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        id: 'user-1',
        email: 'jimena@example.com',
      });
  });

  it('rechaza un token inválido', async () => {
    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', 'Bearer token-inválido')
      .expect(401);
  });

  it('rechaza una solicitud sin token', async () => {
    await request(app.getHttpServer()).get('/protected').expect(401);
  });

  it('permite acceder a una ruta marcada como pública sin token', async () => {
    await request(app.getHttpServer())
      .get('/public')
      .expect(200)
      .expect({ status: 'public' });
  });
});
