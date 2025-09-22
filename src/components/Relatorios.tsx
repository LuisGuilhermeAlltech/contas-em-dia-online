
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
  TrendingUp,
  Pencil
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  const [editOpen, setEditOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaView | null>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editVencimento, setEditVencimento] = useState("");
  const [editValorTotal, setEditValorTotal] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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

    // Ordenar por data de vencimento em ordem crescente
    filteredContas.sort((a, b) => {
      const aDate = a.vencimento ? new Date(a.vencimento + 'T00:00:00').getTime() : Infinity;
      const bDate = b.vencimento ? new Date(b.vencimento + 'T00:00:00').getTime() : Infinity;
      return aDate - bDate;
    });

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

  const openEdit = (conta: ContaView) => {
    setEditingConta(conta);
    setEditDescricao(conta.descricao || "");
    setEditVencimento(conta.vencimento || "");
    setEditValorTotal(String(conta.valor_total ?? ""));
    setEditOpen(true);
  };

  const handleUpdateConta = async () => {
    if (!editingConta) return;
    if (!editDescricao || !editVencimento || !editValorTotal) {
      toast.error("Preencha descrição, vencimento e valor.");
      return;
    }

    const valor = Number(editValorTotal.toString().replace(',', '.'));
    if (isNaN(valor)) {
      toast.error("Valor inválido.");
      return;
    }

    try {
      setSavingEdit(true);
      const { error } = await supabase
        .from('contas')
        .update({
          descricao: editDescricao,
          vencimento: editVencimento,
          valor_total: valor,
        })
        .eq('id', editingConta.id as string);

      if (error) {
        console.error(error);
        toast.error("Erro ao atualizar conta");
        return;
      }

      toast.success("Conta atualizada");
      await loadRelatoriosData();
      calcularResumoPeriodo();
      setEditOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro inesperado ao atualizar");
    } finally {
      setSavingEdit(false);
    }
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo e Tabela de Contas */}
      {((periodoInicio && periodoFim && resumoPeriodo.totalContas > 0) || (!periodoInicio && !periodoFim)) && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-700">
              {periodoInicio && periodoFim ? 'Resumo do Período Selecionado' : `Relatório de ${relatóriosDisponiveis.find(r => r.id === tipoRelatorio)?.nome || 'Contas'}`}
            </CardTitle>
            {periodoInicio && periodoFim && (
              <p className="text-sm text-blue-600">
                {new Date(periodoInicio + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(periodoFim + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {(periodoInicio && periodoFim) ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            ) : (
              <div className="mb-6">
                <p className="text-lg text-gray-700">
                  Exibindo {getFilteredContas().length} contas do tipo "{relatóriosDisponiveis.find(r => r.id === tipoRelatorio)?.nome}"
                </p>
              </div>
            )}
            
            {/* Tabela detalhada de todas as contas */}
            <div className="mt-6">
              <h4 className="text-lg font-semibold mb-3 text-blue-700">
                {periodoInicio && periodoFim ? 'Detalhes das Contas do Período' : 'Lista de Contas'}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border px-4 py-3 text-left">Empresa</th>
                      <th className="border px-4 py-3 text-left">Descrição</th>
                      <th className="border px-4 py-3 text-left">Vencimento</th>
                      <th className="border px-4 py-3 text-right">Valor Total</th>
                      <th className="border px-4 py-3 text-right">Total Pago</th>
                      <th className="border px-4 py-3 text-right">Saldo</th>
                      <th className="border px-4 py-3 text-center">Status</th>
                      <th className="border px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredContas().map((conta, index) => (
                      <tr key={conta.id} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition-colors`}>
                        <td className="border px-4 py-2 font-medium">{conta.empresa}</td>
                        <td className="border px-4 py-2">{conta.descricao}</td>
                        <td className="border px-4 py-2">
                          {conta.vencimento ? new Date(conta.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="border px-4 py-2 text-right font-semibold">
                          R$ {Number(conta.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border px-4 py-2 text-right text-green-600 font-semibold">
                          R$ {Number(conta.total_pago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border px-4 py-2 text-right text-orange-600 font-semibold">
                          R$ {Number(conta.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border px-4 py-2 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            conta.status === 'Pago' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {conta.status || 'Pendente'}
                          </span>
                        </td>
                        <td className="border px-4 py-2 text-center">
                          <Button variant="outline" size="sm" onClick={() => openEdit(conta)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Totais resumidos na parte inferior */}
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Total de registros: <strong>{getFilteredContas().length}</strong></span>
                  {periodoInicio && periodoFim && (
                    <div className="flex gap-6">
                      <span className="text-green-600 font-semibold">
                        Pago: R$ {resumoPeriodo.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-orange-600 font-semibold">
                        A Pagar: R$ {resumoPeriodo.totalAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-blue-600 font-semibold">
                        Total Geral: R$ {(resumoPeriodo.totalPago + resumoPeriodo.totalAPagar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vencimento">Vencimento</Label>
              <Input id="vencimento" type="date" value={editVencimento} onChange={(e) => setEditVencimento(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="valor">Valor Total</Label>
              <Input id="valor" type="number" step="0.01" value={editValorTotal} onChange={(e) => setEditValorTotal(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateConta} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
