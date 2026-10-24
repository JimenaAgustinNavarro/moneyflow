import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Category, CategoryType, Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

const category: Category = {
  id: 'category-1',
  userId: 'user-1',
  name: 'Comida',
  type: CategoryType.EXPENSE,
  parentId: null,
  icon: 'utensils',
  color: '#f59e0b',
  isSystem: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
};

const systemCategory: Category = {
  ...category,
  id: 'system-1',
  userId: null,
  isSystem: true,
};

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    transaction: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      transaction: { count: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(CategoriesService);
  });

  describe('findAll', () => {
    it('lista las categorías activas del sistema y del usuario', async () => {
      prisma.category.findMany.mockResolvedValue([systemCategory, category]);

      const result = await service.findAll('user-1');

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [{ isSystem: true, userId: null }, { userId: 'user-1' }],
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      });
      expect(result).toHaveLength(2);
      expect(result[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('aplica filtros de tipo e incluye eliminadas cuando se solicita', async () => {
      prisma.category.findMany.mockResolvedValue([]);

      await service.findAll('user-1', CategoryType.INCOME, true);

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          type: CategoryType.INCOME,
          OR: [{ isSystem: true, userId: null }, { userId: 'user-1' }],
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      });
    });
  });

  describe('create', () => {
    const dto = { name: 'Mascotas', type: CategoryType.EXPENSE };

    it('crea una categoría del usuario', async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({ ...category, name: dto.name });

      const result = await service.create('user-1', dto);

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Mascotas',
          type: CategoryType.EXPENSE,
          parentId: null,
          icon: null,
          color: null,
          isSystem: false,
        },
      });
      expect(result.name).toBe('Mascotas');
    });

    it('rechaza un padre inexistente o no accesible con 404', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', { ...dto, parentId: 'parent-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('rechaza un padre de otro usuario con 404', async () => {
      prisma.category.findFirst.mockResolvedValue({ ...category, userId: 'user-2' });

      await expect(
        service.create('user-1', { ...dto, parentId: 'parent-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza un padre ya anidado con 422', async () => {
      prisma.category.findFirst.mockResolvedValue({ ...category, parentId: 'root-1' });

      await expect(
        service.create('user-1', { ...dto, parentId: 'parent-1' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rechaza un padre de tipo distinto con 422', async () => {
      prisma.category.findFirst.mockResolvedValue({
        ...category,
        type: CategoryType.INCOME,
      });

      await expect(
        service.create('user-1', { ...dto, parentId: 'parent-1' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rechaza nombres activos duplicados con 409', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'existing-1' });

      await expect(service.create('user-1', dto)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('convierte P2002 en 409', async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique constraint', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await expect(service.create('user-1', dto)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('findOne', () => {
    it('devuelve una categoría del sistema accesible', async () => {
      prisma.category.findFirst.mockResolvedValue(systemCategory);

      await expect(service.findOne('user-1', systemCategory.id)).resolves.toMatchObject({
        id: systemCategory.id,
        isSystem: true,
      });
    });

    it('responde 404 si no existe o no es accesible', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('actualiza solo los campos permitidos', async () => {
      prisma.category.findFirst.mockResolvedValueOnce(category);
      prisma.category.update.mockResolvedValue({ ...category, name: 'Alimentos' });

      await expect(
        service.update('user-1', category.id, { name: 'Alimentos' }),
      ).resolves.toMatchObject({ name: 'Alimentos' });
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: category.id },
        data: { name: 'Alimentos' },
      });
    });

    it('responde 403 al intentar editar una categoría del sistema', async () => {
      prisma.category.findFirst.mockResolvedValue(systemCategory);

      await expect(
        service.update('user-1', systemCategory.id, { name: 'Nuevo nombre' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('responde 404 para categorías de otro usuario', async () => {
      prisma.category.findFirst.mockResolvedValue({ ...category, userId: 'user-2' });

      await expect(
        service.update('user-1', category.id, { name: 'Nuevo nombre' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('responde 409 si el nombre ya está activo', async () => {
      prisma.category.findFirst
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce({ id: 'category-2' });

      await expect(
        service.update('user-1', category.id, { name: 'Otro nombre' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft-deletes la categoría si no tiene bloqueos', async () => {
      prisma.category.findFirst.mockResolvedValueOnce(category).mockResolvedValueOnce(null);
      prisma.transaction.count.mockResolvedValue(0);
      prisma.category.update.mockResolvedValue({ ...category, deletedAt: new Date() });

      await expect(service.remove('user-1', category.id)).resolves.toBeUndefined();
      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: { categoryId: category.id, status: 'CONFIRMED', deletedAt: null },
      });
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: category.id },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('responde 403 al intentar borrar una categoría del sistema', async () => {
      prisma.category.findFirst.mockResolvedValue(systemCategory);

      await expect(service.remove('user-1', systemCategory.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('responde 409 si hay movimientos confirmados no eliminados', async () => {
      prisma.category.findFirst.mockResolvedValueOnce(category);
      prisma.transaction.count.mockResolvedValue(1);
      prisma.category.findFirst.mockResolvedValueOnce(null);

      await expect(service.remove('user-1', category.id)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('responde 409 si hay subcategorías activas', async () => {
      prisma.category.findFirst.mockResolvedValueOnce(category).mockResolvedValueOnce({
        id: 'child-1',
      });
      prisma.transaction.count.mockResolvedValue(0);

      await expect(service.remove('user-1', category.id)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    const deletedCategory = { ...category, deletedAt: new Date('2026-01-02T00:00:00.000Z') };

    it('restaura una categoría eliminada', async () => {
      prisma.category.findFirst.mockResolvedValueOnce(deletedCategory).mockResolvedValueOnce(null);
      prisma.category.update.mockResolvedValue(category);

      await expect(service.restore('user-1', category.id)).resolves.toMatchObject({
        id: category.id,
      });
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: category.id },
        data: { deletedAt: null },
      });
    });

    it('responde 404 si no está eliminada o no pertenece al usuario', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.restore('user-1', category.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('responde 409 si otra categoría activa usa el mismo nombre', async () => {
      prisma.category.findFirst
        .mockResolvedValueOnce(deletedCategory)
        .mockResolvedValueOnce({ id: 'category-2' });

      await expect(service.restore('user-1', category.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
