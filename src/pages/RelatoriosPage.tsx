import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/appStore';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';

export default function RelatoriosPage() {
  const { selectedCompanyId } = useAppStore();

  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: contas = [] } = useQuery({
    queryKey: ['relatorios', selectedCompanyId, periodoInicio, periodoFim, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('contas_view')
        .select('*')
        .eq('empresa', selectedCompanyId)
        .order('vencimento', { ascending: true });

      if (periodoInicio) {
        query = query.gte('vencimento', periodoInicio);
      }

      if (periodoFim) {
        query = query.lte('vencimento', periodoFim);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let result = data || [];
      
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

  const totalAberto = contas
    .filter((c) => c.status !== 'Pago')
    .reduce((sum, c) => sum + (Number(c.saldo) || 0), 0);

  const totalPago = contas
    .filter((c) => c.status === 'Pago')
    .reduce((sum, c) => sum + (Number(c.total_pago) || 0), 0);

  const handleExportar = () => {
    if (contas.length === 0) {
      toast.error('Nenhuma conta para exportar');
      return;
    }

    const headers = [
      'Vencimento',
      'Descrição',
      'Valor Total',
      'Valor Pago',
      'Saldo',
      'Status',
    ];
    const rows = contas.map((c) => [
      c.vencimento || '',
      c.descricao || '',
      (c.valor_total || 0).toFixed(2),
      (c.total_pago || 0).toFixed(2),
      (c.saldo || 0).toFixed(2),
      c.status || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${selectedCompanyId}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Relatório exportado com sucesso');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Relatórios</h2>
        <Button onClick={handleExportar}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="text-base text-orange-700">Total em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-700">{formatCurrency(totalAberto)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-base text-green-700">Total Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-700">{formatCurrency(totalPago)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-base text-blue-700">Quantidade de Contas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-700">{contas.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Vencimento</th>
                  <th className="text-left p-2">Descrição</th>
                  <th className="text-right p-2">Valor Total</th>
                  <th className="text-right p-2">Valor Pago</th>
                  <th className="text-right p-2">Saldo</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((conta) => (
                  <tr key={conta.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{formatDate(conta.vencimento)}</td>
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
