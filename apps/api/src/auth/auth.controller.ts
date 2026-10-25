import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto, LogoutDto, RefreshDto, RegisterDto } from './dto';
import { AuthenticatedUser } from './types/jwt-payload.type';

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { data: user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      dto,
      request.headers['user-agent'],
      request.ip,
    );
    response.cookie('accessToken', result.accessToken, cookieOptions(15 * 60 * 1000));
    response.cookie(
      'refreshToken',
      result.refreshToken,
      cookieOptions(30 * 24 * 60 * 60 * 1000),
    );
    return { data: result };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshDto | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refreshToken ?? dto?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const result = await this.authService.refresh(
      refreshToken,
      request.headers['user-agent'],
      request.ip,
    );
    response.cookie('accessToken', result.accessToken, cookieOptions(15 * 60 * 1000));
    response.cookie(
      'refreshToken',
      result.refreshToken,
      cookieOptions(30 * 24 * 60 * 60 * 1000),
    );
    return { data: result };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = request.cookies?.refreshToken ?? dto?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    await this.authService.logout(user.id, refreshToken);
    response.clearCookie('accessToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    response.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.authService.me(user.id) };
  }
}
