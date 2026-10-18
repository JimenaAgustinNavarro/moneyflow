import type { Metadata } from 'next';

import './globals.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'MoneyFlow',
  description: 'Gestión de finanzas personales',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn('font-sans', geist.variable)}>
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
