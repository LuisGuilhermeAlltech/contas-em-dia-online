import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardKpi } from '@/components/dashboard/CardKpi';
import { useAppStore } from '@/store/appStore';
import { useEmpresaId } from '@/hooks/useEmpresas';
import { useDashboardEmpresa } from '@/hooks/useDashboardEmpresa';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getTodayLocalISODate, toLocalISODate } from '@/lib/date';
import { calcSaldo } from '@/lib/finance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ContaVencimento {
  id: string;
  descricao: string;
  vencimento: string;
  saldo: number;
  is_vencido: boolean;
  is_hoje: boolean;
}

export default function DashboardPage() {
  const { selectedCompanyId } = useAppStore();
  const empresaUuid = useEmpresaId(selectedCompanyId);
  const { data: dash, isLoading } = useDashboardEmpresa(empresaUuid);
  const [mostrar3dias, setMostrar3dias] = useState(false);

  // Contas vencidas e vencendo hoje (usa RPC antiga com empresa text)
  const { data: contasVencidasHoje = [] } = useQuery({
    queryKey: ['contas-vencidas-hoje-v2', empresaUuid, mostrar3dias],
    queryFn: async (): Promise<ContaVencimento[]> => {
      // Query direto para ter mais controle
      const hoje = getTodayLocalISODate();
      let query = supabase
        .from('contas')
        .select('id, descricao, vencimento, valor_total, total_pago, status')
        .eq('empresa_id', empresaUuid!)
        .eq('status', 'pendente')
        .is('deleted_at', null)
        .order('vencimento', { ascending: true })
        .limit(15);

      if (mostrar3dias) {
        const d3 = new Date();
        d3.setDate(d3.getDate() + 3);
        query = query.lte('vencimento', toLocalISODate(d3));
      } else {
        query = query.lte('vencimento', hoje);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((c) => ({
        ...c,
        saldo: calcSaldo(c.valor_total, c.total_pago),
        is_vencido: (c.vencimento || '') < hoje,
        is_hoje: c.vencimento === hoje,
      }));
    },
    enabled: !!empresaUuid,
  });

  if (isLoading || !dash) {
    return <div className="p-6 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>

      {/* Cards de Totais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardKpi
          titulo="Total Hoje"
          valor={formatCurrency(Number(dash.total_hoje))}
          estado="normal"
        />
        <CardKpi
          titulo="Semana Atual"
          valor={formatCurrency(Number(dash.total_semana_atual))}
          estado="normal"
        />
        <CardKpi
          titulo="Mes Atual"
          valor={formatCurrency(Number(dash.total_mes_atual))}
          estado="normal"
        />
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardKpi
          titulo="Contas Vencidas"
          valor={String(dash.contas_vencidas_qtd)}
          subtitulo={formatCurrency(Number(dash.contas_vencidas_valor))}
          estado="critico"
        />
        <CardKpi
          titulo="Contas Pendentes"
          valor={String(dash.contas_pendentes_qtd)}
          subtitulo={formatCurrency(Number(dash.contas_pendentes_valor))}
          estado="alerta"
        />
        <CardKpi
          titulo="Pagas no Mes"
          valor={String(dash.pagas_mes_qtd)}
          subtitulo={formatCurrency(Number(dash.pagas_mes_valor))}
          estado="positivo"
        />
      </div>

      {/* Vencidas e Vencendo Hoje */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vencidas e Vencendo Hoje</CardTitle>
          <Button
            variant={mostrar3dias ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setMostrar3dias(!mostrar3dias)}
          >
            {mostrar3dias ? 'Apenas hoje' : 'Incluir 3 dias'}
          </Button>
        </CardHeader>
        <CardContent>
          {contasVencidasHoje.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma conta vencida ou vencendo hoje.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm">Descricao</th>
                    <th className="text-left p-2 text-sm">Vencimento</th>
                    <th className="text-right p-2 text-sm">Valor em Aberto</th>
                    <th className="text-center p-2 text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contasVencidasHoje.map((conta) => (
                    <tr
                      key={conta.id}
                      className={`border-b hover:bg-muted/50 ${
                        conta.is_vencido ? 'bg-destructive/10' : conta.is_hoje ? 'bg-orange-50' : ''
                      }`}
                    >
                      <td className="p-2">{conta.descricao}</td>
                      <td className="p-2">{formatDate(conta.vencimento)}</td>
                      <td className="p-2 text-right">{formatCurrency(conta.saldo)}</td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            conta.is_vencido
                              ? 'bg-destructive/20 text-destructive'
                              : conta.is_hoje
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {conta.is_vencido ? 'Vencido' : conta.is_hoje ? 'Vence Hoje' : 'Próximo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
