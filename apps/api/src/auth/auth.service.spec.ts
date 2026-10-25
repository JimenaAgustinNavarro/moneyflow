jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './types/jwt-payload.type';

const activeUser = {
  id: 'user-1',
  email: 'jimena@example.com',
  passwordHash: 'password-hash',
  name: 'Jimena',
  timezone: 'America/Lima',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prisma: {
    user: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };
  let refreshTokenRepository: {
    create: jest.Mock;
    findByHash: jest.Mock;
    rotate: jest.Mock;
    revoke: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    refreshTokenRepository = {
      create: jest.fn(),
      findByHash: jest.fn(),
      rotate: jest.fn(),
      revoke: jest.fn(),
    };

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
        { provide: PrismaService, useValue: prisma },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepository },
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

  describe('register', () => {
    const dto: RegisterDto = {
      email: '  JIMENA@example.com ',
      password: 'password123',
      name: 'Jimena',
    };

    it('crea usuario con email normalizado y no devuelve passwordHash', async () => {
      const result = {
        id: activeUser.id,
        email: activeUser.email,
        name: activeUser.name,
        createdAt: activeUser.createdAt,
      };
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(result);
      jest.spyOn(service, 'hashPassword').mockResolvedValue('hashed-password');

      await expect(service.register(dto)).resolves.toEqual(result);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'jimena@example.com', deletedAt: null },
        select: { id: true },
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: 'jimena@example.com',
            passwordHash: 'hashed-password',
            name: 'Jimena',
          },
        }),
      );
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('rechaza un email activo duplicado con 409', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: activeUser.id });

      await expect(service.register(dto)).rejects.toMatchObject({
        status: 409,
        message: 'El email ya está registrado.',
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('convierte P2002 de create en 409', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      jest.spyOn(service, 'hashPassword').mockResolvedValue('hashed-password');
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique constraint', {
          code: 'P2002',
          clientVersion: '6.19.3',
          meta: { target: ['email'] },
        }),
      );

      await expect(service.register(dto)).rejects.toMatchObject({
        status: 409,
        message: 'El email ya está registrado.',
      });
    });
  });

  describe('login', () => {
    const dto: LoginDto = { email: ' JIMENA@EXAMPLE.COM ', password: 'password123' };

    it('devuelve tokens y persiste únicamente el hash del refresh token', async () => {
      prisma.user.findFirst.mockResolvedValue(activeUser);
      jest.spyOn(service, 'verifyPassword').mockResolvedValue(true);
      refreshTokenRepository.create.mockResolvedValue({});

      const result = await service.login(dto, 'test-agent', '127.0.0.1');
      const storedToken = refreshTokenRepository.create.mock.calls[0][0] as {
        tokenHash: string;
        userAgent: string;
        ip: string;
      };

      expect(result.user).toEqual({
        id: activeUser.id,
        email: activeUser.email,
        name: activeUser.name,
      });
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(storedToken.tokenHash).toBe(service.hashRefreshToken(result.refreshToken));
      expect(storedToken.tokenHash).not.toBe(result.refreshToken);
      expect(storedToken.userAgent).toBe('test-agent');
      expect(storedToken.ip).toBe('127.0.0.1');
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'jimena@example.com', deletedAt: null },
      });
    });

    it('rechaza usuario inexistente con 401', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toMatchObject({
        status: 401,
        message: 'Credenciales inválidas.',
      });
    });

    it('rechaza contraseña incorrecta con 401', async () => {
      prisma.user.findFirst.mockResolvedValue(activeUser);
      jest.spyOn(service, 'verifyPassword').mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toMatchObject({
        status: 401,
        message: 'Credenciales inválidas.',
      });
    });
  });

  describe('refresh', () => {
    const refreshToken = 'old-refresh-token';
    const oldToken = {
      id: 'token-1',
      userId: activeUser.id,
      tokenHash: 'old-hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    };

    it('rota el refresh token y devuelve tokens nuevos', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue(oldToken);
      prisma.user.findFirst.mockResolvedValue({
        id: activeUser.id,
        email: activeUser.email,
      });
      refreshTokenRepository.rotate.mockResolvedValue({ id: 'token-2' });

      const result = await service.refresh(refreshToken, 'test-agent', '127.0.0.1');
      const [, newTokenData] = refreshTokenRepository.rotate.mock.calls[0] as [
        string,
        { userAgent: string; ip: string; tokenHash: string },
      ];

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(newTokenData.tokenHash).toBe(service.hashRefreshToken(result.refreshToken));
      expect(newTokenData.userAgent).toBe('test-agent');
      expect(newTokenData.ip).toBe('127.0.0.1');
    });

    it('rechaza un token no encontrado con 401', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toMatchObject({
        status: 401,
        message: 'Refresh token inválido.',
      });
    });

    it('rechaza la renovación cuando rotate devuelve null', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue(oldToken);
      prisma.user.findFirst.mockResolvedValue({
        id: activeUser.id,
        email: activeUser.email,
      });
      refreshTokenRepository.rotate.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toMatchObject({
        status: 401,
        message: 'Refresh token inválido.',
      });
    });

    it('rechaza el refresh si el usuario fue borrado', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue(oldToken);
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toMatchObject({
        status: 401,
        message: 'Refresh token inválido.',
      });
      expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const refreshToken = 'refresh-token';
    const token = {
      id: 'token-1',
      userId: activeUser.id,
      expiresAt: new Date(Date.now() + 60_000),
    };

    it('revoca el token perteneciente al usuario autenticado', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue(token);

      await expect(service.logout(activeUser.id, refreshToken)).resolves.toBeUndefined();
      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith(token.id);
    });

    it('rechaza un token no encontrado con 401', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue(null);

      await expect(service.logout(activeUser.id, refreshToken)).rejects.toMatchObject({
        status: 401,
        message: 'Refresh token inválido.',
      });
    });

    it('rechaza un token perteneciente a otro usuario', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue({
        ...token,
        userId: 'other-user',
      });

      await expect(service.logout(activeUser.id, refreshToken)).rejects.toMatchObject({
        status: 401,
        message: 'Refresh token inválido.',
      });
      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    });

    it('rechaza un token expirado', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue({
        ...token,
        expiresAt: new Date(Date.now() - 1),
      });

      await expect(service.logout(activeUser.id, refreshToken)).rejects.toMatchObject({
        status: 401,
        message: 'Refresh token inválido.',
      });
    });
  });

  describe('me', () => {
    it('devuelve los campos públicos del usuario activo', async () => {
      const result = {
        id: activeUser.id,
        email: activeUser.email,
        name: activeUser.name,
        timezone: activeUser.timezone,
        createdAt: activeUser.createdAt,
      };
      prisma.user.findFirst.mockResolvedValue(result);

      await expect(service.me(activeUser.id)).resolves.toEqual(result);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: activeUser.id, deletedAt: null },
        select: {
          id: true,
          email: true,
          name: true,
          timezone: true,
          createdAt: true,
        },
      });
    });

    it('devuelve 404 si el usuario no existe o fue borrado', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.me(activeUser.id)).rejects.toMatchObject({
        status: 404,
        message: 'Usuario no encontrado.',
      });
    });
  });
});
