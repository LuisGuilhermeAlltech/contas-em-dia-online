import { useEffect, useState } from 'react';
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
import { Plus, Pencil, Trash2, DollarSign, Eye, Paperclip, FileCheck, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAppStore } from '@/store/appStore';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getTodayLocalISODate } from '@/lib/date';
import { isContaEmAberto, normalizeContaStatus } from '@/lib/finance';
import { toast } from 'sonner';
import MultiVencimentosForm, { Vencimento } from '@/components/contas/MultiVencimentosForm';
import { ComprovanteUpload } from '@/components/contas/ComprovanteUpload';
import { ComprovanteViewer } from '@/components/contas/ComprovanteViewer';
import { useComprovantes } from '@/hooks/useComprovantes';
import { useSelectedCompanyScope } from '@/hooks/useEmpresas';

type ContaView = Tables<'contas_view'>;
type Pagamento = Tables<'pagamentos'>;
type Fornecedor = Tables<'fornecedores'>;

const FORNECEDOR_NONE = '__sem_fornecedor__';
const fornecedorSelectColumns = 'id, nome, empresa, observacao, created_at';

const normalizeFornecedorNome = (nome: string) =>
  nome.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

const loadFornecedoresPorEmpresa = async (empresaSlug: string): Promise<Fornecedor[]> => {
  if (!empresaSlug) return [];

  const { data, error } = await supabase
    .from('fornecedores')
    .select(fornecedorSelectColumns)
    .eq('empresa', empresaSlug)
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data || []) as Fornecedor[];
};

interface FornecedorPickerProps {
  empresaSlug: string;
  value: string;
  onValueChange: (fornecedorId: string) => void;
}

