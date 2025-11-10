import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface DashboardProps {
  selectedEmpresa: string;
}

type ContaProxima = {
  id: string;
  descricao: string;
  vencimento: string;
  saldo: number;
  status: string;
};

type DashboardResumo = {
  contas_vencidas: number;
  contas_pendentes: number;
  contas_pagas_mes: number;
};

export function Dashboard({ selectedEmpresa }: DashboardProps) {
  // Calcular datas no timezone de São Paulo
  const timeZone = "America/Sao_Paulo";
  const agoraUTC = new Date();
  const agoraSP = toZonedTime(agoraUTC, timeZone);
  
  const hoje = format(agoraSP, "yyyy-MM-dd");
  const inicioMes = format(new Date(agoraSP.getFullYear(), agoraSP.getMonth(), 1), "yyyy-MM-dd");
  const fimMes = format(new Date(agoraSP.getFullYear(), agoraSP.getMonth() + 1, 0), "yyyy-MM-dd");
  const inicioSemana = hoje;
  const fimSemana = format(new Date(agoraSP.getTime() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

  // Query para Total Hoje
  const { data: totalHoje = 0, isLoading: loadingHoje } = useQuery({
    queryKey: ['totalHoje', selectedEmpresa, hoje],
    queryFn: async () => {
      const inicio = performance.now();
      const { data, error } = await supabase.rpc('rpc_total_contas_do_dia', {
        p_empresa: selectedEmpresa,
        p_data: hoje,
      });
      const fim = performance.now();
      console.log(`⚡ rpc_total_contas_do_dia: ${(fim - inicio).toFixed(2)}ms`);
      if (error) throw error;
      return Number(data) || 0;
    },
  });

  // Query para Próxima Semana
  const { data: proximaSemana = 0, isLoading: loadingSemana } = useQuery({
    queryKey: ['proximaSemana', selectedEmpresa, inicioSemana, fimSemana],
    queryFn: async () => {
      const inicio = performance.now();
      const { data, error } = await supabase.rpc('rpc_total_proxima_semana', {
        p_empresa: selectedEmpresa,
        p_data_inicio: inicioSemana,
        p_data_fim: fimSemana,
      });
      const fim = performance.now();
      console.log(`⚡ rpc_total_proxima_semana: ${(fim - inicio).toFixed(2)}ms`);
      if (error) throw error;
      return Number(data) || 0;
    },
  });

  // Query para Mês Atual
  const { data: mesAtual = 0, isLoading: loadingMes } = useQuery({
    queryKey: ['mesAtual', selectedEmpresa, inicioMes, fimMes],
    queryFn: async () => {
      const inicio = performance.now();
      const { data, error } = await supabase.rpc('rpc_total_mes_atual', {
        p_empresa: selectedEmpresa,
        p_data_inicio: inicioMes,
        p_data_fim: fimMes,
      });
      const fim = performance.now();
      console.log(`⚡ rpc_total_mes_atual: ${(fim - inicio).toFixed(2)}ms`);
      if (error) throw error;
      return Number(data) || 0;
    },
  });

  // Query para Resumo (contadores)
  const { data: resumo, isLoading: loadingResumo } = useQuery<DashboardResumo>({
    queryKey: ['dashboardResumo', selectedEmpresa, hoje, inicioMes, fimMes],
    queryFn: async () => {
      const inicio = performance.now();
      const { data, error } = await supabase.rpc('rpc_dashboard_resumo', {
        p_empresa: selectedEmpresa,
        p_hoje: hoje,
        p_inicio_mes: inicioMes,
        p_fim_mes: fimMes,
      });
      const fim = performance.now();
      console.log(`⚡ rpc_dashboard_resumo: ${(fim - inicio).toFixed(2)}ms`);
      if (error) throw error;
      return data[0] || { contas_vencidas: 0, contas_pendentes: 0, contas_pagas_mes: 0 };
    },
  });

  // Query para Contas Próximas
  const { data: contasProximas = [], isLoading: loadingProximas } = useQuery<ContaProxima[]>({
    queryKey: ['contasProximas', selectedEmpresa, hoje],
    queryFn: async () => {
      const inicio = performance.now();
      const { data, error } = await supabase.rpc('rpc_contas_proximas', {
        p_empresa: selectedEmpresa,
        p_hoje: hoje,
      });
      const fim = performance.now();
      console.log(`⚡ rpc_contas_proximas: ${(fim - inicio).toFixed(2)}ms`);
      if (error) throw error;
      return data || [];
    },
  });

  const getNomeEmpresa = (id: string) => {
    const nomes: Record<string, string> = {
      "lider": "Líder",
      "lider-postos": "Líder Postos",
      "liderbag": "Lider Bag",
      "lg-caminhoes": "LG Caminhões",
      "lg-veiculos": "LG Veículos",
      "lg-seminovos": "LG Seminovos"
    };
    return nomes[id] || id;
  };

  // Loading state global
  const isLoading = loadingHoje || loadingSemana || loadingMes || loadingResumo || loadingProximas;

  return (
    <div className="space-y-8 p-6">
      {/* Loading overlay suave */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Carregando dashboard...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Financeiro</h1>
        <p className="text-muted-foreground mt-2">
          Empresa: <span className="font-semibold">{getNomeEmpresa(selectedEmpresa)}</span>
        </p>
      </div>

      {/* Cards de Totais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalHoje)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Contas a vencer hoje (em aberto)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próxima Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(proximaSemana)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Próximos 7 dias (saldo em aberto)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mês Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mesAtual)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total do mês (saldo em aberto)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Pagas no Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.contas_pagas_mes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Contas quitadas este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contas Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {resumo?.contas_vencidas || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Contas em aberto com vencimento anterior a hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {resumo?.contas_pendentes || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Contas em aberto a vencer hoje ou futuramente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contas Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {resumo?.contas_pagas_mes || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de contas pagas neste mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contas Próximas do Vencimento */}
      <Card>
        <CardHeader>
          <CardTitle>Contas Próximas do Vencimento</CardTitle>
          <CardDescription>Próximas contas a vencer nos próximos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {contasProximas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta próxima ao vencimento.</p>
          ) : (
            <div className="space-y-4">
              {contasProximas.map((conta) => (
                <div
                  key={conta.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{conta.descricao}</p>
                    <p className="text-sm text-muted-foreground">
                      Vencimento: {formatDate(conta.vencimento)}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold">{formatCurrency(conta.saldo)}</p>
                    <Badge variant={conta.status === "Pendente" ? "outline" : "secondary"}>
                      {conta.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Sistema</CardTitle>
          <CardDescription>Informações sobre o sistema de controle financeiro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong>Status:</strong> Todas as somas calculadas consideram apenas o saldo em aberto (Pendente ou Parcial).
          </p>
          <p className="text-sm">
            <strong>Performance:</strong> Sistema otimizado com cálculos no banco de dados e cache inteligente.
          </p>
          <p className="text-sm">
            <strong>Dica:</strong> Use o menu lateral para acessar Contas a Pagar, Fornecedores e Relatórios.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Função exportada para invalidar cache do Dashboard
export const invalidateDashboardQueries = (queryClient: any, empresa: string) => {
  queryClient.invalidateQueries({ queryKey: ['totalHoje', empresa] });
  queryClient.invalidateQueries({ queryKey: ['proximaSemana', empresa] });
  queryClient.invalidateQueries({ queryKey: ['mesAtual', empresa] });
  queryClient.invalidateQueries({ queryKey: ['dashboardResumo', empresa] });
  queryClient.invalidateQueries({ queryKey: ['contasProximas', empresa] });
};
