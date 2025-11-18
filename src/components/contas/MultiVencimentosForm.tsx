import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from 'lucide-react';
import { addMonths, lastDayOfMonth, getDate, setDate } from 'date-fns';

export interface Vencimento {
  parcela: number;
  data: string;
}

interface MultiVencimentosFormProps {
  onVencimentosChange: (vencimentos: Vencimento[]) => void;
}

export default function MultiVencimentosForm({ onVencimentosChange }: MultiVencimentosFormProps) {
  const [tipoLancamento, setTipoLancamento] = useState<'unico' | 'multiplo'>('unico');
  const [modoGeracao, setModoGeracao] = useState<'automatico' | 'manual'>('automatico');
  const [quantidadeVencimentos, setQuantidadeVencimentos] = useState(2);
  const [dataBase, setDataBase] = useState('');
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);

  const gerarVencimentosMensais = () => {
    if (!dataBase) {
      return;
    }

    const dataInicial = new Date(dataBase + 'T00:00:00');
    const diaBase = getDate(dataInicial);
    const novosVencimentos: Vencimento[] = [];

    for (let i = 0; i < quantidadeVencimentos; i++) {
      let dataVencimento = addMonths(dataInicial, i);
      
      // Se o dia base não existe no mês (ex: 31 em fevereiro), usar o último dia do mês
      const ultimoDia = lastDayOfMonth(dataVencimento).getDate();
      if (diaBase > ultimoDia) {
        dataVencimento = setDate(dataVencimento, ultimoDia);
      } else {
        dataVencimento = setDate(dataVencimento, diaBase);
      }

      const dataFormatada = dataVencimento.toISOString().split('T')[0];
      novosVencimentos.push({
        parcela: i + 1,
        data: dataFormatada,
      });
    }

    setVencimentos(novosVencimentos);
    onVencimentosChange(novosVencimentos);
  };

  const gerarVencimentosManuais = (quantidade: number) => {
    const novosVencimentos: Vencimento[] = [];
    for (let i = 0; i < quantidade; i++) {
      novosVencimentos.push({
        parcela: i + 1,
        data: '',
      });
    }
    setVencimentos(novosVencimentos);
    onVencimentosChange(novosVencimentos);
  };

  const atualizarDataVencimento = (index: number, novaData: string) => {
    const novosVencimentos = [...vencimentos];
    novosVencimentos[index].data = novaData;
    setVencimentos(novosVencimentos);
    onVencimentosChange(novosVencimentos);
  };

  const handleTipoLancamentoChange = (tipo: 'unico' | 'multiplo') => {
    setTipoLancamento(tipo);
    if (tipo === 'unico') {
      setVencimentos([]);
      onVencimentosChange([]);
    }
  };

  const handleQuantidadeChange = (novaQuantidade: number) => {
    setQuantidadeVencimentos(novaQuantidade);
    if (modoGeracao === 'manual' && tipoLancamento === 'multiplo') {
      gerarVencimentosManuais(novaQuantidade);
    }
  };

  const handleModoGeracaoChange = (modo: 'automatico' | 'manual') => {
    setModoGeracao(modo);
    if (modo === 'manual') {
      gerarVencimentosManuais(quantidadeVencimentos);
    } else {
      setVencimentos([]);
      onVencimentosChange([]);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="space-y-2">
        <Label>Tipo de Lançamento</Label>
        <RadioGroup
          value={tipoLancamento}
          onValueChange={handleTipoLancamentoChange}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="unico" id="unico" />
            <Label htmlFor="unico" className="font-normal cursor-pointer">
              Vencimento único
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="multiplo" id="multiplo" />
            <Label htmlFor="multiplo" className="font-normal cursor-pointer">
              Múltiplos vencimentos (até 12)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {tipoLancamento === 'multiplo' && (
        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label>Quantidade de Vencimentos</Label>
            <Select
              value={quantidadeVencimentos.toString()}
              onValueChange={(v) => handleQuantidadeChange(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? 'vencimento' : 'vencimentos'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Modo de Geração</Label>
            <RadioGroup
              value={modoGeracao}
              onValueChange={handleModoGeracaoChange}
              className="flex flex-col gap-2 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="automatico" id="automatico" />
                <Label htmlFor="automatico" className="font-normal cursor-pointer">
                  Gerar automático (mensal)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-normal cursor-pointer">
                  Escolher datas manualmente
                </Label>
              </div>
            </RadioGroup>
          </div>

          {modoGeracao === 'automatico' && (
            <div className="space-y-3">
              <div>
                <Label>Data Base (Primeiro Vencimento)</Label>
                <Input
                  type="date"
                  value={dataBase}
                  onChange={(e) => setDataBase(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={gerarVencimentosMensais}
                disabled={!dataBase}
                className="w-full"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Gerar Vencimentos Mensais
              </Button>
            </div>
          )}

          {vencimentos.length > 0 && (
            <div className="space-y-2">
              <Label>Datas de Vencimento</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {vencimentos.map((venc, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-20">
                      Parcela {venc.parcela}
                    </span>
                    <Input
                      type="date"
                      value={venc.data}
                      onChange={(e) => atualizarDataVencimento(index, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
