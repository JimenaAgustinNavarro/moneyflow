import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const themeMock = vi.hoisted(() => ({
  resolvedTheme: 'light',
  setTheme: vi.fn((theme: string) => {
    localStorage.setItem('moneyflow_theme', theme);
  }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => themeMock,
}));

import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    themeMock.resolvedTheme = 'light';
    themeMock.setTheme.mockClear();
  });

  it('se habilita después de montar', async () => {
    render(<ThemeToggle />);

    const toggle = await screen.findByRole('button', { name: 'Cambiar a modo oscuro' });
    expect(toggle).toBeEnabled();
  });

  it('alterna entre los modos claro y oscuro', async () => {
    const { rerender } = render(<ThemeToggle />);
    const toDark = await screen.findByRole('button', { name: 'Cambiar a modo oscuro' });

    fireEvent.click(toDark);
    expect(themeMock.setTheme).toHaveBeenLastCalledWith('dark');

    themeMock.resolvedTheme = 'dark';
    rerender(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo claro' }));
    expect(themeMock.setTheme).toHaveBeenLastCalledWith('light');
  });

  it('persiste la preferencia en localStorage', async () => {
    render(<ThemeToggle />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar a modo oscuro' }));

    expect(localStorage.getItem('moneyflow_theme')).toBe('dark');
  });
});
