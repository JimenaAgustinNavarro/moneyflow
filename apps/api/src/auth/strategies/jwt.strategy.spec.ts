jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types/jwt-payload.type';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let findFirst: jest.Mock;

  beforeEach(async () => {
    findFirst = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => 'test-access-secret',
          },
        },
        {
          provide: PrismaService,
          useValue: { user: { findFirst } },
        },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
  });

  it('acepta un usuario activo y devuelve sus datos de base de datos', async () => {
    findFirst.mockResolvedValue({ id: 'user-1', email: 'ana@example.com' });
    const payload: JwtPayload = { sub: 'user-1', email: 'old@example.com' };

    await expect(strategy.validate(payload)).resolves.toEqual({
      id: 'user-1',
      email: 'ana@example.com',
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'user-1', deletedAt: null },
      select: { id: true, email: true },
    });
  });

  it('rechaza un usuario eliminado con 401', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'deleted-user', email: 'ana@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un usuario inexistente con 401', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'missing-user', email: 'ana@example.com' }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Usuario no encontrado o eliminado.',
    });
  });
});
