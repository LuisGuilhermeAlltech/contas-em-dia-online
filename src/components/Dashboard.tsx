
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus
} from "lucide-react";

interface DashboardProps {
  selectedEmpresa: string;
}

export const Dashboard = ({ selectedEmpresa }: DashboardProps) => {
  // Para demonstração, usando dados zerados - em uma implementação real
  // estes dados viriam de um contexto compartilhado ou estado global
  const dashboardData = {
    totalAPagar: 0,
    proximaSemana: 0,
    mesAtual: 0,
    contasVencidas: 0,
    contasPagas: 0,
    contasPendentes: 0
  };

  const contasProximas: any[] = [];

  const getNomeEmpresa = (id: string) => {
    const empresas: { [key: string]: string } = {
      "grupo-lider": "Grupo Líder",
      "alltech-matriz": "Alltech Matriz", 
      "alltech-filial": "Alltech Filial",
      "luis-guilherme": "Luis Guilherme"
    };
    return empresas[id] || id;
  };

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
            <CardTitle className="text-sm font-medium text-gray-600">Total a Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {dashboardData.totalAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Saldo em aberto</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Próxima Semana</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {dashboardData.proximaSemana.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              R$ {dashboardData.mesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    <p className="text-sm text-gray-600">Vencimento: {conta.vencimento}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">
                      R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant={conta.status === 'vencida' ? 'destructive' : 'secondary'}>
                      {conta.status === 'vencida' ? 'Vencida' : 'Pendente'}
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
            Dicas para Organização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Cadastro Rápido</h4>
              <p className="text-sm text-blue-700">
                Use descrições claras como "Nota 234 - José Material" para identificar facilmente suas contas.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Pagamentos Parciais</h4>
              <p className="text-sm text-blue-700">
                Registre pagamentos parciais conforme sua disponibilidade financeira.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
