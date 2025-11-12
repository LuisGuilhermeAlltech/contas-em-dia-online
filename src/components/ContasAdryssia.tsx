import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { Plus, DollarSign, Trash2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

interface ContasAdryssiaProps {
  selectedEmpresa: string;
}

export function ContasAdryssia({ selectedEmpresa }: ContasAdryssiaProps) {
  const queryClient = useQueryClient();
  const RESPONSAVEL_FIXO = "Adryssia Cortez";
  
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroFornecedor, setFiltroFornecedor] = useState("todos");
  const [somenteAbertas, setSomenteAbertas] = useState(true);
  const [modalPagamento, setModalPagamento] = useState<any>(null);
  const [modalPagamentos, setModalPagamentos] = useState<any>(null);

  // Buscar contas com filtro de responsável fixo
  const { data: contas, isLoading } = useQuery({
    queryKey: ["contas-adryssia", selectedEmpresa],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_contas_pagar")
        .select("*, fornecedores(nome)")
        .eq("empresa_id", selectedEmpresa)
        .eq("responsavel", RESPONSAVEL_FIXO)
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar fornecedores
  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores", selectedEmpresa],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("empresa", selectedEmpresa)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar pagamentos de uma conta
  const { data: pagamentosConta } = useQuery({
    queryKey: ["pagamentos-conta-adryssia", modalPagamentos?.id],
    queryFn: async () => {
      if (!modalPagamentos?.id) return [];
      const { data, error } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("conta_id", modalPagamentos.id)
        .order("data", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!modalPagamentos?.id,
  });

  // Mutation: Registrar pagamento
  const mutationPagamento = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("pagamentos").insert({
        conta_id: values.conta_id,
        data: values.data,
        valor: values.valor,
        forma: values.forma,
        observacao: values.observacao,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-adryssia"] });
      toast.success("Pagamento registrado com sucesso!");
      setModalPagamento(null);
    },
    onError: (error) => {
      toast.error(`Erro ao registrar pagamento: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    },
  });

  // Mutation: Soft delete
  const mutationDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contas")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-adryssia"] });
      toast.success("Conta excluída com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir conta: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    },
  });

  // Filtrar contas
  const contasFiltradas = useMemo(() => {
    if (!contas) return [];
    return contas.filter((c: any) => {
      if (somenteAbertas && c.status_calc === "paga") return false;
      if (filtroStatus !== "todos" && c.status_calc !== filtroStatus) return false;
      if (filtroFornecedor !== "todos" && c.fornecedor_id !== filtroFornecedor) return false;
      if (filtroTexto && !c.descricao.toLowerCase().includes(filtroTexto.toLowerCase())) return false;
      return true;
    });
  }, [contas, filtroStatus, filtroTexto, filtroFornecedor, somenteAbertas]);

  const totalAberto = useMemo(() => {
    return contasFiltradas.reduce((acc, c) => acc + Number(c.valor_aberto), 0);
  }, [contasFiltradas]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contas — Adryssia Cortez</h1>
          <p className="text-sm text-muted-foreground mt-1">Contas sob responsabilidade de Adryssia Cortez</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
                <SelectItem value="paga">Paga</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Fornecedor</Label>
            <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {fornecedores?.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Buscar</Label>
            <Input
              placeholder="Descrição..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={somenteAbertas} onCheckedChange={setSomenteAbertas} />
            <Label>Somente abertas</Label>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Vencimento</th>
                  <th className="text-left p-3 text-sm font-medium">Fornecedor</th>
                  <th className="text-left p-3 text-sm font-medium">Descrição</th>
                  <th className="text-right p-3 text-sm font-medium">Valor Original</th>
                  <th className="text-right p-3 text-sm font-medium">Juros</th>
                  <th className="text-right p-3 text-sm font-medium">Multa</th>
                  <th className="text-right p-3 text-sm font-medium">Desconto</th>
                  <th className="text-right p-3 text-sm font-medium">Valor Pago</th>
                  <th className="text-right p-3 text-sm font-medium">Valor Aberto</th>
                  <th className="text-center p-3 text-sm font-medium">Status</th>
                  <th className="text-center p-3 text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contasFiltradas.map((conta: any) => (
                  <tr key={conta.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm">
                      {new Date(conta.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3 text-sm">{conta.fornecedores?.nome || "-"}</td>
                    <td className="p-3 text-sm">{conta.descricao}</td>
                    <td className="p-3 text-sm text-right">{formatCurrency(Number(conta.valor_original))}</td>
                    <td className="p-3 text-sm text-right">{formatCurrency(Number(conta.juros || 0))}</td>
                    <td className="p-3 text-sm text-right">{formatCurrency(Number(conta.multa || 0))}</td>
                    <td className="p-3 text-sm text-right">{formatCurrency(Number(conta.desconto || 0))}</td>
                    <td className="p-3 text-sm text-right">{formatCurrency(Number(conta.valor_pago_total))}</td>
                    <td className="p-3 text-sm text-right font-semibold">{formatCurrency(Number(conta.valor_aberto))}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          conta.status_calc === "paga"
                            ? "bg-green-500/10 text-green-600"
                            : conta.status_calc === "vencida"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-orange-500/10 text-orange-600"
                        }`}
                      >
                        {conta.status_calc}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setModalPagamento(conta)}
                          disabled={conta.status_calc === "paga"}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setModalPagamentos(conta)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => mutationDelete.mutate(conta.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted font-bold">
                <tr>
                  <td colSpan={8} className="p-3 text-right">Total em Aberto:</td>
                  <td className="p-3 text-right">{formatCurrency(totalAberto)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Pagamento */}
      <Dialog open={!!modalPagamento} onOpenChange={(open) => !open && setModalPagamento(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              mutationPagamento.mutate({
                conta_id: modalPagamento.id,
                data: formData.get("data"),
                valor: Number(formData.get("valor")),
                forma: formData.get("forma"),
                observacao: formData.get("observacao"),
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label>Data do Pagamento</Label>
              <Input type="date" name="data" required defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
            <div>
              <Label>Valor Pago</Label>
              <Input
                type="number"
                name="valor"
                step="0.01"
                required
                defaultValue={modalPagamento?.valor_aberto || 0}
              />
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select name="forma" defaultValue="Dinheiro">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea name="observacao" />
            </div>
            <Button type="submit" className="w-full">Registrar</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Ver Pagamentos */}
      <Dialog open={!!modalPagamentos} onOpenChange={(open) => !open && setModalPagamentos(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pagamentos - {modalPagamentos?.descricao}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pagamentosConta?.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{new Date(p.data + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                  <p className="text-sm text-muted-foreground">{p.forma} {p.observacao && `- ${p.observacao}`}</p>
                </div>
                <p className="font-semibold">{formatCurrency(Number(p.valor))}</p>
              </div>
            ))}
            {(!pagamentosConta || pagamentosConta.length === 0) && (
              <p className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
