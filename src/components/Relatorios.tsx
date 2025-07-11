
import { useState } from "react";
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

interface RelatoriosProps {
  selectedEmpresa: string;
}

export const Relatorios = ({ selectedEmpresa }: RelatoriosProps) => {
  const [tipoRelatorio, setTipoRelatorio] = useState("contas-pagas");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");

  // Dados fictícios para demonstração
  const resumoFinanceiro = {
    totalPago: 12450.80,
    totalPendente: 8750.30,
    totalVencido: 2150.00,
    contasPagas: 18,
    contasPendentes: 7,
    contasVencidas: 2
  };

  const contasPorCategoria = [
    { categoria: "Utilidades", valor: 1250.50, porcentagem: 35 },
    { categoria: "Aluguel", valor: 2500.00, porcentagem: 45 },
    { categoria: "Material", valor: 680.30, porcentagem: 12 },
    { categoria: "Serviços", valor: 420.00, porcentagem: 8 }
  ];

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

  const handleExportReport = (format: string) => {
    console.log(`Exportando relatório em formato ${format}...`);
    // Aqui você implementaria a lógica de exportação
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

      {/* Análise por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contasPorCategoria.map((categoria, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                  <span className="font-medium">{categoria.categoria}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${categoria.porcentagem}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12">{categoria.porcentagem}%</span>
                  <span className="font-bold text-gray-900 w-24 text-right">
                    R$ {categoria.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
