'use client';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Recurrence } from '@/types/recurrence';

interface RecurrenceToggleButtonProps {
  recurrence: Recurrence;
  onToggle: (recurrence: Recurrence) => void;
}

export function RecurrenceToggleButton({
  recurrence,
  onToggle,
}: RecurrenceToggleButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => onToggle(recurrence)}
      aria-label={`${recurrence.active ? 'Desactivar' : 'Activar'} ${recurrence.name}`}
    >
      <RefreshCw aria-hidden="true" className="h-4 w-4" />
    </Button>
  );
}
