jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtPayload } from './types/jwt-payload.type';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: new JwtService({
            secret: 'test-access-secret',
            signOptions: { expiresIn: '15m' },
          }),
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string): string => {
              if (key === 'JWT_REFRESH_SECRET') {
                return 'test-refresh-secret';
              }
              throw new Error(`Configuración requerida ausente: ${key}`);
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
  });

  describe('hashPassword / verifyPassword', () => {
    it('hashea y verifica una contraseña correcta con Argon2id', async () => {
      const hash = await service.hashPassword('password123');

      expect(hash).toMatch(/^\$argon2id\$/);
      await expect(service.verifyPassword(hash, 'password123')).resolves.toBe(true);
      await expect(service.verifyPassword(hash, 'incorrecta')).resolves.toBe(false);
    });
  });

  describe('generateAccessToken', () => {
    it('firma un token con subject, email y expiración de 15 minutos', () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'jimena@example.com',
      };
      const token = service.generateAccessToken(payload);
      const decoded = jwtService.verify<JwtPayload>(token);

      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp! - decoded.iat!).toBe(15 * 60);
    });
  });

  describe('refresh tokens', () => {
    it('genera tokens únicos y opacos', () => {
      const firstToken = service.generateRefreshToken();
      const secondToken = service.generateRefreshToken();

      expect(firstToken).not.toBe(secondToken);
      expect(firstToken.length).toBeGreaterThan(40);
    });

    it('calcula un HMAC determinístico y verifica el token', () => {
      const token = service.generateRefreshToken();
      const tokenHash = service.hashRefreshToken(token);

      expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(service.hashRefreshToken(token)).toBe(tokenHash);
      expect(service.verifyRefreshToken(token, tokenHash)).toBe(true);
      expect(service.verifyRefreshToken('otro-token', tokenHash)).toBe(false);
      expect(service.verifyRefreshToken(token, 'hash-inválido')).toBe(false);
    });

    it('establece una expiración de 30 días', () => {
      const before = Date.now();
      const expiresAt = service.getRefreshTokenExpiresAt();
      const after = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + thirtyDays);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after + thirtyDays);
    });
  });
});
