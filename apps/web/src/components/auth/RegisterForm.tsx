'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@/hooks/useAuth';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá tu nombre.').max(100, 'El nombre no puede superar 100 caracteres.'),
  email: z.string().trim().toLowerCase().email('Ingresá un email válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [formError, setFormError] = useState('');

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError('');

    try {
      await register(values);
      router.push('/login?registered=1');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de conexión';
      setFormError(message);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="register-name" className="mb-2 block text-sm font-medium text-slate-700">
          Nombre
        </label>
        <input
          id="register-name"
          type="text"
          autoComplete="name"
          {...formRegister('name')}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-moneyflow-primary focus:ring-2 focus:ring-moneyflow-primary/20"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <p className="mt-1 text-sm text-moneyflow-danger">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          {...formRegister('email')}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-moneyflow-primary focus:ring-2 focus:ring-moneyflow-primary/20"
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <p className="mt-1 text-sm text-moneyflow-danger">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          {...formRegister('password')}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-moneyflow-primary focus:ring-2 focus:ring-moneyflow-primary/20"
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-moneyflow-danger">{errors.password.message}</p>
        )}
      </div>

      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-moneyflow-primary px-4 py-2.5 font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  );
}
