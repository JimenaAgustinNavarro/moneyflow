import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface RefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: RefreshTokenData) {
    return this.prisma.refreshToken.create({ data });
  }

  async findByHash(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
    });
  }

  async revoke(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async rotate(oldTokenHash: string, newTokenData: RefreshTokenData) {
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const oldToken = await transaction.refreshToken.findFirst({
        where: { tokenHash: oldTokenHash, revokedAt: null },
      });

      if (!oldToken || oldToken.userId !== newTokenData.userId || oldToken.expiresAt <= now) {
        return null;
      }

      const revoked = await transaction.refreshToken.updateMany({
        where: {
          id: oldToken.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      if (revoked.count !== 1) {
        return null;
      }

      return transaction.refreshToken.create({ data: newTokenData });
    });
  }
}
