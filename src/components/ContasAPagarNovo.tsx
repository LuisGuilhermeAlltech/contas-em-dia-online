import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContasAPagarProps {
  selectedEmpresa: string;
}

export const ContasAPagarNovo = ({ selectedEmpresa }: ContasAPagarProps) => {
  const [contas, setContas] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    fornecedor: "",
    dataInicio: "",
    dataFim: "",
    status: "",
    texto: "",
    somenteAbertas: true,
  });
  const [pagamentoModal, setPagamentoModal] = useState<string | null>(null);
  const [pagamentoForm, setPagamentoForm] = useState({
    data: new Date().toISOString().split('T')[0],
    valor: "",
    forma: "Dinheiro",
    observacao: "",
  });
  const [historicoModal, setHistoricoModal] = useState<string | null>(null);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [selectedEmpresa, filtros]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar fornecedores
      const { data: fornData } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('empresa', selectedEmpresa)
        .order('nome');
      
      setFornecedores(fornData || []);

      // Carregar contas da view contas_view
      let query = supabase
        .from('contas_view')
        .select('*')
        .eq('empresa', selectedEmpresa);

      // Aplicar filtros
      if (filtros.dataInicio) {
        query = query.gte('vencimento', filtros.dataInicio);
      }
      if (filtros.dataFim) {
        query = query.lte('vencimento', filtros.dataFim);
      }
      if (filtros.status) {
        query = query.eq('status', filtros.status === 'paga' ? 'Pago' : filtros.status === 'vencida' ? 'Vencida' : 'Pendente');
      }
      if (filtros.somenteAbertas) {
        query = query.in('status', ['Pendente', 'Parcial']);
      }

      const { data, error } = await query.order('vencimento', { ascending: true });

      if (error) throw error;

      // Filtrar por texto livre
      let contasFiltradas = data || [];
      if (filtros.texto) {
        const textoLower = filtros.texto.toLowerCase();
        contasFiltradas = contasFiltradas.filter(
          (c: any) =>
            c.descricao?.toLowerCase().includes(textoLower)
        );
      }

      setContas(contasFiltradas);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePagar = async (contaId: string) => {
    try {
      const valor = parseFloat(pagamentoForm.valor);
      if (isNaN(valor) || valor <= 0) {
        toast({
          title: "Erro",
          description: "Valor inválido",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from('pagamentos').insert({
        conta_id: contaId,
        data: pagamentoForm.data,
        valor: valor,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso",
      });

      setPagamentoModal(null);
      setPagamentoForm({
        data: new Date().toISOString().split('T')[0],
        valor: "",
        forma: "Dinheiro",
        observacao: "",
      });
      loadData();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar o pagamento",
        variant: "destructive",
      });
    }
  };

  const handleExcluir = async (contaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

    try {
      const { error } = await supabase
        .from('contas')
        .delete()
        .eq('id', contaId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta excluída com sucesso",
      });

      loadData();
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta",
        variant: "destructive",
      });
    }
  };

  const loadPagamentos = async (contaId: string) => {
    try {
      const { data, error } = await supabase
        .from('pagamentos')
        .select('*')
        .eq('conta_id', contaId)
        .order('data', { ascending: false });

      if (error) throw error;
      setPagamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pago</Badge>;
      case 'Vencida':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Vencida</Badge>;
      case 'Pendente':
      case 'Parcial':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalAberto = contas.reduce((sum, conta) => sum + (conta.saldo || 0), 0);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              />
            </div>

            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={filtros.status} onValueChange={(v) => setFiltros({ ...filtros, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Descrição"
                  value={filtros.texto}
                  onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="somente-abertas"
                checked={filtros.somenteAbertas}
                onCheckedChange={(v) => setFiltros({ ...filtros, somenteAbertas: v })}
              />
              <Label htmlFor="somente-abertas">Somente abertas</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Contas a Pagar</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Valor Pago</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contas.map((conta) => (
                      <TableRow key={conta.id}>
                        <TableCell>{formatDate(conta.vencimento)}</TableCell>
                        <TableCell>{conta.descricao}</TableCell>
                        <TableCell className="text-right">{formatCurrency(conta.valor_total || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(conta.total_pago || 0)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(conta.saldo || 0)}</TableCell>
                        <TableCell>{getStatusBadge(conta.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {conta.status !== 'Pago' && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setPagamentoModal(conta.id);
                                      setPagamentoForm({
                                        ...pagamentoForm,
                                        valor: (conta.saldo || 0).toString(),
                                      });
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                {pagamentoModal === conta.id && (
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Registrar Pagamento</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Data</Label>
                                        <Input
                                          type="date"
                                          value={pagamentoForm.data}
                                          onChange={(e) => setPagamentoForm({ ...pagamentoForm, data: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <Label>Valor</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={pagamentoForm.valor}
                                          onChange={(e) => setPagamentoForm({ ...pagamentoForm, valor: e.target.value })}
                                        />
                                      </div>
                                      <Button onClick={() => handlePagar(conta.id)} className="w-full">
                                        Confirmar Pagamento
                                      </Button>
                                    </div>
                                  </DialogContent>
                                )}
                              </Dialog>
                            )}

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setHistoricoModal(conta.id);
                                    loadPagamentos(conta.id);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              {historicoModal === conta.id && (
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Histórico de Pagamentos</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-2">
                                    {pagamentos.length === 0 ? (
                                      <p className="text-muted-foreground text-center py-4">
                                        Nenhum pagamento registrado
                                      </p>
                                    ) : (
                                      pagamentos.map((pag) => (
                                        <div key={pag.id} className="border-b pb-2">
                                          <div className="flex justify-between">
                                            <span>{formatDate(pag.data)}</span>
                                            <span className="font-bold">{formatCurrency(pag.valor)}</span>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </DialogContent>
                              )}
                            </Dialog>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExcluir(conta.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total em Aberto:</span>
                  <span className="text-2xl font-bold">{formatCurrency(totalAberto)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
