import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { JwtPayload } from './types/jwt-payload.type';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
}
