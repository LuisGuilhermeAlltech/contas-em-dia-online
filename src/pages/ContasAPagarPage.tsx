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
import { Plus, Pencil, Trash2, DollarSign, Eye, Paperclip, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import MultiVencimentosForm, { Vencimento } from '@/components/contas/MultiVencimentosForm';
import { ComprovanteUpload } from '@/components/contas/ComprovanteUpload';
import { ComprovanteViewer } from '@/components/contas/ComprovanteViewer';
import { useComprovantes } from '@/hooks/useComprovantes';

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
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);
  const [dialogNova, setDialogNova] = useState(false);

  const [pagamentoDialog, setPagamentoDialog] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<any>(null);
  const [valorPagamento, setValorPagamento] = useState('');
  const [arquivoComprovante, setArquivoComprovante] = useState<File | null>(null);
  
  // Viewer de comprovante
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPagamentoId, setViewerPagamentoId] = useState<string | null>(null);
  
  // Anexar comprovante depois
  const [anexarDialog, setAnexarDialog] = useState(false);
  const [pagamentoParaAnexar, setPagamentoParaAnexar] = useState<any>(null);
  const [arquivoAnexar, setArquivoAnexar] = useState<File | null>(null);
  
  const { uploadComprovante, uploading, getComprovanteByPagamento } = useComprovantes();

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
      // Se há múltiplos vencimentos
      if (dados.vencimentos && dados.vencimentos.length > 1) {
        const grupoId = crypto.randomUUID();
        const contasParaInserir = dados.vencimentos.map((venc: Vencimento) => ({
          descricao: dados.descricao,
          valor_total: Number(dados.valor_original),
          vencimento: venc.data,
          empresa: selectedCompanyId,
          total_pago: 0,
          parcela_numero: venc.parcela,
          total_parcelas: dados.vencimentos.length,
          grupo_parcela_id: grupoId,
        }));

        const { error } = await supabase.from('contas').insert(contasParaInserir);
        if (error) throw error;
      } else {
        // Vencimento único
        const { error } = await supabase.from('contas').insert({
          descricao: dados.descricao,
          valor_total: Number(dados.valor_original),
          vencimento: dados.data_vencimento,
          empresa: selectedCompanyId,
          total_pago: 0,
          parcela_numero: 1,
          total_parcelas: 1,
          grupo_parcela_id: null,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      const quantidade = variables.vencimentos?.length || 1;
      if (quantidade > 1) {
        toast.success(`${quantidade} contas criadas com sucesso`);
      } else {
        toast.success('Conta criada com sucesso');
      }
      queryClient.invalidateQueries({ queryKey: ['contas', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo', selectedCompanyId] });
      setDialogNova(false);
      setNovaConta({ descricao: '', valor_original: '', data_vencimento: '' });
      setVencimentos([]);
    },
    onError: () => {
      toast.error('Erro ao criar conta');
    },
  });

  // Mutation: registrar pagamento
  const pagarContaMutation = useMutation({
    mutationFn: async ({ contaId, valor, arquivo }: { contaId: string; valor: number; arquivo?: File | null }) => {
      const { data: pagamento, error } = await supabase
        .from('pagamentos')
        .insert({
          conta_id: contaId,
          valor,
          data: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      // Se há arquivo, fazer upload do comprovante
      if (arquivo && pagamento?.id) {
        const uploadResult = await uploadComprovante(pagamento.id, arquivo);
        if (!uploadResult.success) {
          console.warn('Falha ao anexar comprovante:', uploadResult.error);
          // Não falha a operação, apenas avisa
          toast.warning('Pagamento registrado, mas falha ao anexar comprovante');
        }
      }
      
      return pagamento;
    },
    onSuccess: () => {
      toast.success('Pagamento registrado');
      queryClient.invalidateQueries({ queryKey: ['contas', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo', selectedCompanyId] });
      setPagamentoDialog(false);
      setValorPagamento('');
      setContaSelecionada(null);
      setArquivoComprovante(null);
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
    // Validação básica
    if (!novaConta.descricao || !novaConta.valor_original) {
      toast.error('Preencha descrição e valor');
      return;
    }

    // Se há múltiplos vencimentos, validá-los
    if (vencimentos.length > 1) {
      const vencimentosInvalidos = vencimentos.some(v => !v.data);
      if (vencimentosInvalidos) {
        toast.error('Todas as datas de vencimento devem ser preenchidas');
        return;
      }
      criarContaMutation.mutate({ ...novaConta, vencimentos });
    } else {
      // Vencimento único
      if (!novaConta.data_vencimento) {
        toast.error('Preencha a data de vencimento');
        return;
      }
      criarContaMutation.mutate(novaConta);
    }
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
    pagarContaMutation.mutate({ contaId: contaSelecionada.id, valor, arquivo: arquivoComprovante });
  };

  const handleAnexarComprovante = async () => {
    if (!pagamentoParaAnexar || !arquivoAnexar) {
      toast.error('Selecione um arquivo');
      return;
    }
    
    const result = await uploadComprovante(pagamentoParaAnexar.id, arquivoAnexar);
    if (result.success) {
      toast.success('Comprovante anexado com sucesso');
      setAnexarDialog(false);
      setPagamentoParaAnexar(null);
      setArquivoAnexar(null);
    } else {
      toast.error(result.error || 'Erro ao anexar comprovante');
    }
  };

  const handleVerComprovante = (pagamentoId: string) => {
    setViewerPagamentoId(pagamentoId);
    setViewerOpen(true);
  };

  const handleAbrirAnexar = (pagamento: any) => {
    setPagamentoParaAnexar(pagamento);
    setArquivoAnexar(null);
    setAnexarDialog(true);
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Descrição</Label>
                <Input
                  value={novaConta.descricao}
                  onChange={(e) => setNovaConta({ ...novaConta, descricao: e.target.value })}
                  placeholder="Ex: Aluguel, Fornecedor X, etc."
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
                  placeholder="0.00"
                />
              </div>

              {/* Campo de vencimento único - só aparece se não há múltiplos vencimentos */}
              {vencimentos.length <= 1 && (
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
              )}

              {/* Seção de múltiplos vencimentos */}
              <div className="pt-4">
                <h3 className="text-sm font-medium mb-3">Repetição / Parcelas (opcional)</h3>
                <MultiVencimentosForm 
                  onVencimentosChange={setVencimentos}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCriarConta}
                disabled={criarContaMutation.isPending}
              >
                {criarContaMutation.isPending ? 'Criando...' : 'Criar'}
              </Button>
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
      <Dialog open={pagamentoDialog} onOpenChange={(open) => {
        setPagamentoDialog(open);
        if (!open) setArquivoComprovante(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Conta: <strong>{contaSelecionada?.descricao}</strong>
            </p>
            <p>
              Vencimento: <strong>{formatDate(contaSelecionada?.vencimento)}</strong>
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
            <ComprovanteUpload
              file={arquivoComprovante}
              onFileChange={setArquivoComprovante}
              disabled={pagarContaMutation.isPending || uploading}
            />
          </div>
          <DialogFooter>
            <Button 
              onClick={handleConfirmarPagamento}
              disabled={pagarContaMutation.isPending || uploading}
            >
              {pagarContaMutation.isPending || uploading ? 'Processando...' : 'Confirmar'}
            </Button>
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
                    <div className="flex justify-between items-start">
                      <div>
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
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVerComprovante(pag.id)}
                          title="Ver comprovante"
                        >
                          <FileCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAbrirAnexar(pag)}
                          title="Anexar comprovante"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Anexar Comprovante */}
      <Dialog open={anexarDialog} onOpenChange={(open) => {
        setAnexarDialog(open);
        if (!open) {
          setArquivoAnexar(null);
          setPagamentoParaAnexar(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexar Comprovante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Anexe o comprovante de pagamento. O arquivo será mantido por 1 ano.
            </p>
            <ComprovanteUpload
              file={arquivoAnexar}
              onFileChange={setArquivoAnexar}
              disabled={uploading}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleAnexarComprovante}
              disabled={!arquivoAnexar || uploading}
            >
              {uploading ? 'Enviando...' : 'Anexar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Viewer de Comprovante */}
      <ComprovanteViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        pagamentoId={viewerPagamentoId}
        contaDescricao={contaSelecionada?.descricao}
      />
    </div>
  );
}
