import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Fortaleza';

export default function DashboardPage() {
  const { selectedCompanyId } = useAppStore();

  const hoje = toZonedTime(new Date(), TIMEZONE).toISOString().split('T')[0];
  const inicioMes = toZonedTime(new Date(new Date().getFullYear(), new Date().getMonth(), 1), TIMEZONE).toISOString().split('T')[0];
  const fimMes = toZonedTime(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), TIMEZONE).toISOString().split('T')[0];
  
  const amanha = toZonedTime(new Date(new Date().getTime() + 24 * 60 * 60 * 1000), TIMEZONE).toISOString().split('T')[0];
  const mais7dias = toZonedTime(new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), TIMEZONE).toISOString().split('T')[0];

  const { data: totalHoje } = useQuery({
    queryKey: ['total-hoje', selectedCompanyId, hoje],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_total_contas_do_dia', {
        p_empresa: selectedCompanyId,
        p_data: hoje,
      });
      if (error) throw error;
      return data || 0;
    },
    enabled: !!selectedCompanyId,
  });

  const { data: totalProximaSemana } = useQuery({
    queryKey: ['total-proxima-semana', selectedCompanyId, amanha, mais7dias],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_total_proxima_semana', {
        p_empresa: selectedCompanyId,
        p_data_inicio: amanha,
        p_data_fim: mais7dias,
      });
      if (error) throw error;
      return data || 0;
    },
    enabled: !!selectedCompanyId,
  });

  const { data: totalMesAtual } = useQuery({
    queryKey: ['total-mes-atual', selectedCompanyId, inicioMes, fimMes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_total_mes_atual', {
        p_empresa: selectedCompanyId,
        p_data_inicio: inicioMes,
        p_data_fim: fimMes,
      });
      if (error) throw error;
      return data || 0;
    },
    enabled: !!selectedCompanyId,
  });

  const { data: resumo } = useQuery({
    queryKey: ['dashboard-resumo', selectedCompanyId, hoje, inicioMes, fimMes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_dashboard_resumo', {
        p_empresa: selectedCompanyId,
        p_hoje: hoje,
        p_inicio_mes: inicioMes,
        p_fim_mes: fimMes,
      });
      if (error) throw error;
      return data?.[0];
    },
    enabled: !!selectedCompanyId,
  });

  const { data: contasVencidasHoje = [] } = useQuery({
    queryKey: ['contas-vencidas-hoje', selectedCompanyId, hoje],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_contas_vencidas_e_hoje', {
        p_empresa: selectedCompanyId,
        p_hoje: hoje,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>

      {/* Cards de Totais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(Number(totalHoje) || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próxima Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(Number(totalProximaSemana) || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mês Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(Number(totalMesAtual) || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              Contas Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              {Number(resumo?.contas_vencidas) || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="text-base text-orange-700">
              Contas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-700">
              {Number(resumo?.contas_pendentes) || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-base text-green-700">
              Contas Pagas no Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-700">
              {Number(resumo?.contas_pagas_mes) || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vencidas e Vencendo Hoje */}
      <Card>
        <CardHeader>
          <CardTitle>Vencidas e Vencendo Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {!contasVencidasHoje || contasVencidasHoje.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma conta vencida ou vencendo hoje.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Descrição</th>
                    <th className="text-left p-2">Vencimento</th>
                    <th className="text-right p-2">Valor em Aberto</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contasVencidasHoje.map((conta: any) => (
                    <tr 
                      key={conta.id} 
                      className={`border-b hover:bg-muted/50 ${
                        conta.is_vencido ? 'bg-destructive/10' : conta.is_hoje ? 'bg-orange-50' : ''
                      }`}
                    >
                      <td className="p-2">{conta.descricao}</td>
                      <td className="p-2">{formatDate(conta.vencimento)}</td>
                      <td className="p-2 text-right">
                        {formatCurrency(Number(conta.saldo) || 0)}
                      </td>
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
                          {conta.is_vencido ? 'Vencido' : conta.is_hoje ? 'Vence Hoje' : conta.status}
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
