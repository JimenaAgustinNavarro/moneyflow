'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <AuthCard
      title="Iniciá sesión"
      description="Accedé a tu panel para gestionar tus finanzas."
    >
      <LoginForm />
    </AuthCard>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [isLoading, router, user]);

  const justRegistered = searchParams.get('registered') === '1';

  return (
    <AuthCard
      title="Iniciá sesión"
      description={
        justRegistered
          ? 'Cuenta creada. Iniciá sesión.'
          : 'Accedé a tu panel para gestionar tus finanzas.'
      }
    >
      <LoginForm />
      <p className="mt-5 text-center text-sm text-slate-600">
        ¿No tenés cuenta?{' '}
        <button type="button" onClick={() => router.push('/register')} className="font-semibold text-moneyflow-primary hover:text-green-600">
          Registrate
        </button>
      </p>
    </AuthCard>
  );
}
