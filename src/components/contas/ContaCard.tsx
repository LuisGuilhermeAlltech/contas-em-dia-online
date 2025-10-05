import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, DollarSign, Check, Eye, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ContaView = Tables<'contas_view'>;

interface ContaCardProps {
  conta: ContaView;
  onMarcarPaga: (conta: ContaView) => void;
  onRegistrarPagamento: (conta: ContaView) => void;
  onVerHistorico: (conta: ContaView) => void;
  onEditar: (conta: ContaView) => void;
  onExcluir: (id: string) => void;
}

const getStatusBadge = (status: string | null) => {
  const statusLower = String(status || 'pendente').toLowerCase();
  
  if (statusLower === 'pago') {
    return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Pago</Badge>;
  } else if (statusLower === 'parcial') {
    return <Badge variant="outline" className="border-blue-500 text-blue-700">Parcial</Badge>;
  } else {
    return <Badge variant="secondary">Pendente</Badge>;
  }
};

export const ContaCard = ({ 
  conta, 
  onMarcarPaga, 
  onRegistrarPagamento, 
  onVerHistorico, 
  onEditar, 
  onExcluir 
}: ContaCardProps) => {
  const statusLower = String(conta.status || '').toLowerCase();
  
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{conta.descricao || 'Sem descrição'}</h3>
        <p className="text-sm text-gray-600">
          Vencimento: {conta.vencimento ? new Date(conta.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
        </p>
        {statusLower === "parcial" && (
          <p className="text-xs text-blue-600">
            Pago: R$ {(conta.total_pago || 0).toFixed(2)} | Saldo: R$ {(conta.saldo || 0).toFixed(2)}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-bold text-lg text-gray-900">
            R$ {(conta.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500">
            Total: R$ {(conta.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        {getStatusBadge(conta.status)}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {statusLower === "parcial" && (
              <DropdownMenuItem onClick={() => onVerHistorico(conta)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Histórico de Pagamentos
              </DropdownMenuItem>
            )}
            {statusLower !== "pago" && conta.saldo && conta.saldo > 0 && (
              <DropdownMenuItem onClick={() => onMarcarPaga(conta)}>
                <Check className="h-4 w-4 mr-2" />
                Marcar como Paga
              </DropdownMenuItem>
            )}
            {statusLower !== "pago" && (
              <DropdownMenuItem onClick={() => onRegistrarPagamento(conta)}>
                <DollarSign className="h-4 w-4 mr-2" />
                Registrar Pagamento
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEditar(conta)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => onExcluir(conta.id!)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
