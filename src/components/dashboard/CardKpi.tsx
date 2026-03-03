import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CardKpiProps {
  titulo: string;
  valor: string;
  subtitulo?: string;
  estado?: 'normal' | 'alerta' | 'critico' | 'positivo';
}

const estadoClasses = {
  normal: 'border-l-border',
  alerta: 'border-l-orange-500',
  critico: 'border-l-destructive',
  positivo: 'border-l-green-500',
};

const valorClasses = {
  normal: 'text-foreground',
  alerta: 'text-orange-700',
  critico: 'text-destructive',
  positivo: 'text-green-700',
};

export function CardKpi({ titulo, valor, subtitulo, estado = 'normal' }: CardKpiProps) {
  return (
    <Card className={cn('border-l-4', estadoClasses[estado])}>
      <CardContent className="pt-4 pb-3">
        <p className="text-sm text-muted-foreground mb-1">{titulo}</p>
        <p className={cn('text-2xl font-bold', valorClasses[estado])}>{valor}</p>
        {subtitulo && (
          <p className="text-xs text-muted-foreground mt-1">{subtitulo}</p>
        )}
      </CardContent>
    </Card>
  );
}
