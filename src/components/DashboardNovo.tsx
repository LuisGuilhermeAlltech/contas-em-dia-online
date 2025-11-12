import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Calendar, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardProps {
  selectedEmpresa: string;
}

export const DashboardNovo = ({ selectedEmpresa }: DashboardProps) => {
  const [totalHoje, setTotalHoje] = useState(0);
  const [totalSemana, setTotalSemana] = useState(0);
  const [totalMes, setTotalMes] = useState(0);
  const [contasVencidas, setContasVencidas] = useState(0);
  const [contasPendentes, setContasPendentes] = useState(0);
  const [contasPagasMes, setContasPagasMes] = useState(0);
  const [proximasContas, setProximasContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [selectedEmpresa]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      const fimSemana = new Date(hoje);
      fimSemana.setDate(hoje.getDate() + 7);

      // Total hoje
      const { data: dataHoje } = await supabase.rpc('rpc_total_contas_do_dia', {
        p_empresa: selectedEmpresa,
        p_data: hoje.toISOString().split('T')[0]
      });
      setTotalHoje(dataHoje || 0);

      // Total próxima semana
      const { data: dataSemana } = await supabase.rpc('rpc_total_proxima_semana', {
        p_empresa: selectedEmpresa,
        p_data_inicio: hoje.toISOString().split('T')[0],
        p_data_fim: fimSemana.toISOString().split('T')[0]
      });
      setTotalSemana(dataSemana || 0);

      // Total mês atual
      const { data: dataMes } = await supabase.rpc('rpc_total_mes_atual', {
        p_empresa: selectedEmpresa,
        p_data_inicio: inicioMes.toISOString().split('T')[0],
        p_data_fim: fimMes.toISOString().split('T')[0]
      });
      setTotalMes(dataMes || 0);

      // Resumo dashboard
      const { data: resumoData } = await supabase.rpc('rpc_dashboard_resumo', {
        p_empresa: selectedEmpresa,
        p_hoje: hoje.toISOString().split('T')[0],
        p_inicio_mes: inicioMes.toISOString().split('T')[0],
        p_fim_mes: fimMes.toISOString().split('T')[0]
      });

      if (resumoData && resumoData.length > 0) {
        setContasVencidas(resumoData[0].contas_vencidas || 0);
        setContasPendentes(resumoData[0].contas_pendentes || 0);
        setContasPagasMes(resumoData[0].contas_pagas_mes || 0);
      }

      // Próximas contas
      const { data: proximasData } = await supabase.rpc('rpc_contas_proximas', {
        p_empresa: selectedEmpresa,
        p_hoje: hoje.toISOString().split('T')[0]
      });

      setProximasContas(proximasData || []);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalHoje)}</div>
            <p className="text-xs text-muted-foreground">Contas que vencem hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próxima Semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSemana)}</div>
            <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mês Atual</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMes)}</div>
            <p className="text-xs text-muted-foreground">Contas abertas do mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contasVencidas}</div>
            <p className="text-xs text-muted-foreground">Contas em atraso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Pendentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contasPendentes}</div>
            <p className="text-xs text-muted-foreground">A vencer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagas no Mês</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contasPagasMes}</div>
            <p className="text-xs text-muted-foreground">Contas quitadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Próximas do vencimento */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas do Vencimento (7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {proximasContas.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma conta a vencer nos próximos 7 dias
            </p>
          ) : (
            <div className="space-y-3">
              {proximasContas.map((conta) => (
                <div
                  key={conta.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{conta.descricao}</div>
                    <div className="text-xs text-muted-foreground">
                      Vence em: {format(new Date(conta.vencimento), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatCurrency(conta.saldo)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
