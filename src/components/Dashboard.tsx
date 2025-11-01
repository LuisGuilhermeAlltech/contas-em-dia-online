
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  AlertTriangle,
  Clock,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, addDays } from "date-fns";

interface DashboardProps {
  selectedEmpresa: string;
}

type ContaView = Tables<'contas_view'>;

interface DashboardData {
  totalHoje: number;
  proximaSemana: number;
  mesAtual: number;
  contasVencidas: number;
  contasPagas: number;
  contasPendentes: number;
}

export const Dashboard = ({ selectedEmpresa }: DashboardProps) => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalHoje: 0,
    proximaSemana: 0,
    mesAtual: 0,
    contasVencidas: 0,
    contasPagas: 0,
    contasPendentes: 0
  });
  const [contasProximas, setContasProximas] = useState<ContaView[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log("Carregando dados do dashboard para empresa:", selectedEmpresa);

      // Definir timezone de Brasília
      const TZ = 'America/Sao_Paulo';
      
      // Calcular datas para as queries
      const now = new Date();
      const hojeSP = toZonedTime(now, TZ);
      const inicioHojeSP = startOfDay(hojeSP);
      
      // Data de hoje em formato YYYY-MM-DD para o RPC
      const dataHoje = inicioHojeSP.toISOString().split('T')[0];

      // Chamar RPC para Total Hoje (fonte da verdade)
      const { data: totalHojeRpc, error: errorHoje } = await supabase
        .rpc('rpc_total_contas_do_dia', {
          p_empresa: selectedEmpresa,
          p_data: dataHoje
        });

      if (errorHoje) {
        console.error("Erro ao calcular Total Hoje via RPC:", errorHoje);
      }

      const totalHoje = Number(totalHojeRpc || 0);
      console.log(`💰 Total Hoje via RPC: R$ ${totalHoje.toFixed(2)}`);

      // Calcular intervalos para Próxima Semana e Mês Atual
      const proximaSemana = addDays(inicioHojeSP, 7);
      const dataInicioSemana = inicioHojeSP.toISOString().split('T')[0];
      const dataFimSemana = proximaSemana.toISOString().split('T')[0];

      // Primeiro e último dia do mês atual
      const inicioMes = new Date(hojeSP.getFullYear(), hojeSP.getMonth(), 1);
      const fimMes = new Date(hojeSP.getFullYear(), hojeSP.getMonth() + 1, 0);
      const dataInicioMes = inicioMes.toISOString().split('T')[0];
      const dataFimMes = fimMes.toISOString().split('T')[0];

      // Chamar RPC para Próxima Semana
      const { data: totalSemanaRpc, error: errorSemana } = await supabase
        .rpc('rpc_total_proxima_semana', {
          p_empresa: selectedEmpresa,
          p_data_inicio: dataInicioSemana,
          p_data_fim: dataFimSemana
        });

      if (errorSemana) {
        console.error("Erro ao calcular Próxima Semana via RPC:", errorSemana);
      }

      const valorProximaSemana = Number(totalSemanaRpc || 0);

      // Chamar RPC para Mês Atual
      const { data: totalMesRpc, error: errorMes } = await supabase
        .rpc('rpc_total_mes_atual', {
          p_empresa: selectedEmpresa,
          p_data_inicio: dataInicioMes,
          p_data_fim: dataFimMes
        });

      if (errorMes) {
        console.error("Erro ao calcular Mês Atual via RPC:", errorMes);
      }

      const valorMesAtual = Number(totalMesRpc || 0);

      // Carregar contas para cálculos complementares e contadores
      const { data: contas, error } = await supabase
        .from('contas_view')
        .select('*')
        .eq('empresa', selectedEmpresa);

      if (error) {
        console.error("Erro ao carregar contas:", error);
        return;
      }

      let contasVencidas = 0;
      let contasPagas = 0;
      let contasPendentes = 0;
      const contasVencemProximo: ContaView[] = [];

      if (contas) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        contas.forEach(conta => {
          if (!conta.vencimento) return;
          
          const vencimento = new Date(conta.vencimento + 'T00:00:00');
          vencimento.setHours(0, 0, 0, 0);
          
          const isPago = conta.status === 'Pago';
          const isVencida = conta.status !== 'Pago' && vencimento < hoje;

          // Próx. Semana → vencimento ≤ hoje+7 (status Pendente)
          if (vencimento <= proximaSemana && vencimento >= inicioHojeSP && conta.status === 'Pendente') {
            contasVencemProximo.push(conta);
          }

          // Contadores por status
          if (isPago) {
            if (vencimento >= inicioMes && vencimento <= fimMes) {
              contasPagas++;
            }
          } else if (isVencida) {
            contasVencidas++;
          } else {
            contasPendentes++;
          }
        });
      }

      const newDashboardData: DashboardData = {
        totalHoje,
        proximaSemana: valorProximaSemana,
        mesAtual: valorMesAtual,
        contasVencidas,
        contasPagas,
        contasPendentes
      };

      console.log("Dados calculados:", newDashboardData);
      setDashboardData(newDashboardData);
      setContasProximas(contasVencemProximo.slice(0, 5)); // Mostrar apenas as 5 primeiras

    } catch (error) {
      console.error("Erro inesperado ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmpresa) {
      loadDashboardData();
    }
  }, [selectedEmpresa]);

  const getNomeEmpresa = (id: string) => {
    const empresas: { [key: string]: string } = {
      "grupo-lider": "Grupo Líder",
      "alltech-matriz": "Alltech Matriz", 
      "alltech-filial": "Alltech Filial",
      "luis-guilherme": "Luis Guilherme"
    };
    return empresas[id] || id;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <p className="text-gray-600">Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard Financeiro</h2>
          <p className="text-gray-600 mt-1">Empresa: {getNomeEmpresa(selectedEmpresa)}</p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {formatCurrency(dashboardData.totalHoje)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Vencimento hoje</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Próxima Semana</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {formatCurrency(dashboardData.proximaSemana)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Vencimento em 7 dias</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Mês Atual</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {formatCurrency(dashboardData.mesAtual)}
            </div>
            <p className="text-xs text-gray-500 mt-1">A vencer este mês</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Contas Pagas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData.contasPagas}
            </div>
            <p className="text-xs text-gray-500 mt-1">Quitadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Status das Contas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Contas Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {dashboardData.contasVencidas}
            </div>
            <p className="text-sm text-red-600 mt-1">Requer atenção imediata</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Contas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {dashboardData.contasPendentes}
            </div>
            <p className="text-sm text-orange-600 mt-1">Aguardando pagamento</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Contas Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {dashboardData.contasPagas}
            </div>
            <p className="text-sm text-green-600 mt-1">Quitadas com sucesso</p>
          </CardContent>
        </Card>
      </div>

      {/* Contas Próximas do Vencimento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Contas Próximas do Vencimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contasProximas.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma conta próxima do vencimento</p>
              <p className="text-sm text-gray-500 mt-2">
                As contas com vencimento nos próximos 7 dias aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {contasProximas.map((conta) => (
                <div key={conta.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{conta.descricao}</p>
                    <p className="text-sm text-gray-600">
                      Vencimento: {formatDate(conta.vencimento)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">
                      R$ {formatCurrency(conta.saldo)}
                    </p>
                    <Badge variant={conta.status === 'Pago' ? 'default' : (conta.status === 'Parcial' ? 'secondary' : 'secondary')}>
                      {conta.status || 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dicas de Uso */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-700 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumo do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Dados em Tempo Real</h4>
              <p className="text-sm text-blue-700">
                Todos os dados são calculados automaticamente pela view contas_view do Supabase.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Pagamentos Parciais</h4>
              <p className="text-sm text-blue-700">
                Registre pagamentos parciais e acompanhe o saldo restante de cada conta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
