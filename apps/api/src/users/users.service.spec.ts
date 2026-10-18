jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { RefreshTokenRepository } from '../auth/repositories/refresh-token.repository';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, DeleteUserDto, UpdateUserDto } from './dto';
import { UsersService } from './users.service';

const user = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'old-password-hash',
  name: 'Test User',
  timezone: 'America/Lima',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  deletedAt: null,
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let authService: {
    verifyPassword: jest.Mock;
    hashPassword: jest.Mock;
  };
  let refreshTokenRepository: {
    revokeAllForUserTx: jest.Mock;
  };
  let transaction: {
    user: { update: jest.Mock };
    refreshToken: { updateMany: jest.Mock };
  };

  beforeEach(async () => {
    transaction = {
      user: { update: jest.fn().mockResolvedValue(user) },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    const prismaTransaction = transaction as unknown as Prisma.TransactionClient;
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(
        (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(prismaTransaction),
      ),
    };
    authService = {
      verifyPassword: jest.fn(),
      hashPassword: jest.fn(),
    };
    refreshTokenRepository = {
      revokeAllForUserTx: jest.fn().mockResolvedValue(2),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: authService },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepository },
        {
          provide: JwtService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (): string => 'test-secret',
          },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('updateMe', () => {
    const updatedUser = {
      id: user.id,
      email: user.email,
      name: 'New Name',
      timezone: user.timezone,
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    };

    it('actualiza nombre sin cambiar email', async () => {
      const updateDto: UpdateUserDto = { name: 'New Name' };
      prisma.user.findFirst.mockResolvedValue({ id: user.id });
      prisma.user.update.mockResolvedValue(updatedUser);

      await expect(
        service.updateMe(user.id, updateDto),
      ).resolves.toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'New Name' },
          select: expect.objectContaining({ email: true }),
        }),
      );
      expect(prisma.user.update.mock.calls[0][0].data).not.toHaveProperty('email');
    });

    it('actualiza timezone', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: user.id });
      prisma.user.update.mockResolvedValue({
        ...updatedUser,
        timezone: 'America/New_York',
      });

      await expect(
        service.updateMe(user.id, { timezone: 'America/New_York' }),
      ).resolves.toMatchObject({ timezone: 'America/New_York' });
    });

    it('actualiza nombre y timezone en una solicitud', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: user.id });
      prisma.user.update.mockResolvedValue({
        ...updatedUser,
        timezone: 'America/New_York',
      });

      await service.updateMe(user.id, {
        name: 'New Name',
        timezone: 'America/New_York',
      });

      expect(prisma.user.update.mock.calls[0][0].data).toEqual({
        name: 'New Name',
        timezone: 'America/New_York',
      });
    });

    it('rechaza DTO vacío con 400', async () => {
      await expect(service.updateMe(user.id, {})).rejects.toMatchObject({
        status: 400,
        message: 'Debes enviar al menos un campo para actualizar (name o timezone).',
      });
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('responde 404 para un usuario inexistente o borrado', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMe(user.id, { name: 'New Name' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: user.id, deletedAt: null },
        select: { id: true },
      });
    });
  });

  describe('changePassword', () => {
    const dto: ChangePasswordDto = {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    };

    it('actualiza el hash y revoca tokens en una transacción', async () => {
      prisma.user.findFirst.mockResolvedValue(user);
      authService.verifyPassword.mockResolvedValue(true);
      authService.hashPassword.mockResolvedValue('new-password-hash');

      await expect(service.changePassword(user.id, dto)).resolves.toBeUndefined();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(transaction.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { passwordHash: 'new-password-hash' },
      });
      expect(refreshTokenRepository.revokeAllForUserTx).toHaveBeenCalledWith(
        transaction as unknown as Prisma.TransactionClient,
        user.id,
      );
    });

    it('responde 401 si la contraseña actual no coincide', async () => {
      prisma.user.findFirst.mockResolvedValue(user);
      authService.verifyPassword.mockResolvedValue(false);

      await expect(service.changePassword(user.id, dto)).rejects.toMatchObject({
        status: 401,
        message: 'La contraseña actual es incorrecta.',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('responde 400 si la nueva contraseña es igual a la actual', async () => {
      prisma.user.findFirst.mockResolvedValue(user);
      authService.verifyPassword.mockResolvedValue(true);

      await expect(
        service.changePassword(user.id, {
          currentPassword: 'same-password',
          newPassword: 'same-password',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(authService.hashPassword).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('responde 404 si el usuario no existe o está borrado', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.changePassword(user.id, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(authService.verifyPassword).not.toHaveBeenCalled();
    });
  });

  describe('deleteMe', () => {
    const dto: DeleteUserDto = { password: 'old-password' };

    it('marca deletedAt y revoca tokens en una transacción', async () => {
      prisma.user.findFirst.mockResolvedValue(user);
      authService.verifyPassword.mockResolvedValue(true);

      await expect(service.deleteMe(user.id, dto)).resolves.toBeUndefined();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(transaction.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { deletedAt: expect.any(Date) },
      });
      expect(refreshTokenRepository.revokeAllForUserTx).toHaveBeenCalledWith(
        transaction as unknown as Prisma.TransactionClient,
        user.id,
      );
    });

    it('responde 401 si la contraseña no coincide', async () => {
      prisma.user.findFirst.mockResolvedValue(user);
      authService.verifyPassword.mockResolvedValue(false);

      await expect(service.deleteMe(user.id, dto)).rejects.toMatchObject({
        status: 401,
        message: 'La contraseña es incorrecta.',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('responde 404 si el usuario no existe o está borrado', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.deleteMe(user.id, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(authService.verifyPassword).not.toHaveBeenCalled();
    });
  });
});
