import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RefreshTokenRepository } from '../auth/repositories/refresh-token.repository';
import { ChangePasswordDto, DeleteUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async updateMe(userId: string, dto: UpdateUserDto) {
    if (dto.name === undefined && dto.timezone === undefined) {
      throw new BadRequestException(
        'Debes enviar al menos un campo para actualizar (name o timezone).',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const passwordMatches = await this.authService.verifyPassword(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual.',
      );
    }

    const passwordHash = await this.authService.hashPassword(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      await this.refreshTokenRepository.revokeAllForUserTx(tx, userId);
    });
  }

  async deleteMe(userId: string, dto: DeleteUserDto): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const passwordMatches = await this.authService.verifyPassword(
      user.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('La contraseña es incorrecta.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });
      await this.refreshTokenRepository.revokeAllForUserTx(tx, userId);
    });
  }
}
