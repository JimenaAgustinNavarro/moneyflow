import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <section className="space-y-4 text-center">
        <h1 className="text-5xl font-bold text-moneyflow-primary">MoneyFlow</h1>
        <p>Frontend funcionando correctamente</p>
      </section>
    </main>
  );
}
