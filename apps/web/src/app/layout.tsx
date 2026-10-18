import type { Metadata } from 'next';

import { AuthProvider } from '@/providers/AuthProvider';

import './globals.css';

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
    <html lang="es">
      <body className="bg-slate-100 text-slate-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
