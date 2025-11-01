import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { AlertCircle, Download, RefreshCw } from "lucide-react";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, addDays, format } from "date-fns";

interface ContaDiagnostico {
  id: string;
  descricao: string;
  valor_total: number;
  vencimento: string;
  status: string;
  empresa: string;
}

export default function DiagnosticoFinanceiro() {
  const [selectedEmpresa, setSelectedEmpresa] = useState("grupo-lider");
  const [dataReferencia, setDataReferencia] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  
  // Resultados dos testes
  const [resultadoSQL, setResultadoSQL] = useState<{
    contas: ContaDiagnostico[];
    soma: number;
  } | null>(null);
  
  const [resultadoRPC, setResultadoRPC] = useState<number | null>(null);
  
  const [diferenças, setDiferenças] = useState<{
    contasPagas: ContaDiagnostico[];
    contasCanceladas: ContaDiagnostico[];
    contasForaIntervalo: ContaDiagnostico[];
  } | null>(null);

  const executarDiagnostico = async () => {
    setLoading(true);
    try {
      const TZ = 'America/Sao_Paulo';
      const dataRef = new Date(dataReferencia);
      const inicioSP = toZonedTime(dataRef, TZ);
      const inicioDiaSP = startOfDay(inicioSP);
      const fimDiaSP = addDays(inicioDiaSP, 1);
      
      const startISO = fromZonedTime(inicioDiaSP, TZ).toISOString();
      const endISO = fromZonedTime(fimDiaSP, TZ).toISOString();
      const dataFormatada = inicioDiaSP.toISOString().split('T')[0];

      console.log(`🔍 Diagnóstico para ${dataFormatada} (${startISO} até ${endISO})`);

      // TESTE 1: SQL Direto
      const { data: contasSQL, error: errorSQL } = await supabase
        .from('contas_view')
        .select('id, descricao, valor_total, vencimento, status, empresa')
        .eq('empresa', selectedEmpresa);

      if (errorSQL) {
        console.error("Erro SQL direto:", errorSQL);
      }

      // Filtrar no client para diagnóstico detalhado
      const contasPendentes = (contasSQL || []).filter(c => {
        if (!c.vencimento) return false;
        const vencimentoISO = new Date(c.vencimento + 'T00:00:00').toISOString();
        return vencimentoISO >= startISO && 
               vencimentoISO < endISO && 
               c.status === 'Pendente';
      });

      const somaSQL = contasPendentes.reduce((acc, c) => acc + Number(c.valor_total || 0), 0);

      setResultadoSQL({
        contas: contasPendentes as ContaDiagnostico[],
        soma: somaSQL
      });

      // TESTE 2: RPC
      const { data: totalRPC, error: errorRPC } = await supabase
        .rpc('rpc_total_contas_do_dia', {
          p_empresa: selectedEmpresa,
          p_data: dataFormatada
        });

      if (errorRPC) {
        console.error("Erro RPC:", errorRPC);
      }

      setResultadoRPC(Number(totalRPC || 0));

      // TESTE 3: Diferenças (contas excluídas por filtros)
      const todasContas = contasSQL || [];
      
      const contasPagas = todasContas.filter(c => {
        if (!c.vencimento) return false;
        const vencimentoISO = new Date(c.vencimento + 'T00:00:00').toISOString();
        return vencimentoISO >= startISO && 
               vencimentoISO < endISO && 
               c.status === 'Pago';
      });

      const contasCanceladas = todasContas.filter(c => {
        if (!c.vencimento) return false;
        const vencimentoISO = new Date(c.vencimento + 'T00:00:00').toISOString();
        return vencimentoISO >= startISO && 
               vencimentoISO < endISO && 
               c.status === 'Cancelada';
      });

      const contasForaIntervalo = todasContas.filter(c => {
        if (!c.vencimento) return false;
        const vencimentoISO = new Date(c.vencimento + 'T00:00:00').toISOString();
        return (vencimentoISO < startISO || vencimentoISO >= endISO) && 
               c.status === 'Pendente';
      });

      setDiferenças({
        contasPagas: contasPagas as ContaDiagnostico[],
        contasCanceladas: contasCanceladas as ContaDiagnostico[],
        contasForaIntervalo: contasForaIntervalo as ContaDiagnostico[]
      });

    } catch (error) {
      console.error("Erro ao executar diagnóstico:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    if (!resultadoSQL?.contas) return;

    const headers = ['ID', 'Descrição', 'Valor Total', 'Vencimento', 'Status', 'Empresa'];
    const rows = resultadoSQL.contas.map(c => [
      c.id,
      c.descricao,
      c.valor_total.toFixed(2),
      formatDate(c.vencimento),
      c.status,
      c.empresa
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `diagnostico_${selectedEmpresa}_${dataReferencia}.csv`;
    link.click();
  };

  const getNomeEmpresa = (id: string) => {
    const empresas: { [key: string]: string } = {
      "grupo-lider": "Grupo Líder",
      "alltech-matriz": "Alltech Matriz", 
      "alltech-filial": "Alltech Filial",
      "luis-guilherme": "Luis Guilherme"
    };
    return empresas[id] || id;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Diagnóstico Financeiro</h1>
          <p className="text-gray-600 mt-1">Ferramenta técnica para validação de cálculos</p>
          <Badge variant="outline" className="mt-2">
            Modo Edição - Não disponível em produção
          </Badge>
        </div>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Parâmetros do Diagnóstico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grupo-lider">Grupo Líder</SelectItem>
                  <SelectItem value="alltech-matriz">Alltech Matriz</SelectItem>
                  <SelectItem value="alltech-filial">Alltech Filial</SelectItem>
                  <SelectItem value="luis-guilherme">Luis Guilherme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data de Referência</Label>
              <Input 
                type="date" 
                value={dataReferencia} 
                onChange={(e) => setDataReferencia(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={executarDiagnostico} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Executar Diagnóstico
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {(resultadoSQL || resultadoRPC !== null) && (
        <>
          {/* Comparação SQL vs RPC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-700">Teste 1: Query SQL Client-Side</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Contas encontradas: <span className="font-bold">{resultadoSQL?.contas.length || 0}</span>
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {formatCurrency(resultadoSQL?.soma || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-700">Teste 2: RPC (Fonte da Verdade)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Calculado via função SQL no servidor
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {formatCurrency(resultadoRPC || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparação */}
          {resultadoSQL && resultadoRPC !== null && (
            <Card className={resultadoSQL.soma === resultadoRPC ? 'border-green-500' : 'border-red-500'}>
              <CardHeader>
                <CardTitle className={resultadoSQL.soma === resultadoRPC ? 'text-green-700' : 'text-red-700'}>
                  {resultadoSQL.soma === resultadoRPC ? '✓ Valores Conferem' : '⚠ Divergência Detectada'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resultadoSQL.soma !== resultadoRPC && (
                  <div className="flex items-start gap-2 p-4 bg-red-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">
                        Diferença: R$ {Math.abs(resultadoSQL.soma - resultadoRPC).toFixed(2)}
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        Verifique os filtros aplicados em cada método
                      </p>
                    </div>
                  </div>
                )}
                {resultadoSQL.soma === resultadoRPC && (
                  <p className="text-green-700">
                    Os dois métodos retornaram o mesmo valor. O cálculo está correto.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lista de Contas */}
          {resultadoSQL && resultadoSQL.contas.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Contas Consideradas ({resultadoSQL.contas.length})</CardTitle>
                <Button onClick={exportarCSV} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {resultadoSQL.contas.map((conta, idx) => (
                    <div key={conta.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {idx + 1}. {conta.descricao}
                        </p>
                        <p className="text-sm text-gray-600">
                          Vencimento: {formatDate(conta.vencimento)} | Status: {conta.status}
                        </p>
                      </div>
                      <p className="font-bold text-gray-900">
                        R$ {formatCurrency(conta.valor_total)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diferenças - Contas Excluídas */}
          {diferenças && (
            <Card>
              <CardHeader>
                <CardTitle>Teste 3: Análise de Exclusões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800">Contas Pagas</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {diferenças.contasPagas.length}
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Excluídas por status = 'Pago'
                    </p>
                  </div>

                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm font-semibold text-red-800">Contas Canceladas</p>
                    <p className="text-2xl font-bold text-red-600">
                      {diferenças.contasCanceladas.length}
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Excluídas por status = 'Cancelada'
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-800">Fora do Intervalo</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {diferenças.contasForaIntervalo.length}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      Vencimento diferente da data selecionada
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Info Inicial */}
      {!resultadoSQL && resultadoRPC === null && !loading && (
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Pronto para Diagnóstico
              </h3>
              <p className="text-gray-600">
                Selecione a empresa e data de referência, depois clique em "Executar Diagnóstico"
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
