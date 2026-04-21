import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardKpi } from '@/components/dashboard/CardKpi';
import { useAppStore } from '@/store/appStore';
import { useSelectedCompanyScope } from '@/hooks/useEmpresas';
import {
  useRelatorioFluxo,
  useRelatorioCategoria,
  useRelatorioFormaPagamento,
  useRelatorioFornecedor,
  RelatorioFluxoRow,
  RelatorioCategoriaRow,
  RelatorioFormaPagamentoRow,
  RelatorioFornecedorRow,
} from '@/hooks/useRelatorios';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toLocalISODate } from '@/lib/date';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

type AbaRelatorio = 'fluxo' | 'categoria' | 'forma' | 'fornecedor';
type PeriodoRapido = 'hoje' | '7d' | '30d' | 'mes';

function getDefaultDates() {
  const now = new Date();
  const ini = new Date(now.getFullYear(), now.getMonth(), 1);
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    dataIni: toLocalISODate(ini),
    dataFim: toLocalISODate(fim),
  };
}

function getRangeByPreset(periodo: PeriodoRapido) {
  const hoje = new Date();
  const fim = new Date(hoje);
  const ini = new Date(hoje);

  if (periodo === 'mes') {
    ini.setDate(1);
    fim.setMonth(fim.getMonth() + 1, 0);
    return {
      dataIni: toLocalISODate(ini),
      dataFim: toLocalISODate(fim),
    };
  }

  if (periodo === '30d') {
    ini.setDate(ini.getDate() - 29);
  } else if (periodo === '7d') {
    ini.setDate(ini.getDate() - 6);
  }

  return {
    dataIni: toLocalISODate(ini),
    dataFim: toLocalISODate(fim),
  };
}

