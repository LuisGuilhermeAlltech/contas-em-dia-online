import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardKpi } from '@/components/dashboard/CardKpi';
import { useDashboardGeral } from '@/hooks/useDashboardGeral';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DashboardGeralPage() {
  const { data, isLoading } = useDashboardGeral();

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Carregando...</div>;
  }

  if (!data) {
    return <div className="p-6 text-muted-foreground">Nenhum dado disponivel.</div>;
  }

  const { alertas, por_empresa, distribuicao_temporal } = data;

  const chartData = [
    { label: 'Hoje', valor: Number(distribuicao_temporal.hoje) || 0 },
    { label: '3 dias', valor: Number(distribuicao_temporal.d3) || 0 },
    { label: '7 dias', valor: Number(distribuicao_temporal.d7) || 0 },
    { label: '15 dias', valor: Number(distribuicao_temporal.d15) || 0 },
    { label: '30 dias', valor: Number(distribuicao_temporal.d30) || 0 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Dashboard Geral</h2>

      {/* KPIs de Alertas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <CardKpi
          titulo="Vencidas"
          valor={formatCurrency(Number(alertas.vencidas_valor))}
          subtitulo={`${alertas.vencidas_qtd} contas`}
          estado="critico"
        />
        <CardKpi
          titulo="Vence Hoje"
          valor={formatCurrency(Number(alertas.vence_hoje_valor))}
          subtitulo={`${alertas.vence_hoje_qtd} contas`}
          estado="alerta"
        />
        <CardKpi
          titulo="Vence em 3 dias"
          valor={formatCurrency(Number(alertas.vence_3dias_valor))}
          subtitulo={`${alertas.vence_3dias_qtd} contas`}
          estado="alerta"
        />
        <CardKpi
          titulo="Semana Atual"
          valor={formatCurrency(Number(alertas.vence_semana_valor))}
          subtitulo={`${alertas.vence_semana_qtd} contas`}
          estado="normal"
        />
        <CardKpi
          titulo="Total em Aberto"
          valor={formatCurrency(Number(alertas.total_aberto_valor))}
          estado="normal"
        />
        <CardKpi
          titulo="Pago no Mes"
          valor={formatCurrency(Number(alertas.pago_mes_valor))}
          subtitulo={`${alertas.pago_mes_qtd} contas`}
          estado="positivo"
        />
      </div>

      {/* Tabela por Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>A pagar por negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Empresa</th>
                  <th className="text-right p-2 text-sm font-medium text-destructive">Vencidas</th>
                  <th className="text-right p-2 text-sm font-medium text-orange-700">Semana</th>
                  <th className="text-right p-2 text-sm font-medium text-muted-foreground">Mes</th>
                  <th className="text-right p-2 text-sm font-medium text-foreground">Em Aberto</th>
                </tr>
              </thead>
              <tbody>
                {por_empresa.map((e: any) => (
                  <tr key={e.empresa_id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{e.empresa_nome}</td>
                    <td className="p-2 text-right text-destructive">
                      {formatCurrency(Number(e.vencidas_valor))}
                      {Number(e.vencidas_qtd) > 0 && (
                        <span className="text-xs ml-1">({e.vencidas_qtd})</span>
                      )}
                    </td>
                    <td className="p-2 text-right text-orange-700">{formatCurrency(Number(e.semana_valor))}</td>
                    <td className="p-2 text-right">{formatCurrency(Number(e.mes_valor))}</td>
                    <td className="p-2 text-right font-bold">{formatCurrency(Number(e.aberto_valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Distribuicao Temporal */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuicao temporal - a vencer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
