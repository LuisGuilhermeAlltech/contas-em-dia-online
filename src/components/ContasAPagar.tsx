
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
  Check
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
  const loadContas = async () => {
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
  };

  // Memoizar loadContas para evitar re-renders
  const memoizedLoadContas = useCallback(loadContas, [selectedEmpresa]);

  // Carregar contas quando a empresa mudar
  useEffect(() => {
    if (selectedEmpresa) {
      memoizedLoadContas();
    }
  }, [selectedEmpresa, memoizedLoadContas]);

  const handleSave = async () => {
    if (isSaving) return; // Previne cliques duplos
    
    setIsSaving(true);
    console.log("=== SALVANDO CONTA NO SUPABASE ===");
    console.log("Dados do formulário:", formData, { multiDatesEnabled, vencimentosMultiplos });
    console.log("Empresa selecionada:", selectedEmpresa);
    
    try {
      // Validação básica
      if (!formData.descricao.trim() || !formData.valorTotal.trim()) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive",
        });
        return;
      }

      // Validar datas
      if (!multiDatesEnabled && !formData.vencimento.trim()) {
        toast({
          title: "Campos obrigatórios",
          description: "Informe a data de vencimento",
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
        if (validDates.some((d) => isNaN(Date.parse(d!)))) {
          toast({
            title: "Datas inválidas",
            description: "Verifique as datas informadas",
            variant: "destructive",
          });
          return;
        }
      } else if (isNaN(Date.parse(formData.vencimento))) {
        toast({
          title: "Data inválida",
          description: "Informe uma data de vencimento válida",
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

      const base = {
        descricao: formData.descricao.trim(),
        empresa: selectedEmpresa,
        valor_total: valorNumerico,
      } as const;

      const rows = multiDatesEnabled
        ? vencimentosMultiplos
            .map((d) => d.trim())
            .filter(Boolean)
            .slice(0, 5)
            .map((d) => ({ ...base, vencimento: d }))
        : [{ ...base, vencimento: formData.vencimento }];

      if (rows.length === 0) {
        toast({
          title: "Nada a salvar",
          description: "Adicione ao menos uma data",
          variant: "destructive",
        });
        return;
      }

      // Inserção em lote quando houver múltiplas datas
      const { data, error } = await supabase
        .from('contas')
        .insert(rows)
        .select();

      if (error) {
        console.error("Erro do Supabase:", error);
        toast({
          title: "Erro ao salvar",
          description: "Erro ao salvar conta(s) no banco de dados",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Conta(s) salva(s) no Supabase:", data);

      // Limpar formulário e fechar dialog
      setFormData({ descricao: "", valorTotal: "", vencimento: "" });
      setMultiDatesEnabled(false);
      setVencimentosMultiplos([""]);
      setIsDialogOpen(false);

      // Recarregar lista da view (debounced)
      setTimeout(() => loadContas(), 100);

      toast({
        title: "✅ Sucesso!",
        description: multiDatesEnabled
          ? `${rows.length} contas salvas com sucesso`
          : `Conta "${rows[0].descricao}" salva com sucesso`,
      });

    } catch (error) {
      console.error("❌ ERRO INESPERADO:", error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao salvar a conta",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePagamento = async () => {
    if (isProcessing || !contaParaPagamento || !pagamentoData.valor) {
      if (!contaParaPagamento || !pagamentoData.valor) {
        toast({
          title: "Erro",
          description: "Informe o valor do pagamento",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      setIsProcessing(true);
      const valorPagamento = parseFloat(pagamentoData.valor.replace(',', '.'));
      if (isNaN(valorPagamento) || valorPagamento <= 0) {
        toast({
          title: "Erro",
          description: "Valor do pagamento deve ser maior que zero",
          variant: "destructive",
        });
        return;
      }

      if (valorPagamento > (contaParaPagamento.saldo || 0)) {
        toast({
          title: "Erro",
          description: `Valor não pode ser maior que o saldo restante: R$ ${(contaParaPagamento.saldo || 0).toFixed(2)}`,
          variant: "destructive",
        });
        return;
      }

      // Inserir pagamento na tabela pagamentos
      const { error: pagamentoError } = await supabase
        .from('pagamentos')
        .insert({
          conta_id: contaParaPagamento.id!,
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

      // Limpar e fechar dialog
      setPagamentoData({ valor: "" });
      setIsPagamentoDialogOpen(false);
      setContaParaPagamento(null);

      // Recarregar lista da view (os valores são calculados automaticamente)
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
    } finally {
      setIsProcessing(false);
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

  // Marcar como paga
  const handleMarcarComoPaga = async (conta: ContaView) => {
    if (!conta.saldo || conta.saldo <= 0) return;

    try {
      // Inserir pagamento com o valor do saldo restante
      const { error: pagamentoError } = await supabase
        .from('pagamentos')
        .insert({
          conta_id: conta.id!,
          valor: conta.saldo,
          data: new Date().toISOString().split('T')[0]
        });

      if (pagamentoError) {
        console.error("Erro ao marcar como paga:", pagamentoError);
        toast({
          title: "Erro",
          description: "Erro ao marcar conta como paga",
          variant: "destructive",
        });
        return;
      }

      // Recarregar lista (debounced)  
      setTimeout(() => loadContas(), 100);

      toast({
        title: "Sucesso!",
        description: "Conta marcada como paga com sucesso",
      });

    } catch (error) {
      console.error("Erro inesperado:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao marcar como paga",
        variant: "destructive",
      });
    }
  };

  // Edição
  const abrirEdicao = (conta: ContaView) => {
    setContaParaEditar(conta);
    setEditForm({
      descricao: conta.descricao || "",
      vencimento: conta.vencimento || "",
      valorTotal: String(conta.valor_total ?? ""),
    });
    setIsEditDialogOpen(true);
  };

  const handleAtualizarConta = async () => {
    if (!contaParaEditar) return;

    if (!editForm.descricao.trim() || !editForm.vencimento.trim() || !editForm.valorTotal.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const valor = parseFloat(editForm.valorTotal.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor maior que zero",
        variant: "destructive",
      });
      return;
    }

    try {
      setSalvandoEdicao(true);
      const { error } = await supabase
        .from('contas')
        .update({
          descricao: editForm.descricao.trim(),
          vencimento: editForm.vencimento,
          valor_total: valor,
        })
        .eq('id', contaParaEditar.id as string);

      if (error) {
        console.error("Erro ao atualizar:", error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar conta",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Sucesso!", description: "Conta atualizada com sucesso" });
      setIsEditDialogOpen(false);
      setContaParaEditar(null);
      await loadContas();
    } catch (e) {
      console.error("Erro inesperado:", e);
      toast({ title: "Erro", description: "Erro inesperado ao atualizar", variant: "destructive" });
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pago":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pago</Badge>;
      case "Parcial":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Parcial</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const filteredContas = contas.filter(conta => {
    const matchSearch = (conta.descricao || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || (conta.status || '').toLowerCase() === statusFilter;
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
        <div className="flex items-center justify-center p-8">
          <p className="text-gray-600">Carregando contas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Contas a Pagar</h2>
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
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Vencimento</Label>
                  <p className="text-sm text-muted-foreground">Cadastre o mesmo valor em até 5 datas</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Múltiplas datas</span>
                  <Switch checked={multiDatesEnabled} onCheckedChange={setMultiDatesEnabled} />
                </div>
              </div>

              {!multiDatesEnabled ? (
                <div>
                  <Label htmlFor="vencimento">Data de Vencimento *</Label>
                  <Input 
                    id="vencimento" 
                    type="date" 
                    value={formData.vencimento}
                    onChange={(e) => setFormData(prev => ({...prev, vencimento: e.target.value}))}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>Datas de Vencimento *</Label>
                  {vencimentosMultiplos.map((d, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        type="date"
                        value={d}
                        onChange={(e) => {
                          const next = [...vencimentosMultiplos];
                          next[idx] = e.target.value;
                          setVencimentosMultiplos(next);
                        }}
                        className="flex-1"
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{vencimentosMultiplos.length}/5</span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setVencimentosMultiplos((prev) => (prev.length < 5 ? [...prev, ""] : prev))}
                      disabled={vencimentosMultiplos.length >= 5}
                    >
                      Adicionar data
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={!isFormValid || isSaving}
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setFormData({ descricao: "", valorTotal: "", vencimento: "" });
                    setMultiDatesEnabled(false);
                    setVencimentosMultiplos([""]);
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
                <p className="text-sm text-gray-600">Valor Total: R$ {(contaParaPagamento.valor_total || 0).toFixed(2)}</p>
                <p className="text-sm text-gray-600">Já Pago: R$ {(contaParaPagamento.total_pago || 0).toFixed(2)}</p>
                <p className="text-sm font-medium text-red-600">
                  Saldo: R$ {(contaParaPagamento.saldo || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <Label htmlFor="valorPagamento">Valor do Pagamento *</Label>
                <Input 
                  id="valorPagamento" 
                  type="number" 
                  step="0.01"
                  placeholder="0,00"
                  max={contaParaPagamento.saldo || 0}
                  value={pagamentoData.valor}
                  onChange={(e) => setPagamentoData({valor: e.target.value})}
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
                    setPagamentoData({ valor: "" });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
          </DialogHeader>
          {contaParaEditar && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editDescricao">Descrição *</Label>
                <Textarea 
                  id="editDescricao" 
                  value={editForm.descricao}
                  onChange={(e) => setEditForm(prev => ({...prev, descricao: e.target.value}))}
                  className="min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="editValor">Valor Total *</Label>
                <Input 
                  id="editValor" 
                  type="number" 
                  step="0.01"
                  value={editForm.valorTotal}
                  onChange={(e) => setEditForm(prev => ({...prev, valorTotal: e.target.value}))}
                />
              </div>
              <div>
                <Label htmlFor="editVenc">Data de Vencimento *</Label>
                <Input 
                  id="editVenc" 
                  type="date" 
                  value={editForm.vencimento}
                  onChange={(e) => setEditForm(prev => ({...prev, vencimento: e.target.value}))}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleAtualizarConta}
                  disabled={salvandoEdicao}
                >
                  {salvandoEdicao ? "Salvando..." : "Salvar"}
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
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
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
              {filteredContas.map((conta) => (
                <div key={conta.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{conta.descricao}</h3>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
