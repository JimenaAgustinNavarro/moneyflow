import Link from 'next/link';

import { Animated } from '@/components/ui/motion';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background p-8 text-foreground">
      <div className="absolute inset-0 moneyflow-gradient-surface" />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <Animated
        variant="slideUp"
        className="relative z-10 w-full max-w-3xl text-center"
      >
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Finanzas más claras
        </div>

        <h1 className="mt-6 text-5xl font-black tracking-tight text-foreground sm:text-6xl">
          MoneyFlow
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Organiza tus ingresos, ahorros y cuentas con una vista simple, elegante y enfocada en tus metas.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="shadow-md shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="transition-all hover:scale-[1.02] hover:shadow-md">
            <Link href="/register">Crear cuenta</Link>
          </Button>
        </div>
      </Animated>
    </main>
  );
}
