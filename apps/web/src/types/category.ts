export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  createdAt: string;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
}
