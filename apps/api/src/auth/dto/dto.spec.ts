import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto, LogoutDto, RefreshDto, RegisterDto } from './index';

describe('Auth DTOs', () => {
  it('normaliza email a lowercase y trim en RegisterDto', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: '  TEST@Example.COM ',
      password: 'password123',
      name: 'Test User',
    });

    expect(dto.email).toBe('test@example.com');
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('normaliza email a lowercase y trim en LoginDto', async () => {
    const dto = plainToInstance(LoginDto, {
      email: '  TEST@Example.COM ',
      password: 'password123',
    });

    expect(dto.email).toBe('test@example.com');
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rechaza email inválido', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'no-es-email',
      password: 'password123',
      name: 'Test',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rechaza contraseña menor de 8 caracteres en RegisterDto', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'test@example.com',
      password: 'short',
      name: 'Test',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rechaza nombre vacío o mayor de 100 caracteres', async () => {
    const emptyName = plainToInstance(RegisterDto, {
      email: 'test@example.com',
      password: 'password123',
      name: '',
    });
    const longName = plainToInstance(RegisterDto, {
      email: 'test@example.com',
      password: 'password123',
      name: 'a'.repeat(101),
    });

    expect(await validate(emptyName)).not.toHaveLength(0);
    expect(await validate(longName)).not.toHaveLength(0);
  });

  it('rechaza refresh token vacío en RefreshDto y LogoutDto', async () => {
    const refresh = plainToInstance(RefreshDto, { refreshToken: '' });
    const logout = plainToInstance(LogoutDto, { refreshToken: '' });

    expect(await validate(refresh)).not.toHaveLength(0);
    expect(await validate(logout)).not.toHaveLength(0);
  });
});
