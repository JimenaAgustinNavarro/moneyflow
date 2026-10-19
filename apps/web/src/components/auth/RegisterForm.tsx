'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Animated } from '@/components/ui/motion';
import { useAuth } from '@/hooks/useAuth';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa tu nombre.').max(100, 'El nombre no puede superar 100 caracteres.'),
  email: z.string().trim().toLowerCase().email('Ingresa un email válido.'),
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
      <Animated variant="fadeIn" className="space-y-5">
        <div>
          <label htmlFor="register-name" className="mb-2 block text-sm font-medium text-foreground">
            Nombre
          </label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            {...formRegister('name')}
            className="w-full rounded-xl border border-input bg-background/80 px-3 py-2.5 text-foreground shadow-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/70 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && (
            <Animated variant="fadeIn" className="mt-1 text-sm text-destructive">
              {errors.name.message}
            </Animated>
          )}
        </div>

        <div>
          <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            {...formRegister('email')}
            className="w-full rounded-xl border border-input bg-background/80 px-3 py-2.5 text-foreground shadow-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/70 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && (
            <Animated variant="fadeIn" className="mt-1 text-sm text-destructive">
              {errors.email.message}
            </Animated>
          )}
        </div>

        <div>
          <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-foreground">
            Contraseña
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            {...formRegister('password')}
            className="w-full rounded-xl border border-input bg-background/80 px-3 py-2.5 text-foreground shadow-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/70 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && (
            <Animated variant="fadeIn" className="mt-1 text-sm text-destructive">
              {errors.password.message}
            </Animated>
          )}
        </div>

        {formError && (
          <Animated
            variant="fadeIn"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive shadow-sm"
          >
            {formError}
          </Animated>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:scale-[1.02] hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex items-center justify-center gap-2">
            {isSubmitting && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </span>
        </button>
      </Animated>
    </form>
  );
}
