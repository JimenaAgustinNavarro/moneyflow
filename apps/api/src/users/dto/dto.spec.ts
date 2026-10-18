import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto, DeleteUserDto, UpdateUserDto } from './index';

describe('Users DTOs', () => {
  it('acepta nombre válido y rechaza nombre vacío o mayor a 100 caracteres', async () => {
    const valid = plainToInstance(UpdateUserDto, { name: 'Nombre válido' });
    const empty = plainToInstance(UpdateUserDto, { name: '' });
    const tooLong = plainToInstance(UpdateUserDto, { name: 'x'.repeat(101) });

    await expect(validate(valid)).resolves.toHaveLength(0);
    expect(await validate(empty)).not.toHaveLength(0);
    expect(await validate(tooLong)).not.toHaveLength(0);
  });

  it('acepta una timezone IANA válida y rechaza una inválida', async () => {
    const valid = plainToInstance(UpdateUserDto, { timezone: 'America/Lima' });
    const invalid = plainToInstance(UpdateUserDto, { timezone: 'Foo/Bar' });

    await expect(validate(valid)).resolves.toHaveLength(0);
    expect(await validate(invalid)).not.toHaveLength(0);
  });

  it('rechaza email no declarado en UpdateUserDto con whitelist estricta', async () => {
    const dto = plainToInstance(UpdateUserDto, { email: 'other@example.com' });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('valida las contraseñas de cambio', async () => {
    const valid = plainToInstance(ChangePasswordDto, {
      currentPassword: 'current-password',
      newPassword: 'new-password',
    });
    const shortNewPassword = plainToInstance(ChangePasswordDto, {
      currentPassword: 'current-password',
      newPassword: 'short',
    });
    const emptyCurrentPassword = plainToInstance(ChangePasswordDto, {
      currentPassword: '',
      newPassword: 'new-password',
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    expect(await validate(shortNewPassword)).not.toHaveLength(0);
    expect(await validate(emptyCurrentPassword)).not.toHaveLength(0);
  });

  it('rechaza password vacío en DeleteUserDto', async () => {
    const dto = plainToInstance(DeleteUserDto, { password: '' });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
