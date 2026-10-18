import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegisterForm } from './RegisterForm';

const registerMock = vi.fn();
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    register: registerMock,
  }),
}));

describe('RegisterForm', () => {
  beforeEach(() => {
    registerMock.mockReset();
    pushMock.mockReset();
  });

  it('renderiza name, email y password y muestra el botón de crear cuenta', () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument();
  });

  it('muestra un error cuando la contraseña tiene menos de 8 caracteres', async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Ana' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument();
    });
  });

  it('muestra el error cuando el email ya está registrado', async () => {
    registerMock.mockRejectedValue(
      Object.assign(new Error('El email ya está registrado'), { status: 409 }),
    );

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Ana' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('El email ya está registrado')).toBeInTheDocument();
    });
  });

  it('envía el formulario y redirige al login', async () => {
    registerMock.mockResolvedValue(undefined);

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Ana' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        name: 'Ana',
        email: 'ana@example.com',
        password: '12345678',
      });
      expect(pushMock).toHaveBeenCalledWith('/login?registered=1');
    });
  });
});
