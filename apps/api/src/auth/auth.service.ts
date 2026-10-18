import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { LoginDto, LogoutDto, RefreshDto, RegisterDto } from './dto';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { JwtPayload } from './types/jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  hashRefreshToken(token: string): string {
    const secret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  verifyRefreshToken(token: string, tokenHash: string): boolean {
    if (!/^[a-f0-9]{64}$/i.test(tokenHash)) {
      return false;
    }

    const actualHash = Buffer.from(this.hashRefreshToken(token), 'hex');
    const expectedHash = Buffer.from(tokenHash, 'hex');
    return crypto.timingSafeEqual(actualHash, expectedHash);
  }

  getRefreshTokenExpiresAt(): Date {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  }

  async register(dto: RegisterDto): Promise<{
    id: string;
    email: string;
    name: string;
    createdAt: Date;
  }> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('El email ya está registrado.');
    }

    const passwordHash = await this.hashPassword(dto.password);

    try {
      return await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: dto.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El email ya está registrado.');
      }
      throw error;
    }
  }

  async login(
    dto: LoginDto,
    userAgent?: string,
    ip?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string };
  }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user || !(await this.verifyPassword(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const accessToken = this.generateAccessToken({
      sub: user.id,
      email: user.email,
    });
    const refreshToken = this.generateRefreshToken();

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.hashRefreshToken(refreshToken),
      expiresAt: this.getRefreshTokenExpiresAt(),
      userAgent,
      ip,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async refresh(
    dto: RefreshDto,
    userAgent?: string,
    ip?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const oldTokenHash = this.hashRefreshToken(dto.refreshToken);
    const oldToken = await this.refreshTokenRepository.findByHash(oldTokenHash);

    if (!oldToken) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: oldToken.userId, deletedAt: null },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const newRefreshToken = this.generateRefreshToken();
    const rotated = await this.refreshTokenRepository.rotate(oldTokenHash, {
      userId: oldToken.userId,
      tokenHash: this.hashRefreshToken(newRefreshToken),
      expiresAt: this.getRefreshTokenExpiresAt(),
      userAgent,
      ip,
    });

    if (!rotated) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const accessToken = this.generateAccessToken({
      sub: user.id,
      email: user.email,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, dto: LogoutDto): Promise<void> {
    const token = await this.refreshTokenRepository.findByHash(
      this.hashRefreshToken(dto.refreshToken),
    );

    if (
      !token ||
      token.userId !== userId ||
      token.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    await this.refreshTokenRepository.revoke(token.id);
  }

  async me(userId: string): Promise<{
    id: string;
    email: string;
    name: string;
    timezone: string;
    createdAt: Date;
  }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return user;
  }
}
