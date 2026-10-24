import { CategoryType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateCategoryDto, UpdateCategoryDto } from './index';

describe('Categories DTOs', () => {
  describe('CreateCategoryDto', () => {
    it('valida name y type', async () => {
      const valid = plainToInstance(CreateCategoryDto, {
        name: 'Mascotas',
        type: CategoryType.EXPENSE,
      });
      const emptyName = plainToInstance(CreateCategoryDto, {
        name: '',
        type: CategoryType.EXPENSE,
      });
      const longName = plainToInstance(CreateCategoryDto, {
        name: 'x'.repeat(61),
        type: CategoryType.EXPENSE,
      });
      const invalidType = plainToInstance(CreateCategoryDto, {
        name: 'Mascotas',
        type: 'INVALID',
      });

      await expect(validate(valid)).resolves.toHaveLength(0);
      expect(await validate(emptyName)).not.toHaveLength(0);
      expect(await validate(longName)).not.toHaveLength(0);
      expect(await validate(invalidType)).not.toHaveLength(0);
    });

    it('valida parentId y color opcionales', async () => {
      const valid = plainToInstance(CreateCategoryDto, {
        name: 'Mascotas',
        type: CategoryType.EXPENSE,
        parentId: '550e8400-e29b-41d4-a716-446655440000',
        color: '#f59e0b',
      });
      const invalidParent = plainToInstance(CreateCategoryDto, {
        name: 'Mascotas',
        type: CategoryType.EXPENSE,
        parentId: 'not-a-uuid',
      });
      const invalidColor = plainToInstance(CreateCategoryDto, {
        name: 'Mascotas',
        type: CategoryType.EXPENSE,
        color: 'orange',
      });

      await expect(validate(valid)).resolves.toHaveLength(0);
      expect(await validate(invalidParent)).not.toHaveLength(0);
      expect(await validate(invalidColor)).not.toHaveLength(0);
    });
  });

  describe('UpdateCategoryDto', () => {
    it('acepta name, icon y color válidos', async () => {
      const dto = plainToInstance(UpdateCategoryDto, {
        name: 'Mascotas y veterinaria',
        icon: 'dog',
        color: '#ef4444',
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it.each(['type', 'parentId'])('rechaza la propiedad no permitida %s', async (property) => {
      const dto = plainToInstance(UpdateCategoryDto, { [property]: 'EXPENSE' });
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(property);
    });
  });
});
