'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Ingresá un email válido.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError('');

    try {
      await login(values);
      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de conexión';
      setFormError(message);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-moneyflow-primary focus:ring-2 focus:ring-moneyflow-primary/20"
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <p className="mt-1 text-sm text-moneyflow-danger">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-foreground">
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-moneyflow-primary focus:ring-2 focus:ring-moneyflow-primary/20"
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-moneyflow-danger">{errors.password.message}</p>
        )}
      </div>

      {formError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-moneyflow-primary px-4 py-2.5 font-semibold text-moneyflow-dark transition hover:bg-moneyflow-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
