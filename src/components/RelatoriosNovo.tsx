import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/formatters";
import { Download, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RelatoriosNovoProps {
  selectedEmpresa: string;
}

export function RelatoriosNovo({ selectedEmpresa }: RelatoriosNovoProps) {
  const [periodoInicio, setPeriodoInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [periodoFim, setPeriodoFim] = useState(new Date().toISOString().split("T")[0]);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroFornecedor, setFiltroFornecedor] = useState("todos");
  const [filtroResponsavel, setFiltroResponsavel] = useState("todos");

  // Buscar contas
  const { data: contas, isLoading } = useQuery({
    queryKey: ["relatorios-novo", selectedEmpresa, periodoInicio, periodoFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_contas_pagar")
        .select("*, fornecedores(nome)")
        .eq("empresa_id", selectedEmpresa)
        .gte("data_vencimento", periodoInicio)
        .lte("data_vencimento", periodoFim)
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar pagamentos no período
  const { data: pagamentos } = useQuery({
    queryKey: ["pagamentos-periodo", selectedEmpresa, periodoInicio, periodoFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("*, contas!inner(empresa)")
        .gte("data", periodoInicio)
        .lte("data", periodoFim)
        .eq("contas.empresa", selectedEmpresa);
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

  // Filtrar contas
  const contasFiltradas = useMemo(() => {
    if (!contas) return [];
    return contas.filter((c: any) => {
      if (filtroStatus !== "todos" && c.status_calc !== filtroStatus) return false;
      if (filtroFornecedor !== "todos" && c.fornecedor_id !== filtroFornecedor) return false;
      if (filtroResponsavel !== "todos" && c.responsavel !== filtroResponsavel) return false;
      return true;
    });
  }, [contas, filtroStatus, filtroFornecedor, filtroResponsavel]);

  // Calcular totais
  const totais = useMemo(() => {
    const totalAberto = contasFiltradas
      .filter((c: any) => c.status_calc !== "paga")
      .reduce((acc, c) => acc + Number(c.valor_aberto), 0);
    const totalPago = pagamentos?.reduce((acc, p) => acc + Number(p.valor), 0) || 0;
    const qtdContas = contasFiltradas.length;
    return { totalAberto, totalPago, qtdContas };
  }, [contasFiltradas, pagamentos]);

  const responsaveis = useMemo(() => {
    if (!contas) return [];
    const unique = Array.from(new Set(contas.map((c: any) => c.responsavel).filter(Boolean)));
    return unique.sort();
  }, [contas]);

  const exportarCSV = () => {
    const headers = [
      "Vencimento",
      "Fornecedor",
      "Descrição",
      "Valor Original",
      "Juros",
      "Multa",
      "Desconto",
      "Valor Pago",
      "Valor Aberto",
      "Status",
      "Responsável",
    ];
    const rows = contasFiltradas.map((c: any) => [
      new Date(c.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR"),
      c.fornecedores?.nome || "-",
      c.descricao,
      c.valor_original,
      c.juros || 0,
      c.multa || 0,
      c.desconto || 0,
      c.valor_pago_total,
      c.valor_aberto,
      c.status_calc,
      c.responsavel || "-",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_${periodoInicio}_${periodoFim}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <Button onClick={exportarCSV}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Atenção:</strong> Totais de <strong>ABERTO</strong> são calculados por data de vencimento.
          Totais <strong>PAGOS</strong> são calculados por data de pagamento.
        </AlertDescription>
      </Alert>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Data Início</Label>
            <Input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
          </div>
          <div>
            <Label>Data Fim</Label>
            <Input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
          </div>
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
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsável</Label>
            <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {responsaveis.map((r: any) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Totais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total em Aberto</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totais.totalAberto)}</div>
            <p className="text-xs text-muted-foreground mt-1">Por data de vencimento</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totais.totalPago)}</div>
            <p className="text-xs text-muted-foreground mt-1">Por data de pagamento</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quantidade</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totais.qtdContas}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de contas</p>
          </CardContent>
        </Card>
      </div>

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
                  <th className="text-right p-3 text-sm font-medium">Valor Pago</th>
                  <th className="text-right p-3 text-sm font-medium">Valor Aberto</th>
                  <th className="text-center p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Responsável</th>
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
                    <td className="p-3 text-sm">{conta.responsavel || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
