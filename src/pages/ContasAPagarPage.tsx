import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, DollarSign, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';

export default function ContasAPagarPage() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useAppStore();

  const [somenteAbertas, setSomenteAbertas] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  const [novaConta, setNovaConta] = useState({
    descricao: '',
    valor_original: '',
    data_vencimento: '',
  });
  const [dialogNova, setDialogNova] = useState(false);

  const [pagamentoDialog, setPagamentoDialog] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<any>(null);
  const [valorPagamento, setValorPagamento] = useState('');

  const [editDialog, setEditDialog] = useState(false);
  const [contaEdit, setContaEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    descricao: '',
    valor_original: '',
    data_vencimento: '',
  });

  const [historicoDialog, setHistoricoDialog] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  // Buscar contas
  const { data: contas = [], isLoading } = useQuery({
    queryKey: ['contas', selectedCompanyId, somenteAbertas, statusFilter, searchTerm, periodoInicio, periodoFim],
    queryFn: async () => {
      let query = supabase
        .from('contas_view')
        .select('*')
        .eq('empresa', selectedCompanyId)
        .order('vencimento', { ascending: true });

      if (searchTerm.trim()) {
        query = query.ilike('descricao', `%${searchTerm}%`);
      }

      if (periodoInicio) {
        query = query.gte('vencimento', periodoInicio);
      }

      if (periodoFim) {
        query = query.lte('vencimento', periodoFim);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let result = data || [];
      
      // Filtrar por status manualmente
      if (somenteAbertas) {
        result = result.filter(c => c.status !== 'Pago');
      }
      
      if (statusFilter !== 'all') {
        if (statusFilter === 'pendente') {
          result = result.filter(c => c.status === 'Pendente');
        } else if (statusFilter === 'vencida') {
          result = result.filter(c => {
            const venc = new Date(c.vencimento + 'T00:00:00');
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            return c.status !== 'Pago' && venc < hoje;
          });
        } else if (statusFilter === 'paga') {
          result = result.filter(c => c.status === 'Pago');
        }
      }
      
      return result;
    },
    enabled: !!selectedCompanyId,
  });

  // Buscar fornecedores
  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores', selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('empresa', selectedCompanyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  // Mutation: criar conta
  const criarContaMutation = useMutation({
    mutationFn: async (dados: any) => {
      const { error } = await supabase.from('contas').insert({
        descricao: dados.descricao,
        valor_total: Number(dados.valor_original),
        vencimento: dados.data_vencimento,
        empresa: selectedCompanyId,
        total_pago: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conta criada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['contas', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo', selectedCompanyId] });
      setDialogNova(false);
      setNovaConta({ descricao: '', valor_original: '', data_vencimento: '' });
    },
    onError: () => {
      toast.error('Erro ao criar conta');
    },
  });

  // Mutation: registrar pagamento
  const pagarContaMutation = useMutation({
    mutationFn: async ({ contaId, valor }: { contaId: string; valor: number }) => {
      const { error } = await supabase.from('pagamentos').insert({
        conta_id: contaId,
        valor,
        data: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pagamento registrado');
      queryClient.invalidateQueries({ queryKey: ['contas', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo', selectedCompanyId] });
      setPagamentoDialog(false);
      setValorPagamento('');
      setContaSelecionada(null);
    },
    onError: () => {
      toast.error('Erro ao registrar pagamento');
    },
  });

  // Mutation: editar conta
  const editarContaMutation = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: any }) => {
      const { error } = await supabase
        .from('contas')
        .update({
          descricao: dados.descricao,
          valor_total: Number(dados.valor_original),
          vencimento: dados.data_vencimento,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conta atualizada');
      queryClient.invalidateQueries({ queryKey: ['contas', selectedCompanyId] });
      setEditDialog(false);
      setContaEdit(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar conta');
    },
  });

  // Mutation: excluir conta (hard delete - sem soft delete disponível)
  const excluirContaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conta excluída');
      queryClient.invalidateQueries({ queryKey: ['contas', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['total-hoje', selectedCompanyId] });
    },
    onError: () => {
      toast.error('Erro ao excluir conta');
    },
  });

  const handleCriarConta = () => {
    if (!novaConta.descricao || !novaConta.valor_original || !novaConta.data_vencimento) {
      toast.error('Preencha todos os campos');
      return;
    }
    criarContaMutation.mutate(novaConta);
  };

  const handlePagar = (conta: any) => {
    setContaSelecionada(conta);
    setValorPagamento(String(conta.saldo || 0));
    setPagamentoDialog(true);
  };

  const handleConfirmarPagamento = () => {
    if (!contaSelecionada || !valorPagamento) {
      toast.error('Valor inválido');
      return;
    }
    const valor = Number(valorPagamento);
    if (isNaN(valor) || valor <= 0) {
      toast.error('Valor inválido');
      return;
    }
    pagarContaMutation.mutate({ contaId: contaSelecionada.id, valor });
  };

  const handleEditar = (conta: any) => {
    setContaEdit(conta);
    setEditForm({
      descricao: conta.descricao || '',
      valor_original: String(conta.valor_total || ''),
      data_vencimento: conta.vencimento || '',
    });
    setEditDialog(true);
  };

  const handleSalvarEdicao = () => {
    if (!contaEdit || !editForm.descricao || !editForm.valor_original || !editForm.data_vencimento) {
      toast.error('Preencha todos os campos');
      return;
    }
    editarContaMutation.mutate({ id: contaEdit.id, dados: editForm });
  };

  const handleExcluir = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      excluirContaMutation.mutate(id);
    }
  };

  const handleVerHistorico = async (conta: any) => {
    const { data, error } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('conta_id', conta.id)
      .order('data', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar histórico');
      return;
    }

    setHistorico(data || []);
    setContaSelecionada(conta);
    setHistoricoDialog(true);
  };

  const totalAberto = contas.reduce((sum, c) => sum + (Number(c.saldo) || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-foreground">Contas a Pagar</h2>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Contas a Pagar</h2>
        <Dialog open={dialogNova} onOpenChange={setDialogNova}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Descrição</Label>
                <Input
                  value={novaConta.descricao}
                  onChange={(e) => setNovaConta({ ...novaConta, descricao: e.target.value })}
                />
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={novaConta.valor_original}
                  onChange={(e) =>
                    setNovaConta({ ...novaConta, valor_original: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={novaConta.data_vencimento}
                  onChange={(e) =>
                    setNovaConta({ ...novaConta, data_vencimento: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCriarConta}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Buscar</Label>
              <Input
                placeholder="Descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Período Início</Label>
              <Input
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
              />
            </div>
            <div>
              <Label>Período Fim</Label>
              <Input
                type="date"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center mt-4 space-x-2">
            <Switch checked={somenteAbertas} onCheckedChange={setSomenteAbertas} />
            <Label>Somente abertas</Label>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Contas ({contas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Vencimento</th>
                  <th className="text-left p-2">Fornecedor</th>
                  <th className="text-left p-2">Descrição</th>
                  <th className="text-right p-2">Valor Original</th>
                  <th className="text-right p-2">Valor Pago</th>
                  <th className="text-right p-2">Valor em Aberto</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-center p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((conta) => (
                  <tr key={conta.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{formatDate(conta.vencimento)}</td>
                    <td className="p-2">-</td>
                    <td className="p-2">{conta.descricao}</td>
                    <td className="p-2 text-right">{formatCurrency(Number(conta.valor_total) || 0)}</td>
                    <td className="p-2 text-right">
                      {formatCurrency(Number(conta.total_pago) || 0)}
                    </td>
                    <td className="p-2 text-right font-bold">
                      {formatCurrency(Number(conta.saldo) || 0)}
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          conta.status === 'Pago'
                            ? 'bg-green-100 text-green-800'
                            : conta.status === 'Parcial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {conta.status}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {conta.status !== 'Pago' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePagar(conta)}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleEditar(conta)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVerHistorico(conta)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExcluir(conta.id as string)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-right">
            <p className="text-lg font-bold">
              Total em Aberto: {formatCurrency(totalAberto)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Pagamento */}
      <Dialog open={pagamentoDialog} onOpenChange={setPagamentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Conta: <strong>{contaSelecionada?.descricao}</strong>
            </p>
            <p>
              Valor em Aberto:{' '}
              <strong>{formatCurrency(Number(contaSelecionada?.saldo) || 0)}</strong>
            </p>
            <div>
              <Label>Valor do Pagamento</Label>
              <Input
                type="number"
                step="0.01"
                value={valorPagamento}
                onChange={(e) => setValorPagamento(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleConfirmarPagamento}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Input
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
              />
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={editForm.valor_original}
                onChange={(e) =>
                  setEditForm({ ...editForm, valor_original: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={editForm.data_vencimento}
                onChange={(e) =>
                  setEditForm({ ...editForm, data_vencimento: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSalvarEdicao}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Histórico */}
      <Dialog open={historicoDialog} onOpenChange={setHistoricoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Histórico de Pagamentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p>
              Conta: <strong>{contaSelecionada?.descricao}</strong>
            </p>
            {historico.length === 0 ? (
              <p className="text-muted-foreground">Nenhum pagamento registrado.</p>
            ) : (
              <div className="space-y-2">
                {historico.map((pag) => (
                  <div key={pag.id} className="border p-2 rounded">
                    <p>
                      <strong>Data:</strong> {formatDate(pag.data)}
                    </p>
                    <p>
                      <strong>Valor:</strong> {formatCurrency(pag.valor)}
                    </p>
                    {pag.forma && (
                      <p>
                        <strong>Forma:</strong> {pag.forma}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
