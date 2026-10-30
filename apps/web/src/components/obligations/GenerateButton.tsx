'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { onClick: () => void; isLoading?: boolean; }

export function GenerateButton({ onClick, isLoading }: Props) {
  return (
    <Button variant="outline" onClick={onClick} disabled={isLoading}>
      <Sparkles className="mr-2 h-4 w-4" />
      {isLoading ? 'Generando...' : 'Generar pendientes del mes'}
    </Button>
  );
}
