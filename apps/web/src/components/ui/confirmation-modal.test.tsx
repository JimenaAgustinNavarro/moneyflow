import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmationModal } from './confirmation-modal';

describe('ConfirmationModal', () => {
  it('renderiza el título y la descripción en el portal', () => {
    render(
      <ConfirmationModal
        open
        onOpenChange={vi.fn()}
        title="Eliminar categoría"
        description="Esta acción no se puede deshacer."
        onConfirm={vi.fn()}
      />,
    );

    const dialog = within(document.body).getByRole('dialog');
    expect(within(dialog).getByText('Eliminar categoría')).toBeInTheDocument();
    expect(within(dialog).getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
  });

  it('ejecuta la confirmación y permite cancelar', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmationModal
        open
        onOpenChange={onOpenChange}
        title="Confirmar"
        description="¿Continuar?"
        onConfirm={onConfirm}
      />,
    );

    const dialog = within(document.body).getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('usa el estilo destructivo para la acción peligrosa', () => {
    render(
      <ConfirmationModal
        open
        onOpenChange={vi.fn()}
        title="Eliminar"
        description="¿Eliminar?"
        confirmLabel="Eliminar"
        onConfirm={vi.fn()}
        variant="destructive"
      />,
    );

    expect(within(document.body).getByRole('button', { name: 'Eliminar' })).toHaveAttribute(
      'data-variant',
      'destructive',
    );
  });

  it('deshabilita las acciones mientras procesa y no renderiza si está cerrado', () => {
    const { rerender } = render(
      <ConfirmationModal
        open
        onOpenChange={vi.fn()}
        title="Confirmar"
        description="Procesar?"
        onConfirm={vi.fn()}
        isLoading
      />,
    );

    expect(within(document.body).getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(within(document.body).getByRole('button', { name: 'Procesando...' })).toBeDisabled();

    rerender(
      <ConfirmationModal
        open={false}
        onOpenChange={vi.fn()}
        title="Confirmar"
        description="Procesar?"
        onConfirm={vi.fn()}
      />,
    );
    expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument();
  });
});