function FornecedorPicker({ empresaSlug, value, onValueChange }: FornecedorPickerProps) {
  const queryClient = useQueryClient();
  const [adicionando, setAdicionando] = useState(false);
  const [novoFornecedorNome, setNovoFornecedorNome] = useState('');

  const { data: fornecedores = [], isLoading } = useQuery<Fornecedor[]>({
    queryKey: ['fornecedores', empresaSlug],
    queryFn: () => loadFornecedoresPorEmpresa(empresaSlug),
    enabled: Boolean(empresaSlug),
    staleTime: 1000 * 60 * 10,
  });

  const adicionarFornecedorMutation = useMutation({
    mutationFn: async ({ nome, empresa }: { nome: string; empresa: string }) => {
      const nomeLimpo = nome.trim().replace(/\s+/g, ' ');
      if (!nomeLimpo || !empresa) {
        throw new Error('Dados invalidos');
      }

      const existentes = await loadFornecedoresPorEmpresa(empresa);
      const fornecedorExistente = existentes.find(
        (fornecedor) => normalizeFornecedorNome(fornecedor.nome) === normalizeFornecedorNome(nomeLimpo)
      );

      if (fornecedorExistente) {
        return fornecedorExistente;
      }

      const { data, error } = await supabase
        .from('fornecedores')
        .insert({ nome: nomeLimpo, empresa })
        .select(fornecedorSelectColumns)
        .single();

      if (error) throw error;
      return data as Fornecedor;
    },
    onSuccess: (fornecedor) => {
      queryClient.setQueryData<Fornecedor[]>(
        ['fornecedores', fornecedor.empresa],
        (current = []) => {
          if (current.some((item) => item.id === fornecedor.id)) return current;
          return [...current, fornecedor].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        }
      );
      onValueChange(fornecedor.id);
      setNovoFornecedorNome('');
      setAdicionando(false);
      toast.success('Fornecedor salvo');
    },
    onError: () => {
      toast.error('Erro ao salvar fornecedor');
    },
  });

  const handleAdicionarFornecedor = () => {
    adicionarFornecedorMutation.mutate({ nome: novoFornecedorNome, empresa: empresaSlug });
  };

  const fornecedorValue = value || FORNECEDOR_NONE;
  const salvarFornecedorDisabled =
    !empresaSlug || !novoFornecedorNome.trim() || adicionarFornecedorMutation.isPending;

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Label>Fornecedor</Label>
          <Select
            value={fornecedorValue}
            onValueChange={(selected) =>
              onValueChange(selected === FORNECEDOR_NONE ? '' : selected)
            }
            disabled={!empresaSlug || isLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FORNECEDOR_NONE}>Sem fornecedor</SelectItem>
              {fornecedores.map((fornecedor) => (
                <SelectItem key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setAdicionando((current) => !current)}
          disabled={!empresaSlug}
          aria-label="Adicionar fornecedor"
          title="Adicionar fornecedor"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {adicionando && (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            value={novoFornecedorNome}
            onChange={(event) => setNovoFornecedorNome(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (!salvarFornecedorDisabled) handleAdicionarFornecedor();
              }
            }}
            placeholder="Nome do fornecedor"
            disabled={adicionarFornecedorMutation.isPending}
          />
          <Button
            type="button"
            onClick={handleAdicionarFornecedor}
            disabled={salvarFornecedorDisabled}
          >
            {adicionarFornecedorMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      )}
    </div>
  );
}

interface ContaFormData {
  descricao: string;
  valor_original: string;
  data_vencimento: string;
  codigo_barras: string;
  fornecedor_id: string;
}

interface CriarContaPayload extends ContaFormData {
  empresaSlug: string;
  empresaId: string;
  vencimentos?: Vencimento[];
}

export default function ContasAPagarPage() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useAppStore();
  const {
    selectedOption,
    selectedCompanySlugs,
    stores,
    slugToName,
    isGroupSelection,
  } = useSelectedCompanyScope(selectedCompanyId);

  const [somenteAbertas, setSomenteAbertas] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [lojaFilter, setLojaFilter] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [novaContaLojaSlug, setNovaContaLojaSlug] = useState('');

  const [novaConta, setNovaConta] = useState<ContaFormData>({
    descricao: '',
    valor_original: '',
    data_vencimento: '',
    codigo_barras: '',
    fornecedor_id: '',
  });
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);
  const [dialogNova, setDialogNova] = useState(false);

  const [pagamentoDialog, setPagamentoDialog] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaView | null>(null);
  const [valorPagamento, setValorPagamento] = useState('');
  const [arquivoComprovante, setArquivoComprovante] = useState<File | null>(null);
  
  // Viewer de comprovante
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPagamentoId, setViewerPagamentoId] = useState<string | null>(null);
  
  // Anexar comprovante depois
  const [anexarDialog, setAnexarDialog] = useState(false);
  const [pagamentoParaAnexar, setPagamentoParaAnexar] = useState<Pagamento | null>(null);
  const [arquivoAnexar, setArquivoAnexar] = useState<File | null>(null);
  
  const { uploadComprovante, uploading } = useComprovantes();

  const [editDialog, setEditDialog] = useState(false);
  const [contaEdit, setContaEdit] = useState<ContaView | null>(null);
  const [editForm, setEditForm] = useState<ContaFormData>({
    descricao: '',
    valor_original: '',
    data_vencimento: '',
    codigo_barras: '',
    fornecedor_id: '',
  });

  const [historicoDialog, setHistoricoDialog] = useState(false);
  const [historico, setHistorico] = useState<Pagamento[]>([]);

  const novaContaEmpresaSlug = isGroupSelection
    ? novaContaLojaSlug
    : selectedCompanySlugs[0] || selectedCompanyId;
  const editContaEmpresaSlug = contaEdit?.empresa || '';

  const handleNovaContaLojaChange = (slug: string) => {
    setNovaContaLojaSlug(slug);
    setNovaConta((current) => ({ ...current, fornecedor_id: '' }));
  };

  useEffect(() => {
    const firstStoreSlug = stores[0]?.slug || '';

    setNovaContaLojaSlug((current) =>
      stores.some((store) => store.slug === current) ? current : firstStoreSlug
    );

    if (!isGroupSelection) {
      setLojaFilter('todas');
      return;
    }

    setLojaFilter((current) => {
      if (current === 'todas') return current;
      return stores.some((store) => store.slug === current) ? current : 'todas';
    });
  }, [stores, isGroupSelection]);

  useEffect(() => {
    setNovaConta((current) =>
      current.fornecedor_id ? { ...current, fornecedor_id: '' } : current
    );
  }, [novaContaEmpresaSlug]);

  const invalidateFinancialQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['contas', selectedCompanyId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-empresa'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-geral'] });
    queryClient.invalidateQueries({ queryKey: ['contas-vencidas-hoje-v2'] });
    queryClient.invalidateQueries({ queryKey: ['relatorio-fluxo'] });
    queryClient.invalidateQueries({ queryKey: ['relatorio-categoria'] });
    queryClient.invalidateQueries({ queryKey: ['relatorio-forma-pagamento'] });
    queryClient.invalidateQueries({ queryKey: ['relatorio-fornecedor'] });
  };

  // Buscar contas
  const { data: contas = [], isLoading } = useQuery<ContaView[]>({
    queryKey: [
      'contas',
      selectedCompanyId,
      somenteAbertas,
      statusFilter,
      lojaFilter,
      searchTerm,
      periodoInicio,
      periodoFim,
    ],
    queryFn: async () => {
      if (!selectedCompanySlugs.length) return [];

      let query = supabase
        .from('contas_view')
        .select('*')
        .order('vencimento', { ascending: true });

      if (selectedCompanySlugs.length === 1) {
        query = query.eq('empresa', selectedCompanySlugs[0]);
      } else {
        query = query.in('empresa', selectedCompanySlugs);
      }

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
      const hoje = getTodayLocalISODate();
      
      // Filtrar por status manualmente
      if (somenteAbertas) {
        result = result.filter((conta) => isContaEmAberto(conta.status));
      }
      
      if (statusFilter !== 'all') {
        if (statusFilter === 'pendente') {
          result = result.filter((conta) => isContaEmAberto(conta.status));
        } else if (statusFilter === 'vencida') {
          result = result.filter((conta) => {
            const vencimento = conta.vencimento || '';
            return isContaEmAberto(conta.status) && vencimento < hoje;
          });
        } else if (statusFilter === 'paga') {
          result = result.filter((conta) => normalizeContaStatus(conta.status) === 'paga');
        }
      }

      if (isGroupSelection && lojaFilter !== 'todas') {
        result = result.filter((conta) => conta.empresa === lojaFilter);
      }
      
      return result;
    },
    enabled: selectedCompanySlugs.length > 0,
  });

  // Mutation: criar conta
  const criarContaMutation = useMutation({
    mutationFn: async (dados: CriarContaPayload) => {
      // Se há múltiplos vencimentos
      if (dados.vencimentos && dados.vencimentos.length > 1) {
        const grupoId = crypto.randomUUID();
        const contasParaInserir = dados.vencimentos.map((venc: Vencimento) => ({
          descricao: dados.descricao,
          valor_total: Number(dados.valor_original),
          vencimento: venc.data,
          empresa: dados.empresaSlug,
          empresa_id: dados.empresaId,
          total_pago: 0,
          parcela_numero: venc.parcela,
          total_parcelas: dados.vencimentos.length,
          grupo_parcela_id: grupoId,
          codigo_barras: dados.codigo_barras || null,
          fornecedor_id: dados.fornecedor_id || null,
        }));

        const { error } = await supabase.from('contas').insert(contasParaInserir);
        if (error) throw error;
      } else {
        // Vencimento único
        const { error } = await supabase.from('contas').insert({
          descricao: dados.descricao,
          valor_total: Number(dados.valor_original),
          vencimento: dados.data_vencimento,
          empresa: dados.empresaSlug,
          empresa_id: dados.empresaId,
          total_pago: 0,
          parcela_numero: 1,
          total_parcelas: 1,
          grupo_parcela_id: null,
          codigo_barras: dados.codigo_barras || null,
          fornecedor_id: dados.fornecedor_id || null,
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
      invalidateFinancialQueries();
      setDialogNova(false);
      setNovaConta({
        descricao: '',
        valor_original: '',
        data_vencimento: '',
        codigo_barras: '',
        fornecedor_id: '',
      });
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
          data: getTodayLocalISODate(),
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
      invalidateFinancialQueries();
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
    mutationFn: async ({ id, dados }: { id: string; dados: ContaFormData }) => {
      const { error } = await supabase
        .from('contas')
        .update({
          descricao: dados.descricao,
          valor_total: Number(dados.valor_original),
          vencimento: dados.data_vencimento,
          codigo_barras: dados.codigo_barras || null,
          fornecedor_id: dados.fornecedor_id || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conta atualizada');
      invalidateFinancialQueries();
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
      invalidateFinancialQueries();
    },
    onError: () => {
      toast.error('Erro ao excluir conta');
    },
  });

  // Mutation: excluir pagamento
  const excluirPagamentoMutation = useMutation({
    mutationFn: async (pagamentoId: string) => {
      // Primeiro exclui comprovantes associados
      await supabase
        .from('comprovantes_pagamento')
        .delete()
        .eq('pagamento_id', pagamentoId);
      
      // Depois exclui o pagamento
      const { error } = await supabase
        .from('pagamentos')
        .delete()
        .eq('id', pagamentoId);
      if (error) throw error;
    },
    onSuccess: (_data, pagamentoId) => {
      toast.success('Pagamento excluído');
      // Atualiza o histórico local
      setHistorico((prev) => prev.filter((pagamento) => pagamento.id !== pagamentoId));
      invalidateFinancialQueries();
    },
    onError: () => {
      toast.error('Erro ao excluir pagamento');
    },
  });

  // Mutation: reabrir conta removendo todos os pagamentos vinculados
  const reabrirContaMutation = useMutation({
    mutationFn: async (contaId: string) => {
      const { data: pagamentos, error: pagamentosError } = await supabase
        .from('pagamentos')
        .select('id')
        .eq('conta_id', contaId);

      if (pagamentosError) throw pagamentosError;

      const pagamentoIds = (pagamentos || []).map((pagamento) => pagamento.id);

      if (pagamentoIds.length > 0) {
        const { data: comprovantes, error: comprovantesError } = await supabase
          .from('comprovantes_pagamento')
          .select('arquivo_url')
          .in('pagamento_id', pagamentoIds);

        if (comprovantesError) throw comprovantesError;

        const arquivos = (comprovantes || [])
          .map((comprovante) => comprovante.arquivo_url)
          .filter(Boolean);

        if (arquivos.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('comprovantes-boletos')
            .remove(arquivos);

          if (storageError) {
            console.warn('Falha ao remover arquivos de comprovante:', storageError);
          }
        }

        const { error } = await supabase
          .from('pagamentos')
          .delete()
          .eq('conta_id', contaId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Conta voltou para não paga');
      setHistorico([]);
      setHistoricoDialog(false);
      invalidateFinancialQueries();
    },
    onError: () => {
      toast.error('Erro ao voltar conta para não paga');
    },
  });

  const handleExcluirPagamento = (pagamentoId: string) => {
    if (confirm('Tem certeza que deseja excluir este pagamento? O saldo da conta será recalculado.')) {
      excluirPagamentoMutation.mutate(pagamentoId);
    }
  };

  const handleCriarConta = () => {
    // Validação básica
    if (!novaConta.descricao || !novaConta.valor_original) {
      toast.error('Preencha descrição e valor');
      return;
    }

    const empresaSlug = isGroupSelection
      ? novaContaLojaSlug
      : selectedCompanySlugs[0] || selectedCompanyId;

    const empresaSelecionada = selectedOption?.stores.find(
      (store) => store.slug === empresaSlug
    );

    if (!empresaSelecionada?.id || !empresaSelecionada.slug) {
      toast.error('Selecione uma loja válida para criar a conta');
      return;
    }

    const payloadBase: CriarContaPayload = {
      ...novaConta,
      empresaSlug: empresaSelecionada.slug,
      empresaId: empresaSelecionada.id,
    };

    // Se há múltiplos vencimentos, validá-los
    if (vencimentos.length > 1) {
      const vencimentosInvalidos = vencimentos.some(v => !v.data);
      if (vencimentosInvalidos) {
        toast.error('Todas as datas de vencimento devem ser preenchidas');
        return;
      }
      criarContaMutation.mutate({ ...payloadBase, vencimentos });
    } else {
      // Vencimento único
      if (!novaConta.data_vencimento) {
        toast.error('Preencha a data de vencimento');
        return;
      }
      criarContaMutation.mutate(payloadBase);
    }
  };

  const handlePagar = (conta: ContaView) => {
    setContaSelecionada(conta);
    setValorPagamento(String(Number(conta.saldo) || 0));
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
    if (!contaSelecionada.id) {
      toast.error('Conta inválida');
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

  const handleAbrirAnexar = (pagamento: Pagamento) => {
    setPagamentoParaAnexar(pagamento);
    setArquivoAnexar(null);
    setAnexarDialog(true);
  };

  const handleEditar = async (conta: ContaView) => {
    setContaEdit(conta);
    const { data } = await supabase
      .from('contas')
      .select('codigo_barras, fornecedor_id')
      .eq('id', conta.id as string)
      .single();

    setEditForm({
      descricao: conta.descricao || '',
      valor_original: String(conta.valor_total || ''),
      data_vencimento: conta.vencimento || '',
      codigo_barras: data?.codigo_barras || '',
      fornecedor_id: data?.fornecedor_id || '',
    });
    setEditDialog(true);
  };

  const handleSalvarEdicao = () => {
    if (!contaEdit || !editForm.descricao || !editForm.valor_original || !editForm.data_vencimento) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (!contaEdit.id) {
      toast.error('Conta inválida');
      return;
    }
    editarContaMutation.mutate({ id: contaEdit.id, dados: editForm });
  };

  const handleExcluir = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      excluirContaMutation.mutate(id);
    }
  };

  const handleReabrirConta = (conta: ContaView) => {
    if (!conta.id) {
      toast.error('Conta inválida');
      return;
    }

    if (
      confirm(
        'Voltar esta conta para não paga? Todos os pagamentos e comprovantes vinculados serão removidos, e o saldo voltará ao valor original.'
      )
    ) {
      reabrirContaMutation.mutate(conta.id);
    }
  };

  const handleVerHistorico = async (conta: ContaView) => {
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

  const totalAberto = contas.reduce((sum, c) => {
    return isContaEmAberto(c.status) ? sum + (Number(c.saldo) || 0) : sum;
  }, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-foreground">Contas a Pagar</h2>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

              {isGroupSelection && (
                <div>
                  <Label>Loja</Label>
                  <Select value={novaContaLojaSlug} onValueChange={handleNovaContaLojaChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.slug}>
                          {store.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <FornecedorPicker
                empresaSlug={novaContaEmpresaSlug}
                value={novaConta.fornecedor_id}
                onValueChange={(fornecedorId) =>
                  setNovaConta({ ...novaConta, fornecedor_id: fornecedorId })
                }
              />

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

              {/* Código de barras */}
              <div>
                <Label>Código de Barras</Label>
                <Input
                  value={novaConta.codigo_barras}
                  onChange={(e) => setNovaConta({ ...novaConta, codigo_barras: e.target.value })}
                  placeholder="Cole o código de barras aqui"
                />
              </div>

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
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={
              isGroupSelection
                ? 'grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 [&>*]:min-w-0'
                : 'grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0'
            }
          >
            <div>
              <Label>Buscar</Label>
              <Input
                placeholder="Descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isGroupSelection && (
              <div>
                <Label>Loja</Label>
                <Select value={lojaFilter} onValueChange={setLojaFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.slug}>
                        {store.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Contas ({contas.length})</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="w-full overflow-x-auto">
            <table className={isGroupSelection ? 'w-full min-w-[1080px]' : 'w-full min-w-[960px]'}>
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Vencimento</th>
                  {isGroupSelection && <th className="text-left p-2">Loja</th>}
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
                {contas.map((conta) => {
                  const statusNormalizado = normalizeContaStatus(conta.status);
                  const temPagamento = Number(conta.total_pago) > 0;
                  const statusLabel =
                    statusNormalizado === 'paga'
                      ? 'Pago'
                      : statusNormalizado === 'parcial'
                      ? 'Parcial'
                      : 'Pendente';

                  return (
                    <tr key={conta.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{formatDate(conta.vencimento)}</td>
                      {isGroupSelection && (
                        <td className="p-2">
                          {slugToName.get(conta.empresa || '') || conta.empresa || '-'}
                        </td>
                      )}
                      <td className="p-2">{conta.fornecedor_nome || '-'}</td>
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
                            statusNormalizado === 'paga'
                              ? 'bg-green-100 text-green-800'
                              : statusNormalizado === 'parcial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isContaEmAberto(conta.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePagar(conta)}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => void handleEditar(conta)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVerHistorico(conta)}
                            title="Ver histórico"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {temPagamento && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReabrirConta(conta)}
                              title="Voltar para não paga"
                              disabled={reabrirContaMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 text-amber-600" />
                            </Button>
                          )}
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
                  );
                })}
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
            <FornecedorPicker
              empresaSlug={editContaEmpresaSlug}
              value={editForm.fornecedor_id}
              onValueChange={(fornecedorId) =>
                setEditForm({ ...editForm, fornecedor_id: fornecedorId })
              }
            />
            <div>
              <Label>Código de Barras</Label>
              <Input
                value={editForm.codigo_barras}
                onChange={(e) => setEditForm({ ...editForm, codigo_barras: e.target.value })}
                placeholder="Cole o código de barras aqui"
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExcluirPagamento(pag.id)}
                          title="Excluir pagamento"
                          disabled={excluirPagamentoMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
