import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Category, CategoryType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(category: Category) {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      parentId: category.parentId,
      icon: category.icon,
      color: category.color,
      isSystem: category.isSystem,
      createdAt: category.createdAt.toISOString(),
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private async findOwnedCategory(userId: string, id: string): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }
    if (category.isSystem && category.userId === null) {
      throw new ForbiddenException('No puedes modificar una categoría del sistema.');
    }
    if (category.isSystem || category.userId !== userId) {
      throw new NotFoundException('Categoría no encontrada.');
    }
    return category;
  }

  async findAll(userId: string, type?: CategoryType, includeDeleted = false) {
    const categories = await this.prisma.category.findMany({
      where: {
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(type ? { type } : {}),
        OR: [{ isSystem: true, userId: null }, { userId }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return categories.map((category) => this.serialize(category));
  }

  async create(userId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, deletedAt: null },
      });
      const parentIsAccessible =
        parent &&
        ((parent.isSystem && parent.userId === null) ||
          (!parent.isSystem && parent.userId === userId));
      if (!parentIsAccessible) {
        throw new NotFoundException('Categoría padre no encontrada.');
      }
      if (parent.parentId !== null) {
        throw new UnprocessableEntityException('La jerarquía máxima es de 2 niveles.');
      }
      if (parent.type !== dto.type) {
        throw new UnprocessableEntityException('El tipo de la categoría padre no coincide.');
      }
    }

    const existing = await this.prisma.category.findFirst({
      where: {
        userId,
        name: dto.name,
        type: dto.type,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe una categoría con ese nombre.');
    }

    try {
      const category = await this.prisma.category.create({
        data: {
          userId,
          name: dto.name,
          type: dto.type,
          parentId: dto.parentId ?? null,
          icon: dto.icon ?? null,
          color: dto.color ?? null,
          isSystem: false,
        },
      });
      return this.serialize(category);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe una categoría con ese nombre.');
      }
      throw error;
    }
  }

  async findOne(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ isSystem: true, userId: null }, { userId }],
      },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }
    return this.serialize(category);
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOwnedCategory(userId, id);

    if (dto.name !== undefined && dto.name !== category.name) {
      const existing = await this.prisma.category.findFirst({
        where: {
          userId,
          name: dto.name,
          type: category.type,
          deletedAt: null,
          NOT: { id },
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Ya existe una categoría con ese nombre.');
      }
    }

    try {
      const updated = await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.icon !== undefined && { icon: dto.icon }),
          ...(dto.color !== undefined && { color: dto.color }),
        },
      });
      return this.serialize(updated);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe una categoría con ese nombre.');
      }
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedCategory(userId, id);

    const [confirmedCount, activeChild] = await Promise.all([
      this.prisma.transaction.count({
        where: {
          categoryId: id,
          status: 'CONFIRMED',
          deletedAt: null,
        },
      }),
      this.prisma.category.findFirst({
        where: { parentId: id, deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (confirmedCount > 0) {
      throw new ConflictException(
        'No puedes eliminar una categoría con movimientos confirmados. Reasígnalos primero.',
      );
    }
    if (activeChild) {
      throw new ConflictException(
        'No puedes eliminar una categoría que tiene subcategorías activas.',
      );
    }

    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId, deletedAt: { not: null }, isSystem: false },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada o no está eliminada.');
    }

    const existing = await this.prisma.category.findFirst({
      where: {
        userId,
        name: category.name,
        type: category.type,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe otra categoría activa con el mismo nombre.');
    }

    try {
      const restored = await this.prisma.category.update({
        where: { id },
        data: { deletedAt: null },
      });
      return this.serialize(restored);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe otra categoría activa con el mismo nombre.');
      }
      throw error;
    }
  }
}
