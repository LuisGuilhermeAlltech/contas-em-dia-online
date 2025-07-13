
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  History,
  Paperclip
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContasAPagarProps {
  selectedEmpresa: string;
}

interface Pagamento {
  id: string;
  valor: number;
  data: string;
  created_at: string;
}

interface Conta {
  id: string;
  descricao: string;
  valor_total: number;
  total_pago: number;
  vencimento: string;
  empresa: string;
  created_at: string;
  pagamentos?: Pagamento[];
}

export const ContasAPagar = ({ selectedEmpresa }: ContasAPagarProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPagamentoDialogOpen, setIsPagamentoDialogOpen] = useState(false);
  const [contaParaPagamento, setContaParaPagamento] = useState<Conta | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    descricao: "",
    valorTotal: "",
    vencimento: "",
  });

  const [pagamentoData, setPagamentoData] = useState({
    valor: "",
    observacao: ""
  });

  // Carregar contas do Supabase
  const loadContas = async () => {
    try {
      setLoading(true);
      console.log("Carregando contas para empresa:", selectedEmpresa);
      
      const { data: contasData, error: contasError } = await supabase
        .from('contas')
        .select('*')
        .eq('empresa', selectedEmpresa)
        .order('vencimento', { ascending: true });

      if (contasError) {
        console.error("Erro ao carregar contas:", contasError);
        toast({
          title: "Erro",
          description: "Erro ao carregar contas do banco de dados",
          variant: "destructive",
        });
        return;
      }

      // Carregar pagamentos para cada conta
      const contasComPagamentos = await Promise.all(
        (contasData || []).map(async (conta) => {
          const { data: pagamentos } = await supabase
            .from('pagamentos')
            .select('*')
            .eq('conta_id', conta.id)
            .order('data', { ascending: false });

          return {
            ...conta,
            pagamentos: pagamentos || []
          };
        })
      );

      setContas(contasComPagamentos);
      console.log("Contas carregadas:", contasComPagamentos);
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar contas quando a empresa mudar
  useEffect(() => {
    if (selectedEmpresa) {
      loadContas();
    }
  }, [selectedEmpresa]);

  const handleSave = async () => {
    console.log("=== SALVANDO CONTA NO SUPABASE ===");
    console.log("Dados do formulário:", formData);
    console.log("Empresa selecionada:", selectedEmpresa);
    
    try {
      // Validação
      if (!formData.descricao.trim() || !formData.valorTotal.trim() || !formData.vencimento.trim()) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive",
        });
        return;
      }

      const valorNumerico = parseFloat(formData.valorTotal.replace(',', '.'));
      if (isNaN(valorNumerico) || valorNumerico <= 0) {
        toast({
          title: "Valor inválido",
          description: "Insira um valor válido maior que zero",
          variant: "destructive",
        });
        return;
      }

      // Inserir no Supabase
      const { data, error } = await supabase
        .from('contas')
        .insert({
          descricao: formData.descricao.trim(),
          empresa: selectedEmpresa,
          valor_total: valorNumerico,
          vencimento: formData.vencimento,
          total_pago: 0
        })
        .select()
        .single();

      if (error) {
        console.error("Erro do Supabase:", error);
        toast({
          title: "Erro ao salvar",
          description: "Erro ao salvar conta no banco de dados",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Conta salva no Supabase:", data);

      // Limpar formulário e fechar dialog
      setFormData({ descricao: "", valorTotal: "", vencimento: "" });
      setIsDialogOpen(false);

      // Recarregar lista
      await loadContas();

      toast({
        title: "✅ Sucesso!",
        description: `Conta "${data.descricao}" salva com sucesso`,
      });

    } catch (error) {
      console.error("❌ ERRO INESPERADO:", error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao salvar a conta",
        variant: "destructive",
      });
    }
  };

  const handlePagamento = async () => {
    if (!contaParaPagamento || !pagamentoData.valor) {
      toast({
        title: "Erro",
        description: "Informe o valor do pagamento",
        variant: "destructive",
      });
      return;
    }

    try {
      const valorPagamento = parseFloat(pagamentoData.valor.replace(',', '.'));
      if (isNaN(valorPagamento) || valorPagamento <= 0) {
        toast({
          title: "Erro",
          description: "Valor do pagamento deve ser maior que zero",
          variant: "destructive",
        });
        return;
      }

      const saldoRestante = contaParaPagamento.valor_total - contaParaPagamento.total_pago;
      if (valorPagamento > saldoRestante) {
        toast({
          title: "Erro",
          description: `Valor não pode ser maior que o saldo restante: R$ ${saldoRestante.toFixed(2)}`,
          variant: "destructive",
        });
        return;
      }

      // Inserir pagamento
      const { error: pagamentoError } = await supabase
        .from('pagamentos')
        .insert({
          conta_id: contaParaPagamento.id,
          valor: valorPagamento,
          data: new Date().toISOString().split('T')[0]
        });

      if (pagamentoError) {
        console.error("Erro ao inserir pagamento:", pagamentoError);
        toast({
          title: "Erro",
          description: "Erro ao registrar pagamento",
          variant: "destructive",
        });
        return;
      }

      // Atualizar total pago na conta
      const novoTotalPago = contaParaPagamento.total_pago + valorPagamento;
      const { error: contaError } = await supabase
        .from('contas')
        .update({ total_pago: novoTotalPago })
        .eq('id', contaParaPagamento.id);

      if (contaError) {
        console.error("Erro ao atualizar conta:", contaError);
        toast({
          title: "Erro",
          description: "Erro ao atualizar conta",
          variant: "destructive",
        });
        return;
      }

      // Limpar e fechar dialog
      setPagamentoData({ valor: "", observacao: "" });
      setIsPagamentoDialogOpen(false);
      setContaParaPagamento(null);

      // Recarregar lista
      await loadContas();

      toast({
        title: "Sucesso!",
        description: "Pagamento registrado com sucesso",
      });

    } catch (error) {
      console.error("Erro inesperado:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao registrar pagamento",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (contaId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;

    try {
      const { error } = await supabase
        .from('contas')
        .delete()
        .eq('id', contaId);

      if (error) {
        console.error("Erro ao excluir:", error);
        toast({
          title: "Erro",
          description: "Erro ao excluir conta",
          variant: "destructive",
        });
        return;
      }

      await loadContas();
      toast({
        title: "Sucesso!",
        description: "Conta excluída com sucesso",
      });
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir conta",
        variant: "destructive",
      });
    }
  };

  const getStatus = (conta: Conta) => {
    if (conta.total_pago >= conta.valor_total) return "pago";
    const dataVencimento = new Date(conta.vencimento);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataVencimento.setHours(0, 0, 0, 0);
    return dataVencimento < hoje ? "vencida" : "pendente";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pago</Badge>;
      case "vencida":
        return <Badge variant="destructive">Vencida</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pago":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "vencida":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
    }
  };

  const filteredContas = contas.filter(conta => {
    const status = getStatus(conta);
    const matchSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || status === statusFilter;
    return matchSearch && matchStatus;
  });

  const isFormValid = Boolean(
    formData.descricao?.trim() && 
    formData.valorTotal?.trim() && 
    formData.vencimento?.trim()
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <p className="text-gray-600">Carregando contas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Contas a Pagar</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="descricao">Descrição da Conta *</Label>
                <Textarea 
                  id="descricao" 
                  placeholder="Ex: Nota 234 - José Material de Construção" 
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({...prev, descricao: e.target.value}))}
                  className="min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="valor">Valor Total *</Label>
                <Input 
                  id="valor" 
                  type="number" 
                  step="0.01"
                  placeholder="0,00" 
                  value={formData.valorTotal}
                  onChange={(e) => setFormData(prev => ({...prev, valorTotal: e.target.value}))}
                />
              </div>
              <div>
                <Label htmlFor="vencimento">Data de Vencimento *</Label>
                <Input 
                  id="vencimento" 
                  type="date" 
                  value={formData.vencimento}
                  onChange={(e) => setFormData(prev => ({...prev, vencimento: e.target.value}))}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={!isFormValid}
                >
                  Salvar
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setFormData({ descricao: "", valorTotal: "", vencimento: "" });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog de Pagamento */}
      <Dialog open={isPagamentoDialogOpen} onOpenChange={setIsPagamentoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {contaParaPagamento && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{contaParaPagamento.descricao}</p>
                <p className="text-sm text-gray-600">Valor Total: R$ {contaParaPagamento.valor_total.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Já Pago: R$ {contaParaPagamento.total_pago.toFixed(2)}</p>
                <p className="text-sm font-medium text-red-600">
                  Saldo: R$ {(contaParaPagamento.valor_total - contaParaPagamento.total_pago).toFixed(2)}
                </p>
              </div>
              <div>
                <Label htmlFor="valorPagamento">Valor do Pagamento *</Label>
                <Input 
                  id="valorPagamento" 
                  type="number" 
                  step="0.01"
                  placeholder="0,00"
                  max={contaParaPagamento.valor_total - contaParaPagamento.total_pago}
                  value={pagamentoData.valor}
                  onChange={(e) => setPagamentoData({...pagamentoData, valor: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handlePagamento}
                  disabled={!pagamentoData.valor}
                >
                  Registrar Pagamento
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setIsPagamentoDialogOpen(false);
                    setPagamentoData({ valor: "", observacao: "" });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar contas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredContas.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all" 
                  ? "Nenhuma conta encontrada" 
                  : "Nenhuma conta cadastrada"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContas.map((conta) => {
                const status = getStatus(conta);
                return (
                  <div key={conta.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(status)}
                      <div>
                        <h3 className="font-medium text-gray-900">{conta.descricao}</h3>
                        <p className="text-sm text-gray-600">Vencimento: {new Date(conta.vencimento).toLocaleDateString('pt-BR')}</p>
                        {conta.total_pago > 0 && status !== "pago" && (
                          <p className="text-xs text-blue-600">
                            Pago: R$ {conta.total_pago.toFixed(2)} | Saldo: R$ {(conta.valor_total - conta.total_pago).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">
                          R$ {conta.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      {getStatusBadge(status)}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {status !== "pago" && (
                            <DropdownMenuItem 
                              onClick={() => {
                                setContaParaPagamento(conta);
                                setIsPagamentoDialogOpen(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Registrar Pagamento
                            </DropdownMenuItem>
                          )}
                          {conta.pagamentos && conta.pagamentos.length > 0 && (
                            <DropdownMenuItem>
                              <History className="h-4 w-4 mr-2" />
                              Histórico ({conta.pagamentos.length} pagamentos)
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDelete(conta.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
