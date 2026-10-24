import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateTransferDto } from './index';

const validTransfer = {
  originAccountId: '550e8400-e29b-41d4-a716-446655440000',
  destinationAccountId: '550e8400-e29b-41d4-a716-446655440001',
  amount: '300.00',
  description: 'Transferencia de ahorro',
  date: '2026-10-15T10:00:00-05:00',
};

describe('CreateTransferDto', () => {
  it('acepta una transferencia válida', async () => {
    const dto = plainToInstance(CreateTransferDto, validTransfer);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    ['originAccountId', 'invalid'],
    ['destinationAccountId', 'invalid'],
    ['amount', '-10'],
    ['amount', '1.234'],
    ['date', 'not-a-date'],
    ['date', '2026-10-15T10:00:00'],
  ])('rechaza %s inválido', async (property, value) => {
    const dto = plainToInstance(CreateTransferDto, {
      ...validTransfer,
      [property]: value,
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('permite description opcional y rechaza más de 500 caracteres', async () => {
    const withoutDescription = plainToInstance(CreateTransferDto, {
      ...validTransfer,
      description: undefined,
    });
    const tooLong = plainToInstance(CreateTransferDto, {
      ...validTransfer,
      description: 'x'.repeat(501),
    });

    await expect(validate(withoutDescription)).resolves.toHaveLength(0);
    expect(await validate(tooLong)).not.toHaveLength(0);
  });

  it('requiere date', async () => {
    const dto = plainToInstance(CreateTransferDto, {
      ...validTransfer,
      date: undefined,
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
