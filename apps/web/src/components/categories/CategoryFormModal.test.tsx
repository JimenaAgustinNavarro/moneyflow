import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CategoryFormModal } from './CategoryFormModal';
import type { Category } from '@/types/category';

const categories: Category[] = [
  {
    id: 'user-parent',
    name: 'Mi categoría',
    type: 'EXPENSE',
    parentId: null,
    icon: null,
    color: null,
    isSystem: false,
    createdAt: '2026-10-23T00:00:00Z',
  },
  {
    id: 'system-parent',
    name: 'Sistema',
    type: 'EXPENSE',
    parentId: null,
    icon: null,
    color: null,
    isSystem: true,
    createdAt: '2026-10-23T00:00:00Z',
  },
  {
    id: 'income-parent',
    name: 'Ingreso',
    type: 'INCOME',
    parentId: null,
    icon: null,
    color: null,
    isSystem: false,
    createdAt: '2026-10-23T00:00:00Z',
  },
  {
    id: 'nested-parent',
    name: 'Subcategoría',
    type: 'EXPENSE',
    parentId: 'user-parent',
    icon: null,
    color: null,
    isSystem: false,
    createdAt: '2026-10-23T00:00:00Z',
  },
];

function renderForm({
  editing = null,
  onSubmitCreate = vi.fn().mockResolvedValue(undefined),
  onSubmitEdit = vi.fn().mockResolvedValue(undefined),
}: {
  editing?: Category | null;
  onSubmitCreate?: (input: {
    name: string;
    type: 'INCOME' | 'EXPENSE';
    parentId?: string | null;
    icon?: string | null;
    color?: string | null;
  }) => Promise<void>;
  onSubmitEdit?: (input: {
    name?: string;
    icon?: string | null;
    color?: string | null;
  }) => Promise<void>;
} = {}) {
  const result = render(
    <CategoryFormModal
      open
      onClose={vi.fn()}
      onSubmitCreate={onSubmitCreate}
      onSubmitEdit={onSubmitEdit}
      categories={categories}
      editing={editing}
    />,
  );

  return { ...result, onSubmitCreate, onSubmitEdit };
}

describe('CategoryFormModal', () => {
  it('muestra los campos de creación y filtra las categorías padre permitidas', async () => {
    renderForm();

    const dialog = within(document.body).getByRole('dialog');
    expect(within(dialog).getByLabelText('Nombre')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Ícono (opcional)')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Color (opcional)')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('combobox')).toHaveLength(2);

    fireEvent.keyDown(within(dialog).getAllByRole('combobox')[1], {
      key: 'ArrowDown',
      code: 'ArrowDown',
    });
    const options = within(document.body);
    expect(await options.findByRole('option', { name: 'Mi categoría' })).toBeInTheDocument();
    expect(options.queryByRole('option', { name: 'Sistema' })).not.toBeInTheDocument();
    expect(options.queryByRole('option', { name: 'Ingreso' })).not.toBeInTheDocument();
    expect(options.queryByRole('option', { name: 'Subcategoría' })).not.toBeInTheDocument();
  });

  it('valida que el nombre sea obligatorio y que el color sea hexadecimal', async () => {
    renderForm();

    const dialog = within(document.body).getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear categoría' }));
    expect(await within(dialog).findByText('Ingresa un nombre.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Nombre'), {
      target: { value: 'Mascotas' },
    });
    fireEvent.change(within(dialog).getByLabelText('Color (opcional)'), {
      target: { value: 'red' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear categoría' }));

    expect(await within(dialog).findByText('Color hex inválido.')).toBeInTheDocument();
  });

  it('envía la categoría nueva con los campos esperados', async () => {
    const onSubmitCreate = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmitCreate });

    const dialog = within(document.body).getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Nombre'), {
      target: { value: 'Mascotas' },
    });
    fireEvent.change(within(dialog).getByLabelText('Color (opcional)'), {
      target: { value: '#abcdef' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear categoría' }));

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledWith({
        name: 'Mascotas',
        type: 'EXPENSE',
        parentId: null,
        icon: null,
        color: '#abcdef',
      });
    });
  });

  it('edita solo nombre, ícono y color, sin tipo ni categoría padre', async () => {
    const onSubmitEdit = vi.fn().mockResolvedValue(undefined);
    const editing = categories[0];
    renderForm({ editing, onSubmitEdit });

    const dialog = within(document.body).getByRole('dialog');
    expect(within(dialog).queryByLabelText('Tipo')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Categoría padre (opcional)')).not.toBeInTheDocument();
    const name = within(dialog).getByLabelText('Nombre');
    await waitFor(() => expect(name).toHaveValue(editing.name));
    fireEvent.change(name, { target: { value: 'Nombre actualizado' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(onSubmitEdit).toHaveBeenCalledWith({
        name: 'Nombre actualizado',
        icon: null,
        color: null,
      });
    });
  });
});
