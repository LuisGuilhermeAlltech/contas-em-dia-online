
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  FileText, 
  Calendar, 
  Filter,
  BarChart3,
  PieChart,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface RelatoriosProps {
  selectedEmpresa: string;
}

type ContaView = Tables<'contas_view'>;

export const Relatorios = ({ selectedEmpresa }: RelatoriosProps) => {
  const [tipoRelatorio, setTipoRelatorio] = useState("contas-pagas");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [contas, setContas] = useState<ContaView[]>([]);
  const [resumoFinanceiro, setResumoFinanceiro] = useState({
    totalPago: 0,
    totalPendente: 0,
    totalVencido: 0,
    contasPagas: 0,
    contasPendentes: 0,
    contasVencidas: 0
  });
  const [resumoPeriodo, setResumoPeriodo] = useState({
    totalPago: 0,
    totalAPagar: 0,
    totalContas: 0
  });

  const loadRelatoriosData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contas_view')
        .select('*')
        .eq('empresa', selectedEmpresa);

      if (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados do relatório");
        return;
      }

      if (!data) return;

      setContas(data);
      
      // Calcular resumo financeiro
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      let totalPago = 0;
      let totalPendente = 0;
      let totalVencido = 0;
      let contasPagas = 0;
      let contasPendentes = 0;
      let contasVencidas = 0;

      data.forEach(conta => {
        if (!conta.vencimento) return;
        
        const vencimento = new Date(conta.vencimento + 'T00:00:00');
        const isPago = conta.status === 'Pago';
        const isVencida = conta.status !== 'Pago' && vencimento < hoje;

        if (isPago) {
          totalPago += conta.valor_total || 0;
          contasPagas++;
        } else if (isVencida) {
          totalVencido += conta.saldo || 0;
          contasVencidas++;
        } else {
          totalPendente += conta.saldo || 0;
          contasPendentes++;
        }
      });

      setResumoFinanceiro({
        totalPago,
        totalPendente,
        totalVencido,
        contasPagas,
        contasPendentes,
        contasVencidas
      });

    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmpresa) {
      loadRelatoriosData();
    }
  }, [selectedEmpresa]);

  const relatóriosDisponiveis = [
    {
      id: "contas-pagas",
      nome: "Contas Pagas",
      descricao: "Relatório de todas as contas pagas no período",
      icon: FileText
    },
    {
      id: "contas-pendentes",
      nome: "Contas Pendentes",
      descricao: "Relatório de contas em aberto",
      icon: Calendar
    },
    {
      id: "por-fornecedor",
      nome: "Por Fornecedor",
      descricao: "Relatório agrupado por fornecedor",
      icon: BarChart3
    },
    {
      id: "por-categoria",
      nome: "Por Categoria",
      descricao: "Relatório agrupado por categoria",
      icon: PieChart
    }
  ];

  const getFilteredContas = () => {
    let filteredContas = [...contas];

    // Filtrar por tipo de relatório
    switch (tipoRelatorio) {
      case "contas-pagas":
        filteredContas = filteredContas.filter(conta => conta.status === 'Pago');
        break;
      case "contas-pendentes":
        filteredContas = filteredContas.filter(conta => conta.status !== 'Pago');
        break;
    }

    // Filtrar por período se especificado
    if (periodoInicio && periodoFim) {
      const inicio = new Date(periodoInicio + 'T00:00:00');
      const fim = new Date(periodoFim + 'T23:59:59');
      
      filteredContas = filteredContas.filter(conta => {
        if (!conta.vencimento) return false;
        const vencimento = new Date(conta.vencimento + 'T00:00:00');
        return vencimento >= inicio && vencimento <= fim;
      });
    }

    return filteredContas;
  };

  const calcularResumoPeriodo = () => {
    const filteredContas = getFilteredContas();
    
    console.log("Calculando resumo do período...");
    console.log("Contas filtradas:", filteredContas.length);
    console.log("Período:", periodoInicio, "até", periodoFim);
    
    let totalPago = 0;
    let totalAPagar = 0;
    
    filteredContas.forEach(conta => {
      if (conta.status === 'Pago') {
        totalPago += conta.valor_total || 0;
      } else {
        totalAPagar += conta.saldo || 0;
      }
    });

    console.log("Total pago:", totalPago);
    console.log("Total a pagar:", totalAPagar);

    setResumoPeriodo({
      totalPago,
      totalAPagar,
      totalContas: filteredContas.length
    });
    
    toast.success(`Resumo calculado: ${filteredContas.length} contas encontradas`);
  };

  const handleExportReport = (format: string) => {
    const filteredContas = getFilteredContas();
    
    if (filteredContas.length === 0) {
      toast.error("Nenhuma conta encontrada para o filtro aplicado");
      return;
    }

    const csvContent = generateCSV(filteredContas);
    downloadFile(csvContent, `relatorio-${tipoRelatorio}-${selectedEmpresa}.csv`);
    toast.success(`Relatório exportado em formato ${format.toUpperCase()}`);
  };

  const generateCSV = (contasData: ContaView[]) => {
    const headers = ['Descrição', 'Vencimento', 'Valor Total', 'Total Pago', 'Saldo', 'Status'];
    const rows = contasData.map(conta => [
      conta.descricao || '',
      conta.vencimento ? new Date(conta.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '',
      (conta.valor_total || 0).toFixed(2),
      (conta.total_pago || 0).toFixed(2),
      (conta.saldo || 0).toFixed(2),
      conta.status || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Relatórios</h2>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Total Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {resumoFinanceiro.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-gray-600">{resumoFinanceiro.contasPagas} contas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Total Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {resumoFinanceiro.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-gray-600">{resumoFinanceiro.contasPendentes} contas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Total Vencido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {resumoFinanceiro.totalVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-gray-600">{resumoFinanceiro.contasVencidas} contas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros de Relatório */}
      <Card>
        <CardHeader>
          <CardTitle>Gerar Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="tipo-relatorio">Tipo de Relatório</Label>
              <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relatóriosDisponiveis.map((relatorio) => (
                    <SelectItem key={relatorio.id} value={relatorio.id}>
                      {relatorio.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="periodo-inicio">Data Início</Label>
              <Input 
                id="periodo-inicio"
                type="date" 
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="periodo-fim">Data Fim</Label>
              <Input 
                id="periodo-fim"
                type="date" 
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
              />
            </div>
            
            <div className="flex items-end gap-2">
              <Button 
                onClick={calcularResumoPeriodo}
                className="bg-blue-600 hover:bg-blue-700 flex-1"
              >
                <Filter className="h-4 w-4 mr-2" />
                Calcular
              </Button>
              <Button 
                onClick={() => handleExportReport('pdf')}
                className="bg-red-600 hover:bg-red-700 flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button 
                onClick={() => handleExportReport('excel')}
                className="bg-green-600 hover:bg-green-700 flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo do Período Selecionado */}
      {(periodoInicio && periodoFim && resumoPeriodo.totalContas > 0) && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-700">Resumo do Período Selecionado</CardTitle>
            <p className="text-sm text-blue-600">
              {new Date(periodoInicio + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(periodoFim + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  R$ {resumoPeriodo.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-gray-600">Total Pago</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  R$ {resumoPeriodo.totalAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-gray-600">Total a Pagar</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {resumoPeriodo.totalContas}
                </div>
                <p className="text-sm text-gray-600">Total de Contas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tipos de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {relatóriosDisponiveis.map((relatorio) => {
          const Icon = relatorio.icon;
          return (
            <Card key={relatorio.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>{relatorio.nome}</CardTitle>
                    <p className="text-sm text-gray-600">{relatorio.descricao}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleExportReport('pdf')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    PDF
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleExportReport('excel')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview do Relatório */}
      <Card>
        <CardHeader>
          <CardTitle>Visualizar Dados do Relatório</CardTitle>
          <p className="text-sm text-gray-600">
            {getFilteredContas().length} registros encontrados
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Carregando dados...</p>
            </div>
          ) : getFilteredContas().length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma conta encontrada para os filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Descrição</th>
                    <th className="text-left p-2">Vencimento</th>
                    <th className="text-right p-2">Valor Total</th>
                    <th className="text-right p-2">Saldo</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredContas().slice(0, 10).map((conta) => (
                    <tr key={conta.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{conta.descricao}</td>
                      <td className="p-2">
                        {conta.vencimento ? new Date(conta.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="p-2 text-right">
                        R$ {(conta.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right">
                        R$ {(conta.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          conta.status === 'Pago' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {conta.status || 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {getFilteredContas().length > 10 && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  ... e mais {getFilteredContas().length - 10} registros
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
