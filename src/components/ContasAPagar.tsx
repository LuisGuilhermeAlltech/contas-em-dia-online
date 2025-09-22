import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  DollarSign,
  Trash2,
  Pencil,
  Check,
  Eye
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface ContasAPagarProps {
  selectedEmpresa: string;
}

type ContaView = Tables<'contas_view'>;

export const ContasAPagar = ({ selectedEmpresa }: ContasAPagarProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPagamentoDialogOpen, setIsPagamentoDialogOpen] = useState(false);
  const [contaParaPagamento, setContaParaPagamento] = useState<ContaView | null>(null);
  const [isHistoricoDialogOpen, setIsHistoricoDialogOpen] = useState(false);
  const [contaParaHistorico, setContaParaHistorico] = useState<ContaView | null>(null);
  const [historicoPagamentos, setHistoricoPagamentos] = useState<any[]>([]);
  const [contas, setContas] = useState<ContaView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    descricao: "",
    valorTotal: "",
    vencimento: "",
  });
  const [multiDatesEnabled, setMultiDatesEnabled] = useState(false);
  const [vencimentosMultiplos, setVencimentosMultiplos] = useState<string[]>([""]);

  const [pagamentoData, setPagamentoData] = useState({
    valor: ""
  });

  // Edição de conta
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [contaParaEditar, setContaParaEditar] = useState<ContaView | null>(null);
  const [editForm, setEditForm] = useState({
    descricao: "",
    vencimento: "",
    valorTotal: "",
  });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Carregar contas da view contas_view
  const loadContas = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Carregando contas da view para empresa:", selectedEmpresa);
      
      // Usar query direta na view
      const { data: contasData, error } = await supabase
        .from('contas_view')
        .select('*')
        .eq('empresa', selectedEmpresa)
        .order('vencimento', { ascending: true });

      if (error) {
        console.error("Erro ao carregar contas:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar contas do banco de dados",
          variant: "destructive",
        });
        return;
      }

      setContas(contasData || []);
      console.log("Contas carregadas da view:", contasData);
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
  }, [selectedEmpresa, toast]);

  useEffect(() => {
    if (selectedEmpresa) {
      loadContas();
    }
  }, [selectedEmpresa, loadContas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formData.descricao || !formData.valorTotal || (!formData.vencimento && !multiDatesEnabled)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const valor = Number(formData.valorTotal.toString().replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Insira um valor válido maior que zero",
        variant: "destructive",
      });
      return;
    }

    if (multiDatesEnabled) {
      const validDates = vencimentosMultiplos.map((d) => d?.trim()).filter(Boolean);
      if (validDates.length === 0) {
        toast({
          title: "Datas inválidas",
          description: "Adicione ao menos uma data de vencimento",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsSaving(true);

      const base = {
        descricao: formData.descricao,
        valor_total: valor,
        empresa: selectedEmpresa,
        total_pago: 0,
      } as const;

      const rows = multiDatesEnabled
        ? vencimentosMultiplos
            .map((d) => d.trim())
            .filter(Boolean)
            .slice(0, 5)
            .map((d) => ({ ...base, vencimento: d }))
        : [{ ...base, vencimento: formData.vencimento }];

      if (rows.length === 0) {
        throw new Error("Nenhuma conta válida para inserir");
      }

      const { error } = await supabase
        .from("contas")
        .insert(rows);

      if (error) {
        console.error("Erro:", error);
        throw error;
      }

      toast({
        title: "Sucesso",
        description: `${rows.length} conta(s) criada(s) com sucesso`,
      });

      setFormData({
        descricao: "",
        valorTotal: "",
        vencimento: "",
      });
      setVencimentosMultiplos([""]);
      setMultiDatesEnabled(false);
      setIsDialogOpen(false);
      
      // Aguardar um pouco antes de recarregar para dar tempo da inserção ser processada
      setTimeout(() => {
        loadContas();
      }, 500);
    } catch (error) {
      console.error("Erro completo:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar conta(s). Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;
    
    try {
      const { error } = await supabase
        .from("contas")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta excluída com sucesso",
      });
      loadContas();
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir conta",
        variant: "destructive",
      });
    }
  };

  const handleAdicionarPagamento = async () => {
    if (!contaParaPagamento || isProcessing) return;

    const valor = Number(pagamentoData.valor.toString().replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Insira um valor válido",
        variant: "destructive",
      });
      return;
    }

    const saldoRestante = Number(contaParaPagamento.saldo || 0);
    if (valor > saldoRestante) {
      toast({
        title: "Valor excede o saldo",
        description: `O valor não pode ser maior que R$ ${saldoRestante.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      const { error } = await supabase
        .from('pagamentos')
        .insert({
          conta_id: contaParaPagamento.id as string,
          valor,
          data: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso",
      });

      setPagamentoData({ valor: "" });
      setIsPagamentoDialogOpen(false);
      setContaParaPagamento(null);
      
      // Aguardar um pouco antes de recarregar
      setTimeout(() => {
        loadContas();
      }, 500);
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao registrar pagamento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarcarComoPaga = async (conta: ContaView) => {
    if (isProcessing) return;
    
    const saldoRestante = Number(conta.saldo || 0);
    if (saldoRestante <= 0) {
      toast({
        title: "Conta já paga",
        description: "Esta conta já está totalmente paga",
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      const { error } = await supabase
        .from('pagamentos')
        .insert({
          conta_id: conta.id as string,
          valor: saldoRestante,
          data: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast({
        title: "Sucesso", 
        description: "Conta marcada como paga",
      });
      
      // Aguardar um pouco antes de recarregar
      setTimeout(() => {
        loadContas();
      }, 500);
    } catch (error) {
      console.error("Erro ao marcar como paga:", error);
      toast({
        title: "Erro",
        description: "Erro ao marcar conta como paga",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerHistorico = async (conta: ContaView) => {
    try {
      const { data, error } = await supabase
        .from('pagamentos')
        .select('*')
        .eq('conta_id', conta.id)
        .order('data', { ascending: false });

      if (error) throw error;

      setHistoricoPagamentos(data || []);
      setContaParaHistorico(conta);
      setIsHistoricoDialogOpen(true);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de pagamentos",
        variant: "destructive",
      });
    }
  };

  const abrirEdicao = (conta: ContaView) => {
    setContaParaEditar(conta);
    setEditForm({
      descricao: conta.descricao || "",
      vencimento: conta.vencimento || "",
      valorTotal: String(conta.valor_total || ""),
    });
    setIsEditDialogOpen(true);
  };

  const handleSalvarEdicao = async () => {
    if (!contaParaEditar || salvandoEdicao) return;
    
    if (!editForm.descricao || !editForm.vencimento || !editForm.valorTotal) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    const valor = Number(editForm.valorTotal.toString().replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Insira um valor válido",
        variant: "destructive",
      });
      return;
    }

    try {
      setSalvandoEdicao(true);
      
      const { error } = await supabase
        .from('contas')
        .update({
          descricao: editForm.descricao,
          vencimento: editForm.vencimento,
          valor_total: valor,
        })
        .eq('id', contaParaEditar.id as string);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta atualizada com sucesso",
      });

      setIsEditDialogOpen(false);
      setContaParaEditar(null);
      
      // Aguardar um pouco antes de recarregar
      setTimeout(() => {
        loadContas();
      }, 500);
    } catch (error) {
      console.error("Erro ao atualizar conta:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar conta",
        variant: "destructive",
      });
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pago":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Pago</Badge>;
      case "Parcial":
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Parcial</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const filteredContas = contas.filter(conta => {
    if (!conta) return false;
    
    const matchSearch = (conta.descricao || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchStatus = statusFilter === "all" || (conta.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const isFormValid = Boolean(
    formData.descricao?.trim() &&
    formData.valorTotal?.trim() &&
    (multiDatesEnabled
      ? vencimentosMultiplos.length > 0 && vencimentosMultiplos.every((d) => d && d.trim())
      : formData.vencimento?.trim())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">Contas a Pagar</h2>
        <div className="text-center py-8">
          <p>Carregando contas...</p>
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Conta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Fornecedor XYZ"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="valor">Valor Total</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={formData.valorTotal}
                  onChange={(e) => setFormData({ ...formData, valorTotal: e.target.value })}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="multi-dates"
                  checked={multiDatesEnabled}
                  onCheckedChange={setMultiDatesEnabled}
                />
                <Label htmlFor="multi-dates">Múltiplas datas de vencimento</Label>
              </div>

              {!multiDatesEnabled ? (
                <div>
                  <Label htmlFor="vencimento">Data de Vencimento</Label>
                  <Input
                    id="vencimento"
                    type="date"
                    value={formData.vencimento}
                    onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div>
                  <Label>Datas de Vencimento (máx. 5)</Label>
                  {vencimentosMultiplos.slice(0, 5).map((data, idx) => (
                    <div key={idx} className="flex gap-2 mt-2">
                      <Input
                        type="date"
                        value={data}
                        onChange={(e) => {
                          const next = [...vencimentosMultiplos];
                          next[idx] = e.target.value;
                          setVencimentosMultiplos(next);
                        }}
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const next = vencimentosMultiplos.filter((_, i) => i !== idx);
                          setVencimentosMultiplos(next.length ? next : [""]);
                        }}
                        aria-label="Remover data"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {vencimentosMultiplos.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setVencimentosMultiplos([...vencimentosMultiplos, ""])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Data
                    </Button>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={!isFormValid || isSaving}
                >
                  {isSaving ? "Salvando..." : "Criar Conta"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog de Pagamento */}
      <Dialog open={isPagamentoDialogOpen} onOpenChange={setIsPagamentoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {contaParaPagamento && (
            <div className="space-y-4">
              <div>
                <p><strong>Conta:</strong> {contaParaPagamento.descricao}</p>
                <p><strong>Valor Total:</strong> R$ {Number(contaParaPagamento.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p><strong>Saldo Restante:</strong> R$ {Number(contaParaPagamento.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <Label htmlFor="valor-pagamento">Valor do Pagamento</Label>
                <Input
                  id="valor-pagamento"
                  type="number"
                  step="0.01"
                  value={pagamentoData.valor}
                  onChange={(e) => setPagamentoData({ valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsPagamentoDialogOpen(false);
                    setContaParaPagamento(null);
                    setPagamentoData({ valor: "" });
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAdicionarPagamento}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processando..." : "Registrar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog open={isHistoricoDialogOpen} onOpenChange={setIsHistoricoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Pagamentos</DialogTitle>
          </DialogHeader>
          {contaParaHistorico && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold">{contaParaHistorico.descricao}</h3>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-gray-600">Valor Total:</span>
                    <span className="ml-2 font-semibold">R$ {Number(contaParaHistorico.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Pago:</span>
                    <span className="ml-2 font-semibold text-green-600">R$ {Number(contaParaHistorico.total_pago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Saldo Restante:</span>
                    <span className="ml-2 font-semibold text-orange-600">R$ {Number(contaParaHistorico.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2">{getStatusBadge(contaParaHistorico.status || 'Pendente')}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Pagamentos Realizados</h4>
                {historicoPagamentos.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhum pagamento encontrado</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {historicoPagamentos.map((pagamento, index) => (
                      <div key={pagamento.id || index} className="flex justify-between items-center p-3 bg-white border rounded">
                        <div>
                          <span className="text-sm text-gray-600">
                            {new Date(pagamento.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="font-semibold text-green-600">
                          R$ {Number(pagamento.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setIsHistoricoDialogOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Input
                id="edit-descricao"
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-vencimento">Data de Vencimento</Label>
              <Input
                id="edit-vencimento"
                type="date"
                value={editForm.vencimento}
                onChange={(e) => setEditForm({ ...editForm, vencimento: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-valor">Valor Total</Label>
              <Input
                id="edit-valor"
                type="number"
                step="0.01"
                value={editForm.valorTotal}
                onChange={(e) => setEditForm({ ...editForm, valorTotal: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSalvarEdicao}
                disabled={salvandoEdicao}
              >
                {salvandoEdicao ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por descrição..."
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
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                if (!conta || !conta.id) return null;
                return (
                  <div key={conta.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{conta.descricao || 'Sem descrição'}</h3>
                      <p className="text-sm text-gray-600">
                        Vencimento: {conta.vencimento ? new Date(conta.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                      </p>
                      {conta.status === "Parcial" && (
                        <p className="text-xs text-blue-600">
                          Pago: R$ {(conta.total_pago || 0).toFixed(2)} | Saldo: R$ {(conta.saldo || 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">
                          R$ {(conta.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">
                          Total: R$ {(conta.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      {getStatusBadge(conta.status || 'Pendente')}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {conta.status === "Parcial" && (
                            <DropdownMenuItem 
                              onClick={() => handleVerHistorico(conta)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Histórico de Pagamentos
                            </DropdownMenuItem>
                          )}
                          {conta.status !== "Pago" && conta.saldo && conta.saldo > 0 && (
                            <DropdownMenuItem 
                              onClick={() => handleMarcarComoPaga(conta)}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Marcar como Paga
                            </DropdownMenuItem>
                          )}
                          {conta.status !== "Pago" && (
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
                          <DropdownMenuItem 
                            onClick={() => abrirEdicao(conta)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDelete(conta.id!)}
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