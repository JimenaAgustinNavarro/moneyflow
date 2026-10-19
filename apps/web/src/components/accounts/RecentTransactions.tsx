import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RecentTransactions() {
  return (
    <Card className="border border-border/80 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Movimientos recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Los movimientos recientes estarán disponibles cuando se habilite la sección Movimientos.
        </p>
      </CardContent>
    </Card>
  );
}
