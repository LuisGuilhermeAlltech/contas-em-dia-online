import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface CompanyData {
  empresa_id: string;
  empresa_nome: string;
  empresa_slug: string;
  vencidas_qtd: number;
  vencidas_valor: number;
  semana_qtd: number;
  semana_valor: number;
  mes_qtd: number;
  mes_valor: number;
  aberto_qtd: number;
  aberto_valor: number;
  pago_mes_qtd: number;
  pago_mes_valor: number;
}

interface CompanySummaryCardProps {
  data: CompanyData;
  onViewDetails?: () => void;
}

function getStatusIndicator(data: CompanyData) {
  if (Number(data.vencidas_qtd) > 0) {
    return { color: 'border-l-destructive', label: 'Contas vencidas' };
  }
  const abertoVal = Number(data.aberto_valor);
  const semanaVal = Number(data.semana_valor);
  if (abertoVal > 0 && semanaVal / abertoVal > 0.3) {
    return { color: 'border-l-orange-500', label: 'Concentracao na semana' };
  }
  return { color: 'border-l-emerald-500', label: 'Controlado' };
}

function Metric({ label, valor, qtd, className }: { label: string; valor: number; qtd?: number; className?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-semibold', className)}>
        {formatCurrency(Number(valor))}
      </p>
      {qtd !== undefined && (
        <p className="text-xs text-muted-foreground">{qtd} contas</p>
      )}
    </div>
  );
}

export function CompanySummaryCard({ data, onViewDetails }: CompanySummaryCardProps) {
  const status = getStatusIndicator(data);

  return (
    <Card className={cn('border-l-4', status.color)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{data.empresa_nome}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Linha 1 */}
        <div className="grid grid-cols-2 gap-4">
          <Metric
            label="Vencidas"
            valor={Number(data.vencidas_valor)}
            qtd={Number(data.vencidas_qtd)}
            className={Number(data.vencidas_qtd) > 0 ? 'text-destructive' : undefined}
          />
          <Metric
            label="Semana Atual"
            valor={Number(data.semana_valor)}
            qtd={Number(data.semana_qtd)}
          />
        </div>

        {/* Linha 2 */}
        <div className="grid grid-cols-2 gap-4">
          <Metric
            label="Mes Atual"
            valor={Number(data.mes_valor)}
            qtd={Number(data.mes_qtd)}
          />
          <Metric
            label="Em Aberto"
            valor={Number(data.aberto_valor)}
            qtd={Number(data.aberto_qtd)}
          />
        </div>

        {/* Linha 3 */}
        <div className="border-t pt-3">
          <Metric
            label="Pago no mes"
            valor={Number(data.pago_mes_valor)}
            qtd={Number(data.pago_mes_qtd)}
            className="text-emerald-600"
          />
        </div>

        {/* Footer */}
        {onViewDetails && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onViewDetails}
            >
              Ver detalhes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
