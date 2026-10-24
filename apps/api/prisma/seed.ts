import { Logger } from '@nestjs/common';
import { CategoryType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const logger = new Logger('CategoriesSeed');

const SYSTEM_CATEGORIES: Array<{
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}> = [
  { name: 'Sueldo', type: CategoryType.INCOME, icon: 'wallet', color: '#10b981' },
  { name: 'Freelance', type: CategoryType.INCOME, icon: 'briefcase', color: '#059669' },
  { name: 'Inversiones', type: CategoryType.INCOME, icon: 'trending-up', color: '#0ea5e9' },
  {
    name: 'Otros ingresos',
    type: CategoryType.INCOME,
    icon: 'plus-circle',
    color: '#6366f1',
  },
  { name: 'Alquiler', type: CategoryType.EXPENSE, icon: 'home', color: '#ef4444' },
  { name: 'Comida', type: CategoryType.EXPENSE, icon: 'utensils', color: '#f59e0b' },
  { name: 'Transporte', type: CategoryType.EXPENSE, icon: 'car', color: '#3b82f6' },
  { name: 'Salud', type: CategoryType.EXPENSE, icon: 'heart-pulse', color: '#ec4899' },
  { name: 'Ocio', type: CategoryType.EXPENSE, icon: 'gamepad-2', color: '#8b5cf6' },
  { name: 'Educación', type: CategoryType.EXPENSE, icon: 'graduation-cap', color: '#14b8a6' },
  { name: 'Servicios', type: CategoryType.EXPENSE, icon: 'receipt', color: '#f97316' },
  {
    name: 'Otros gastos',
    type: CategoryType.EXPENSE,
    icon: 'more-horizontal',
    color: '#64748b',
  },
];

async function main(): Promise<void> {
  for (const category of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        name: category.name,
        type: category.type,
        isSystem: true,
        userId: null,
        deletedAt: null,
      },
    });
    if (existing) {
      logger.log(`Ya existe: ${category.name} (${category.type})`);
      continue;
    }

    await prisma.category.create({
      data: {
        ...category,
        isSystem: true,
        userId: null,
      },
    });
    logger.log(`Creada: ${category.name} (${category.type})`);
  }
}

main()
  .catch((error: unknown) => {
    logger.error('No se pudo completar la seed de categorías.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
