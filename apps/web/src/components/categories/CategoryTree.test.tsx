import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CategoryTree } from './CategoryTree';
import type { Category } from '@/types/category';

const categories: Category[] = [
  {
    id: 'parent',
    name: 'Alimentación',
    type: 'EXPENSE',
    parentId: null,
    icon: 'utensils',
    color: '#f59e0b',
    isSystem: false,
    createdAt: '2026-10-23T00:00:00Z',
  },
  {
    id: 'child',
    name: 'Supermercado',
    type: 'EXPENSE',
    parentId: 'parent',
    icon: null,
    color: null,
    isSystem: false,
    createdAt: '2026-10-23T00:00:00Z',
  },
  {
    id: 'system',
    name: 'Alquiler',
    type: 'EXPENSE',
    parentId: null,
    icon: 'home',
    color: '#ef4444',
    isSystem: true,
    createdAt: '2026-10-23T00:00:00Z',
  },
];

describe('CategoryTree', () => {
  it('renderiza las categorías con jerarquía e indentación', () => {
    render(<CategoryTree categories={categories} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const tree = screen.getByRole('tree', { name: 'Categorías' });
    const parent = within(tree).getByRole('treeitem', { name: /Alimentación/ });
    const child = within(tree).getByRole('treeitem', { name: /Supermercado/ });

    expect(parent).toHaveAttribute('aria-level', '1');
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(child).toHaveAttribute('aria-level', '2');
    expect(child).toHaveClass('ml-6');
  });

  it('muestra la etiqueta Sistema y deshabilita editar y borrar para esas categorías', () => {
    render(<CategoryTree categories={categories} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const systemItem = screen.getByRole('treeitem', { name: /Alquiler/ });
    expect(within(systemItem).getByText('Sistema')).toBeInTheDocument();
    expect(within(systemItem).getByRole('button', { name: 'Editar Alquiler' })).toBeDisabled();
    expect(within(systemItem).getByRole('button', { name: 'Borrar Alquiler' })).toBeDisabled();
    expect(within(systemItem).getByRole('button', { name: 'Editar Alquiler' })).toHaveAttribute(
      'title',
      'Categoría del sistema',
    );
  });

  it('envía las categorías seleccionadas a los handlers de editar y borrar', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<CategoryTree categories={categories} onEdit={onEdit} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar Alimentación' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar Alimentación' }));

    expect(onEdit).toHaveBeenCalledWith(categories[0]);
    expect(onDelete).toHaveBeenCalledWith(categories[0]);
  });
});
