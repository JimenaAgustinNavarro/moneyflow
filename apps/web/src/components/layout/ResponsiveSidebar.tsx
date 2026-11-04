'use client';

import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function ResponsiveSidebar({ children }: Props) {
  return (
    <aside className="flex h-screen w-16 shrink-0 flex-col border-r border-border/80 bg-card/90 backdrop-blur-sm md:w-64">
      {children}
    </aside>
  );
}
