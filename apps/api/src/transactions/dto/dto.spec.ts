import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  AllowedTransactionType,
  CreateTransactionDto,
  TransactionQueryDto,
  TransactionStatusDto,
  UpdateTransactionDto,
} from './index';

const validInput = {
  accountId: '550e8400-e29b-41d4-a716-446655440000',
  categoryId: '550e8400-e29b-41d4-a716-446655440001',
  type: AllowedTransactionType.EXPENSE,
  amount: '150.50',
  description: 'Supermercado',
  date: '2026-10-15T10:00:00-05:00',
  status: TransactionStatusDto.CONFIRMED,
};

describe('Transactions DTOs', () => {
  describe('CreateTransactionDto', () => {
    it('acepta los campos válidos y permite campos opcionales vacíos', async () => {
      const valid = plainToInstance(CreateTransactionDto, validInput);
      const withoutOptional = plainToInstance(CreateTransactionDto, {
        accountId: validInput.accountId,
        type: AllowedTransactionType.INCOME,
        amount: '500',
        date: validInput.date,
      });

      await expect(validate(valid)).resolves.toHaveLength(0);
      await expect(validate(withoutOptional)).resolves.toHaveLength(0);
    });

    it.each([
      ['accountId', 'not-a-uuid'],
      ['type', 'TRANSFER'],
      ['amount', '-10'],
      ['amount', '1.234'],
      ['date', 'not-a-date'],
      ['date', '2026-10-15T10:00:00'],
      ['status', 'INVALID'],
    ])('rechaza %s con valor inválido', async (field, value) => {
      const dto = plainToInstance(CreateTransactionDto, { ...validInput, [field]: value });
      expect(await validate(dto)).not.toHaveLength(0);
    });

    it('rechaza una descripción que excede 500 caracteres', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        ...validInput,
        description: 'x'.repeat(501),
      });

      expect(await validate(dto)).not.toHaveLength(0);
    });
  });

  describe('UpdateTransactionDto', () => {
    it('acepta campos opcionales y permite cambiar a un tipo de movimiento soportado', async () => {
      const dto = plainToInstance(UpdateTransactionDto, {
        type: AllowedTransactionType.INCOME,
        status: TransactionStatusDto.PENDING,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('rechaza type TRANSFER', async () => {
      const dto = plainToInstance(UpdateTransactionDto, { type: 'TRANSFER' });

      expect(await validate(dto)).not.toHaveLength(0);
    });

    it('permite null explícito para limpiar categoryId y description', async () => {
      const dto = plainToInstance(UpdateTransactionDto, {
        categoryId: null,
        description: null,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });
  });

  describe('TransactionQueryDto', () => {
    it('transforma page y limit y acepta filtros soportados', async () => {
      const dto = plainToInstance(TransactionQueryDto, {
        page: '2',
        limit: '50',
        type: 'EXPENSE',
        includeDeleted: 'true',
        from: '2026-10-01',
        to: '2026-10-31',
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(50);
    });

    it.each([
      { page: '0' },
      { limit: '101' },
      { limit: '1.5' },
      { type: 'TRANSFER' },
      { includeDeleted: 'yes' },
      { from: '2026-13-50' },
    ])('rechaza filtros y paginación inválidos: %o', async (input) => {
      const dto = plainToInstance(TransactionQueryDto, input);

      expect(await validate(dto)).not.toHaveLength(0);
    });
  });
});
