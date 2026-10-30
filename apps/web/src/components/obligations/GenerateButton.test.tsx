import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GenerateButton } from './GenerateButton';

describe('GenerateButton', () => {
  it('ejecuta la generación y muestra el estado de carga', async () => { const user = userEvent.setup(); const onClick = vi.fn(); const { rerender } = render(<GenerateButton onClick={onClick} />); await user.click(screen.getByRole('button', { name: 'Generar pendientes del mes' })); expect(onClick).toHaveBeenCalledOnce(); rerender(<GenerateButton onClick={onClick} isLoading />); expect(screen.getByRole('button', { name: 'Generando...' })).toBeDisabled(); });
});
