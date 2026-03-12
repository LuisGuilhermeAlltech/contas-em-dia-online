import { useState, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardKpi } from '@/components/dashboard/CardKpi';
import { useEmpresas } from '@/hooks/useEmpresas';
import {
  useRelatorioFluxo,
  useRelatorioCategoria,
  useRelatorioFormaPagamento,
  useRelatorioFornecedor,
} from '@/hooks/useRelatorios';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toLocalISODate } from '@/lib/date';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

function getDefaultDates() {
  const now = new Date();
  const ini = new Date(now.getFullYear(), now.getMonth(), 1);
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    dataIni: toLocalISODate(ini),
    dataFim: toLocalISODate(fim),
  };
}

export default function RelatoriosPage() {
  const { data: empresas = [] } = useEmpresas();
  const defaults = useMemo(() => getDefaultDates(), []);

  const [empresaId, setEmpresaId] = useState<string>('todas');
  const [dataIni, setDataIni] = useState(defaults.dataIni);
  const [dataFim, setDataFim] = useState(defaults.dataFim);
  const [fornecedorSearch, setFornecedorSearch] = useState('');

  const filtroBase = {
    empresaId: empresaId === 'todas' ? null : empresaId,
    dataIni,
    dataFim,
  };

  const { data: fluxo = [] } = useRelatorioFluxo(filtroBase);
  const { data: categorias = [] } = useRelatorioCategoria(filtroBase);
  const { data: formasPgto = [] } = useRelatorioFormaPagamento(filtroBase);
  const { data: fornecedores = [] } = useRelatorioFornecedor({
    ...filtroBase,
    fornecedor: fornecedorSearch || undefined,
  });

  const totalCategorias = categorias.reduce((s: number, c: any) => s + Number(c.total_valor), 0);

  const FiltrosComuns = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div>
        <Label>Empresa</Label>
        <Select value={empresaId} onValueChange={setEmpresaId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Data Inicio</Label>
        <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
      </div>
      <div>
        <Label>Data Fim</Label>
        <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Relatorios</h2>

      <Tabs defaultValue="fluxo">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fluxo">Fluxo</TabsTrigger>
          <TabsTrigger value="categoria">Categoria</TabsTrigger>
          <TabsTrigger value="forma">Forma Pgto</TabsTrigger>
          <TabsTrigger value="fornecedor">Fornecedor</TabsTrigger>
        </TabsList>

        {/* TAB 1: Fluxo por Periodo */}
        <TabsContent value="fluxo" className="space-y-4">
          <FiltrosComuns />
          <Card>
            <CardHeader>
              <CardTitle>Fluxo diario - Pago vs Aberto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fluxo}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="dia" tickFormatter={(d) => formatDate(d)} className="text-xs" />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Detalhamento diario</CardTitle></CardHeader>
            <CardContent>
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
                    {fluxo.map((row: any) => (
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Por Categoria */}
        <TabsContent value="categoria" className="space-y-4">
          <FiltrosComuns />
          <Card>
            <CardHeader><CardTitle>Distribuicao por categoria</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categorias} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                    <YAxis type="category" dataKey="categoria_nome" width={120} className="text-xs" />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="total_valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Detalhamento</CardTitle></CardHeader>
            <CardContent>
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
                  {categorias.map((c: any) => (
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Por Forma de Pagamento */}
        <TabsContent value="forma" className="space-y-4">
          <FiltrosComuns />
          <Card>
            <CardHeader><CardTitle>Distribuicao por forma de pagamento</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formasPgto}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="forma_pagamento" className="text-xs" />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="total_valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Detalhamento</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Forma</th>
                    <th className="text-right p-2">Valor</th>
                    <th className="text-right p-2">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {formasPgto.map((f: any) => (
                    <tr key={f.forma_pagamento} className="border-b hover:bg-muted/50">
                      <td className="p-2">{f.forma_pagamento}</td>
                      <td className="p-2 text-right">{formatCurrency(Number(f.total_valor))}</td>
                      <td className="p-2 text-right">{f.total_qtd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Por Fornecedor */}
        <TabsContent value="fornecedor" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label>Empresa</Label>
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input
                placeholder="Buscar fornecedor..."
                value={fornecedorSearch}
                onChange={(e) => setFornecedorSearch(e.target.value)}
              />
            </div>
            <div>
              <Label>Data Inicio</Label>
              <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>

          {fornecedores.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {fornecedores.slice(0, 1).map((f: any) => (
                <>
                  <CardKpi key="total" titulo="Total" valor={formatCurrency(Number(f.total_valor))} estado="normal" />
                  <CardKpi key="qtd" titulo="Quantidade" valor={String(f.total_qtd)} estado="normal" />
                  <CardKpi key="media" titulo="Media mensal" valor={formatCurrency(Number(f.media_mensal))} estado="normal" />
                  <CardKpi key="ultimo" titulo="Ultimo pagamento" valor={f.ultimo_pagamento ? formatDate(f.ultimo_pagamento) : '-'} estado="normal" />
                </>
              ))}
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Fornecedores</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Fornecedor</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-right p-2">Qtd</th>
                    <th className="text-right p-2">Media Mensal</th>
                    <th className="text-left p-2">Ultimo Pgto</th>
                  </tr>
                </thead>
                <tbody>
                  {fornecedores.map((f: any) => (
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
