'use client';

import type { ReactNode } from 'react';

import { Animated } from '@/components/ui/motion';

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <Animated variant="slideUp" className="relative w-full max-w-md">
      <div className="absolute inset-0 -z-10 rounded-[28px] bg-gradient-to-br from-primary/10 via-transparent to-primary/5 blur-2xl" />
      <div className="moneyflow-glass relative overflow-hidden rounded-[28px] p-6 text-card-foreground shadow-lg shadow-foreground/5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="mb-6 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary ring-1 ring-primary/20 transition-transform duration-200 hover:scale-105">
              M
            </div>
            <span className="text-xl font-semibold text-card-foreground">MoneyFlow</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-card-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </Animated>
  );
}
