import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { AlertCircle, Clock, CheckCircle, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardProps {
  selectedEmpresa: string;
}

export function DashboardNovo({ selectedEmpresa }: DashboardProps) {
  const { data: resumo, isLoading: loadingResumo, error: errorResumo } = useQuery({
    queryKey: ["dashboard-resumo", selectedEmpresa],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_resumo_cp", {
        p_empresa: selectedEmpresa,
      });
      if (error) throw error;
      return data?.[0] || {
        total_hoje: 0,
        total_prox_semana: 0,
        total_mes_atual: 0,
        qtd_vencidas: 0,
        qtd_pendentes: 0,
        qtd_pagas_mes: 0,
      };
    },
    retry: 2,
  });

  const { data: proximas, isLoading: loadingProximas, error: errorProximas } = useQuery({
    queryKey: ["dashboard-proximas", selectedEmpresa],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_proximas_contas", {
        p_empresa: selectedEmpresa,
        p_limite: 10,
      });
      if (error) throw error;
      return data || [];
    },
    retry: 2,
  });

  const isLoading = loadingResumo || loadingProximas;
  const error = errorResumo || errorProximas;

  const getNomeEmpresa = (id: string) => {
    const empresas: Record<string, string> = {
      "d0f7e8c5-7d49-438e-bc8f-9fb3b4e31e64": "Luis Guilherme",
      "b4e31e64-9fb3-438e-bc8f-d0f7e8c57d49": "Adryssia Cortez",
    };
    return empresas[id] || "Todas as Empresas";
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar dashboard: {error instanceof Error ? error.message : "Erro desconhecido"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Dashboard Financeiro
        </h1>
        <div className="text-sm text-muted-foreground">
          {getNomeEmpresa(selectedEmpresa)}
        </div>
      </div>

      {/* Cards de Totais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Hoje
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Number(resumo?.total_hoje || 0))}</div>
            <p className="text-xs text-muted-foreground mt-1">Contas com vencimento hoje</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próxima Semana
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Number(resumo?.total_prox_semana || 0))}</div>
            <p className="text-xs text-muted-foreground mt-1">Próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mês Atual
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Number(resumo?.total_mes_atual || 0))}</div>
            <p className="text-xs text-muted-foreground mt-1">Total do mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Quantidades */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contas Vencidas
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{resumo?.qtd_vencidas || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Requer atenção imediata</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contas Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{resumo?.qtd_pendentes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando vencimento</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagas no Mês
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resumo?.qtd_pagas_mes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Contas quitadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Próximas Contas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próximas Contas a Vencer</CardTitle>
        </CardHeader>
        <CardContent>
          {!proximas || proximas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma conta pendente encontrada
            </p>
          ) : (
            <div className="space-y-3">
              {proximas.map((conta: any) => (
                <div
                  key={conta.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{conta.descricao}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          conta.status_calc === "vencida"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-orange-500/10 text-orange-600"
                        }`}
                      >
                        {conta.status_calc}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{conta.fornecedor}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(Number(conta.valor_aberto))}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(conta.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
