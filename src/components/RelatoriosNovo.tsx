import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RelatoriosProps {
  selectedEmpresa: string;
}

export const RelatoriosNovo = ({ selectedEmpresa }: RelatoriosProps) => {
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    status: "",
  });
  const [resumo, setResumo] = useState({
    totalAberto: 0,
    totalPago: 0,
    quantidade: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (filtros.dataInicio && filtros.dataFim) {
      loadRelatorios();
    }
  }, [selectedEmpresa, filtros]);

  const loadRelatorios = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('contas_view')
        .select('*')
        .eq('empresa', selectedEmpresa);

      if (filtros.dataInicio) {
        query = query.gte('vencimento', filtros.dataInicio);
      }
      if (filtros.dataFim) {
        query = query.lte('vencimento', filtros.dataFim);
      }
      if (filtros.status) {
        query = query.eq('status', filtros.status === 'paga' ? 'Pago' : filtros.status === 'vencida' ? 'Vencida' : 'Pendente');
      }

      const { data: contas, error } = await query;

      if (error) throw error;

      // Calcular resumo
      const totalAberto = contas
        ?.filter((c: any) => c.status !== 'Pago')
        .reduce((sum: number, c: any) => sum + (c.saldo || 0), 0) || 0;

      const totalPago = contas
        ?.filter((c: any) => c.status === 'Pago')
        .reduce((sum: number, c: any) => sum + (c.valor_total || 0), 0) || 0;

      setResumo({
        totalAberto,
        totalPago,
        quantidade: contas?.length || 0,
      });

      // Preparar dados para o gráfico
      const dadosPorDia: { [key: string]: number } = {};
      contas?.forEach((conta: any) => {
        const dia = conta.vencimento;
        if (conta.status !== 'Pago') {
          dadosPorDia[dia] = (dadosPorDia[dia] || 0) + (conta.saldo || 0);
        }
      });

      const chartDataFormatted = Object.keys(dadosPorDia)
        .sort()
        .map((dia) => ({
          data: format(new Date(dia), "dd/MM", { locale: ptBR }),
          valor: dadosPorDia[dia],
        }));

      setChartData(chartDataFormatted);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os relatórios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      let query = supabase
        .from('contas_view')
        .select('*')
        .eq('empresa', selectedEmpresa);

      if (filtros.dataInicio) query = query.gte('vencimento', filtros.dataInicio);
      if (filtros.dataFim) query = query.lte('vencimento', filtros.dataFim);
      if (filtros.status) query = query.eq('status', filtros.status === 'paga' ? 'Pago' : filtros.status === 'vencida' ? 'Vencida' : 'Pendente');

      const { data: contas } = await query;

      if (!contas || contas.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhuma conta encontrada para exportar",
        });
        return;
      }

      const csv = [
        ['Vencimento', 'Descrição', 'Valor Total', 'Valor Pago', 'Saldo', 'Status'],
        ...contas.map((c: any) => [
          c.vencimento,
          c.descricao,
          c.valor_total,
          c.total_pago,
          c.saldo,
          c.status,
        ]),
      ].map((row) => row.join(';')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_contas_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: "Sucesso",
        description: "Relatório exportado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar o relatório",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

          <div className="mt-4">
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumo.totalAberto)}</div>
            <p className="text-xs text-muted-foreground">Por vencimento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumo.totalPago)}</div>
            <p className="text-xs text-muted-foreground">Por data de pagamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quantidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.quantidade}</div>
            <p className="text-xs text-muted-foreground">Total de contas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle>Valor Aberto por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Selecione um período para visualizar o gráfico
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value)}
                  labelStyle={{ color: '#000' }}
                />
                <Line type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