export default function RelatoriosPage() {
  const defaults = useMemo(() => getDefaultDates(), []);
  const { selectedCompanyId } = useAppStore();
  const { selectedOption, selectedEmpresaIds } = useSelectedCompanyScope(selectedCompanyId);

  const [abaAtiva, setAbaAtiva] = useState<AbaRelatorio>('fluxo');
  const [dataIni, setDataIni] = useState(defaults.dataIni);
  const [dataFim, setDataFim] = useState(defaults.dataFim);
  const [fornecedorSearch, setFornecedorSearch] = useState('');

  const filtroBase = useMemo(
    () => ({
      empresaIds: selectedEmpresaIds,
      dataIni,
      dataFim,
    }),
    [selectedEmpresaIds, dataIni, dataFim]
  );

  const { data: fluxo = [], isLoading: loadingFluxo } = useRelatorioFluxo(filtroBase);
  const { data: categorias = [], isLoading: loadingCategoria } = useRelatorioCategoria(filtroBase);
  const { data: formasPgto = [], isLoading: loadingForma } = useRelatorioFormaPagamento(filtroBase);
  const { data: fornecedores = [], isLoading: loadingFornecedor } = useRelatorioFornecedor({
    ...filtroBase,
    fornecedor: fornecedorSearch || undefined,
  });

  const resumoFluxo = useMemo(() => {
    return fluxo.reduce(
      (acc, row) => ({
        pago: acc.pago + Number(row.pago_valor || 0),
        aberto: acc.aberto + Number(row.aberto_valor || 0),
        vencido: acc.vencido + Number(row.vencido_valor || 0),
      }),
      { pago: 0, aberto: 0, vencido: 0 }
    );
  }, [fluxo]);

  const totalCategorias = categorias.reduce(
    (sum, categoria) => sum + Number(categoria.total_valor || 0),
    0
  );
  const principalFornecedor = fornecedores[0] || null;
  const semEscopo = selectedEmpresaIds.length === 0;

  const applyPeriodoRapido = (periodo: PeriodoRapido) => {
    const range = getRangeByPreset(periodo);
    setDataIni(range.dataIni);
    setDataFim(range.dataFim);
  };

  const renderEmpty = (message: string) => (
    <p className="text-muted-foreground text-sm py-4">{message}</p>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Relatorios</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escopo atual: {selectedOption?.name || 'Sem empresa selecionada'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={
              abaAtiva === 'fornecedor'
                ? 'grid grid-cols-1 md:grid-cols-4 gap-4'
                : 'grid grid-cols-1 md:grid-cols-3 gap-4'
            }
          >
            <div>
              <Label>Data Inicio</Label>
              <Input
                type="date"
                value={dataIni}
                onChange={(e) => setDataIni(e.target.value)}
                disabled={semEscopo}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                disabled={semEscopo}
              />
            </div>
            <div>
              <Label>Periodo Rapido</Label>
              <div className="flex gap-2 flex-wrap pt-2">
                <Button size="sm" variant="outline" onClick={() => applyPeriodoRapido('hoje')} disabled={semEscopo}>
                  Hoje
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyPeriodoRapido('7d')} disabled={semEscopo}>
                  7 dias
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyPeriodoRapido('30d')} disabled={semEscopo}>
                  30 dias
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyPeriodoRapido('mes')} disabled={semEscopo}>
                  Mês atual
                </Button>
              </div>
            </div>
            {abaAtiva === 'fornecedor' && (
              <div>
                <Label>Fornecedor</Label>
                <Input
                  placeholder="Buscar fornecedor..."
                  value={fornecedorSearch}
                  onChange={(e) => setFornecedorSearch(e.target.value)}
                  disabled={semEscopo}
                />
              </div>
            )}
          </div>
          {semEscopo && (
            <p className="text-sm text-destructive">
              Selecione uma empresa no menu lateral para visualizar os relatórios.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardKpi titulo="Pago no período" valor={formatCurrency(resumoFluxo.pago)} estado="positivo" />
        <CardKpi titulo="Em aberto no período" valor={formatCurrency(resumoFluxo.aberto)} estado="alerta" />
        <CardKpi titulo="Vencido no período" valor={formatCurrency(resumoFluxo.vencido)} estado="critico" />
      </div>

      <Tabs value={abaAtiva} onValueChange={(value) => setAbaAtiva(value as AbaRelatorio)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fluxo">Fluxo</TabsTrigger>
          <TabsTrigger value="categoria">Categoria</TabsTrigger>
          <TabsTrigger value="forma">Forma Pgto</TabsTrigger>
          <TabsTrigger value="fornecedor">Fornecedor</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo diário - Pago vs Aberto</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingFluxo ? (
                renderEmpty('Carregando fluxo...')
              ) : fluxo.length === 0 ? (
                renderEmpty('Sem dados para o período selecionado.')
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fluxo}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="dia"
                        tickFormatter={(d) => formatDate(d)}
                        className="text-xs"
                      />
                      <YAxis
                        tickFormatter={(v) => formatCurrency(Number(v))}
                        className="text-xs"
                      />
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        labelFormatter={(d) => formatDate(d as string)}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="pago_valor" name="Pago" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="aberto_valor" name="Em aberto" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="vencido_valor" name="Vencido" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento diário</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingFluxo ? (
                renderEmpty('Carregando detalhamento...')
              ) : fluxo.length === 0 ? (
                renderEmpty('Sem movimentação no período selecionado.')
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b">
                        <th className="text-left p-2">Dia</th>
                        <th className="text-right p-2">Pago</th>
                        <th className="text-right p-2">Em Aberto</th>
                        <th className="text-right p-2">Vencido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fluxo.map((row: RelatorioFluxoRow) => (
                        <tr key={row.dia} className="border-b hover:bg-muted/50">
                          <td className="p-2">{formatDate(row.dia)}</td>
                          <td className="p-2 text-right text-green-700">{formatCurrency(Number(row.pago_valor))}</td>
                          <td className="p-2 text-right text-orange-700">{formatCurrency(Number(row.aberto_valor))}</td>
                          <td className="p-2 text-right text-destructive">{formatCurrency(Number(row.vencido_valor))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categoria" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCategoria ? (
                renderEmpty('Carregando categorias...')
              ) : categorias.length === 0 ? (
                renderEmpty('Sem dados de categoria no período selecionado.')
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categorias} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(Number(v))} className="text-xs" />
                      <YAxis type="category" dataKey="categoria_nome" width={140} className="text-xs" />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="total_valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCategoria ? (
                renderEmpty('Carregando detalhamento...')
              ) : categorias.length === 0 ? (
                renderEmpty('Sem dados para detalhar.')
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Categoria</th>
                      <th className="text-right p-2">Valor</th>
                      <th className="text-right p-2">Qtd</th>
                      <th className="text-right p-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((c: RelatorioCategoriaRow) => (
                      <tr key={c.categoria_nome} className="border-b hover:bg-muted/50">
                        <td className="p-2">{c.categoria_nome}</td>
                        <td className="p-2 text-right">{formatCurrency(Number(c.total_valor))}</td>
                        <td className="p-2 text-right">{c.total_qtd}</td>
                        <td className="p-2 text-right">
                          {totalCategorias > 0 ? ((Number(c.total_valor) / totalCategorias) * 100).toFixed(1) : '0'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forma" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por forma de pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingForma ? (
                renderEmpty('Carregando formas de pagamento...')
              ) : formasPgto.length === 0 ? (
                renderEmpty('Sem dados de forma de pagamento no período selecionado.')
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formasPgto}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="forma_pagamento" className="text-xs" />
                      <YAxis tickFormatter={(v) => formatCurrency(Number(v))} className="text-xs" />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="total_valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingForma ? (
                renderEmpty('Carregando detalhamento...')
              ) : formasPgto.length === 0 ? (
                renderEmpty('Sem dados para detalhar.')
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Forma</th>
                      <th className="text-right p-2">Valor</th>
                      <th className="text-right p-2">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formasPgto.map((f: RelatorioFormaPagamentoRow) => (
                      <tr key={f.forma_pagamento} className="border-b hover:bg-muted/50">
                        <td className="p-2">{f.forma_pagamento}</td>
                        <td className="p-2 text-right">{formatCurrency(Number(f.total_valor))}</td>
                        <td className="p-2 text-right">{f.total_qtd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fornecedor" className="space-y-4">
          {principalFornecedor && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <CardKpi titulo="Top fornecedor" valor={principalFornecedor.fornecedor} estado="normal" />
              <CardKpi titulo="Total" valor={formatCurrency(Number(principalFornecedor.total_valor))} estado="normal" />
              <CardKpi titulo="Quantidade" valor={String(principalFornecedor.total_qtd)} estado="normal" />
              <CardKpi
                titulo="Último pagamento"
                valor={principalFornecedor.ultimo_pagamento ? formatDate(principalFornecedor.ultimo_pagamento) : '-'}
                estado="normal"
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Fornecedores</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingFornecedor ? (
                renderEmpty('Carregando fornecedores...')
              ) : fornecedores.length === 0 ? (
                renderEmpty('Nenhum fornecedor encontrado com os filtros atuais.')
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Fornecedor</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Qtd</th>
                      <th className="text-right p-2">Média Mensal</th>
                      <th className="text-left p-2">Último Pgto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fornecedores.map((f: RelatorioFornecedorRow) => (
                      <tr key={f.fornecedor} className="border-b hover:bg-muted/50">
                        <td className="p-2">{f.fornecedor}</td>
                        <td className="p-2 text-right">{formatCurrency(Number(f.total_valor))}</td>
                        <td className="p-2 text-right">{f.total_qtd}</td>
                        <td className="p-2 text-right">{formatCurrency(Number(f.media_mensal))}</td>
                        <td className="p-2">{f.ultimo_pagamento ? formatDate(f.ultimo_pagamento) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
