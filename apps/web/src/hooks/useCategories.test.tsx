import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({ authenticatedRequest }));

import {
  categoryKeys,
  useCategories,
  useCategory,
  useCreateCategory,
  useDeleteCategory,
  useRestoreCategory,
  useUpdateCategory,
} from './useCategories';
import type { Category } from '@/types/category';

const category: Category = {
  id: 'category-1',
  name: 'Alimentación',
  type: 'EXPENSE',
  parentId: null,
  icon: 'utensils',
  color: '#f59e0b',
  isSystem: false,
  createdAt: '2026-10-23T00:00:00Z',
};

function createWrapper(
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, wrapper: Wrapper };
}

describe('hooks de categorías', () => {
  beforeEach(() => {
    authenticatedRequest.mockReset();
  });

  it('consulta la lista con filtros opcionales y carga el detalle', async () => {
    authenticatedRequest.mockResolvedValueOnce([category]).mockResolvedValueOnce(category);
    const { wrapper } = createWrapper();
    const { result: list } = renderHook(() => useCategories('EXPENSE', true), { wrapper });
    await waitFor(() => expect(list.current.isSuccess).toBe(true));

    const { result: detail } = renderHook(() => useCategory(category.id), { wrapper });
    await waitFor(() => expect(detail.current.isSuccess).toBe(true));

    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      1,
      '/categories?type=EXPENSE&includeDeleted=true',
    );
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, '/categories/category-1');
  });

  it('mantiene deshabilitada la consulta de detalle cuando no hay id', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCategory(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(authenticatedRequest).not.toHaveBeenCalled();
  });

  it('envía las mutaciones y las invalida bajo la clave categories', async () => {
    authenticatedRequest.mockResolvedValue(category);
    const { queryClient, wrapper } = createWrapper();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result: create } = renderHook(() => useCreateCategory(), { wrapper });
    const { result: update } = renderHook(() => useUpdateCategory(), { wrapper });
    const { result: remove } = renderHook(() => useDeleteCategory(), { wrapper });
    const { result: restore } = renderHook(() => useRestoreCategory(), { wrapper });

    await act(async () => {
      await create.current.mutateAsync({
        name: category.name,
        type: category.type,
        parentId: null,
      });
      await update.current.mutateAsync({
        id: category.id,
        input: { name: 'Comida' },
      });
      await remove.current.mutateAsync(category.id);
      await restore.current.mutateAsync(category.id);
    });

    expect(authenticatedRequest).toHaveBeenNthCalledWith(1, '/categories', {
      method: 'POST',
      body: JSON.stringify({ name: category.name, type: category.type, parentId: null }),
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, '/categories/category-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Comida' }),
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(3, '/categories/category-1', {
      method: 'DELETE',
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(4, '/categories/category-1/restore', {
      method: 'POST',
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(4);
    for (const [options] of invalidateQueries.mock.calls) {
      expect(options).toEqual({ queryKey: categoryKeys.all });
    }
  });
});
