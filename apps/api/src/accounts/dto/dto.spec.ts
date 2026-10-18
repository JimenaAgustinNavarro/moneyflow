import { AccountType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateAccountDto, UpdateAccountDto } from './index';

describe('Accounts DTOs', () => {
  describe('CreateAccountDto', () => {
    it('acepta nombre válido y rechaza nombre vacío o mayor de 60 caracteres', async () => {
      const valid = plainToInstance(CreateAccountDto, {
        name: 'Ahorros',
        type: AccountType.BANK,
        initialBalance: '1000',
      });
      const empty = plainToInstance(CreateAccountDto, {
        name: '',
        type: AccountType.BANK,
        initialBalance: '1000',
      });
      const tooLong = plainToInstance(CreateAccountDto, {
        name: 'x'.repeat(61),
        type: AccountType.BANK,
        initialBalance: '1000',
      });

      await expect(validate(valid)).resolves.toHaveLength(0);
      expect(await validate(empty)).not.toHaveLength(0);
      expect(await validate(tooLong)).not.toHaveLength(0);
    });

    it('acepta solo los tipos de cuenta declarados', async () => {
      const valid = plainToInstance(CreateAccountDto, {
        name: 'Ahorros',
        type: AccountType.BANK,
        initialBalance: '1000',
      });
      const invalid = plainToInstance(CreateAccountDto, {
        name: 'Ahorros',
        type: 'INVALID',
        initialBalance: '1000',
      });

      await expect(validate(valid)).resolves.toHaveLength(0);
      expect(await validate(invalid)).not.toHaveLength(0);
    });

    it.each(['1000', '1000.50'])('acepta initialBalance %s', async (initialBalance) => {
      const dto = plainToInstance(CreateAccountDto, {
        name: 'Ahorros',
        type: AccountType.BANK,
        initialBalance,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it.each(['1000.555', '-100', 'abc'])('rechaza initialBalance %s', async (initialBalance) => {
      const dto = plainToInstance(CreateAccountDto, {
        name: 'Ahorros',
        type: AccountType.BANK,
        initialBalance,
      });

      expect(await validate(dto)).not.toHaveLength(0);
    });

    it('acepta currency opcional y exige tres caracteres cuando se envía', async () => {
      const base = {
        name: 'Ahorros',
        type: AccountType.BANK,
        initialBalance: '0',
      };
      const withoutCurrency = plainToInstance(CreateAccountDto, base);
      const withCurrency = plainToInstance(CreateAccountDto, {
        ...base,
        currency: 'PEN',
      });
      const invalidCurrency = plainToInstance(CreateAccountDto, {
        ...base,
        currency: 'US',
      });

      await expect(validate(withoutCurrency)).resolves.toHaveLength(0);
      await expect(validate(withCurrency)).resolves.toHaveLength(0);
      expect(await validate(invalidCurrency)).not.toHaveLength(0);
    });
  });

  describe('UpdateAccountDto', () => {
    it('acepta name, type y archived', async () => {
      const dto = plainToInstance(UpdateAccountDto, {
        name: 'Ahorros nuevos',
        type: AccountType.CASH,
        archived: true,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it.each(['initialBalance', 'currency'])(
      'rechaza la propiedad no permitida %s',
      async (property) => {
        const dto = plainToInstance(UpdateAccountDto, {
          [property]: property === 'initialBalance' ? '2000' : 'USD',
        });
        const errors = await validate(dto, {
          whitelist: true,
          forbidNonWhitelisted: true,
        });

        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe(property);
      },
    );
  });
});
