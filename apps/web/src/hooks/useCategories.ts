'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authenticatedRequest } from '@/lib/api-client';
import type {
  Category,
  CategoryType,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/types/category';

export const categoryKeys = {
  all: ['categories'] as const,
  list: (type?: CategoryType, includeDeleted = false) =>
    [...categoryKeys.all, 'list', { type, includeDeleted }] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
};

export function useCategories(type?: CategoryType, includeDeleted = false) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (includeDeleted) params.set('includeDeleted', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: categoryKeys.list(type, includeDeleted),
    queryFn: () => authenticatedRequest<Category[]>(`/categories${query}`),
  });
}

export function useCategory(id: string | null | undefined) {
  return useQuery({
    queryKey: categoryKeys.detail(id ?? ''),
    queryFn: () => authenticatedRequest<Category>(`/categories/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      authenticatedRequest<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

interface UpdateCategoryVariables {
  id: string;
  input: UpdateCategoryInput;
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: UpdateCategoryVariables) =>
      authenticatedRequest<Category>(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<void>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useRestoreCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      authenticatedRequest<Category>(`/categories/${id}/restore`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
