import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from './LoginForm';

const loginMock = vi.fn();
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    loginMock.mockReset();
    pushMock.mockReset();
  });

  it('renderiza email y password y muestra el botón de login', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('muestra un error cuando el email es inválido', async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'no-es-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('Ingresá un email válido.')).toBeInTheDocument();
  });

  it('muestra un error cuando la contraseña está vacía', async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('Ingresá tu contraseña.')).toBeInTheDocument();
  });

  it('muestra el error de credenciales inválidas cuando el backend responde 401', async () => {
    loginMock.mockRejectedValue(Object.assign(new Error('Credenciales inválidas'), { status: 401 }));
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
  });

  it('envía el formulario y navega al dashboard', async () => {
    loginMock.mockResolvedValue(undefined);

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'ana@example.com',
        password: '12345678',
      });
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });
});
