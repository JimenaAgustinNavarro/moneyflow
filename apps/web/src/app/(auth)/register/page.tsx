'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { AuthCard } from '@/components/auth/AuthCard';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [isLoading, router, user]);

  return (
    <AuthCard
      title="Creá tu cuenta"
      description="Empezá a organizar tus finanzas con MoneyFlow."
    >
      <RegisterForm />
      <p className="mt-5 text-center text-sm text-slate-600">
        ¿Ya tenés cuenta?{' '}
        <button type="button" onClick={() => router.push('/login')} className="font-semibold text-moneyflow-primary hover:text-green-600">
          Iniciá sesión
        </button>
      </p>
    </AuthCard>
  );
}
