
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  History,
  Paperclip
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ContasAPagarProps {
  selectedEmpresa: string;
}

interface Pagamento {
  id: number;
  valor: number;
  data: string;
  observacao?: string;
}

interface Conta {
  id: number;
  descricao: string;
  valorTotal: number;
  valorPago: number;
  vencimento: string;
  status: "pendente" | "pago" | "vencida";
  empresa: string;
  pagamentos: Pagamento[];
  arquivo?: string;
}

export const ContasAPagar = ({ selectedEmpresa }: ContasAPagarProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPagamentoDialogOpen, setIsPagamentoDialogOpen] = useState(false);
  const [contaParaPagamento, setContaParaPagamento] = useState<Conta | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  
  const [formData, setFormData] = useState({
    descricao: "",
    valorTotal: "",
    vencimento: "",
    arquivo: ""
  });

  const [pagamentoData, setPagamentoData] = useState({
    valor: "",
    observacao: ""
  });

  const handleSave = () => {
    if (!formData.descricao.trim() || !formData.valorTotal || !formData.vencimento) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    const valorTotal = parseFloat(formData.valorTotal);
    if (isNaN(valorTotal) || valorTotal <= 0) {
      alert("Valor deve ser maior que zero");
      return;
    }

    const novaConta: Conta = {
      id: Date.now(),
      descricao: formData.descricao,
      valorTotal: valorTotal,
      valorPago: 0,
      vencimento: formData.vencimento,
      status: new Date(formData.vencimento) < new Date() ? "vencida" : "pendente",
      empresa: selectedEmpresa,
      pagamentos: [],
      arquivo: formData.arquivo
    };

    setContas([...contas, novaConta]);
    setFormData({
      descricao: "",
      valorTotal: "",
      vencimento: "",
      arquivo: ""
    });
    setIsDialogOpen(false);
  };

  const handlePagamento = () => {
    if (!contaParaPagamento || !pagamentoData.valor) {
      alert("Informe o valor do pagamento");
      return;
    }

    const valorPagamento = parseFloat(pagamentoData.valor);
    if (isNaN(valorPagamento) || valorPagamento <= 0) {
      alert("Valor do pagamento deve ser maior que zero");
      return;
    }

    const saldoRestante = contaParaPagamento.valorTotal - contaParaPagamento.valorPago;
    if (valorPagamento > saldoRestante) {
      alert(`Valor não pode ser maior que o saldo restante: R$ ${saldoRestante.toFixed(2)}`);
      return;
    }

    const novoPagamento: Pagamento = {
      id: Date.now(),
      valor: valorPagamento,
      data: new Date().toISOString().split('T')[0],
      observacao: pagamentoData.observacao
    };

    const novoValorPago = contaParaPagamento.valorPago + valorPagamento;
    const novoStatus = novoValorPago >= contaParaPagamento.valorTotal ? "pago" : contaParaPagamento.status;

    const contasAtualizadas = contas.map(conta => 
      conta.id === contaParaPagamento.id 
        ? {
            ...conta,
            valorPago: novoValorPago,
            status: novoStatus,
            pagamentos: [...conta.pagamentos, novoPagamento]
          }
        : conta
    );

    setContas(contasAtualizadas);
    setPagamentoData({ valor: "", observacao: "" });
    setIsPagamentoDialogOpen(false);
    setContaParaPagamento(null);
  };

  const handleDelete = (contaId: number) => {
    if (confirm("Tem certeza que deseja excluir esta conta?")) {
      setContas(contas.filter(conta => conta.id !== contaId));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pago</Badge>;
      case "vencida":
        return <Badge variant="destructive">Vencida</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pago":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "vencida":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
    }
  };

  const filteredContas = contas.filter(conta => {
    const matchEmpresa = conta.empresa === selectedEmpresa;
    const matchSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || conta.status === statusFilter;
    
    return matchEmpresa && matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Contas a Pagar</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="descricao">Descrição da Conta *</Label>
                <Textarea 
                  id="descricao" 
                  placeholder="Ex: Nota 234 - José Material de Construção" 
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="min-h-20"
                />
              </div>
              <div>
                <Label htmlFor="valor">Valor Total *</Label>
                <Input 
                  id="valor" 
                  type="number" 
                  step="0.01"
                  placeholder="0,00" 
                  value={formData.valorTotal}
                  onChange={(e) => setFormData({...formData, valorTotal: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="vencimento">Data de Vencimento *</Label>
                <Input 
                  id="vencimento" 
                  type="date" 
                  value={formData.vencimento}
                  onChange={(e) => setFormData({...formData, vencimento: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="arquivo">Anexar Arquivo (Opcional)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="arquivo" 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setFormData({...formData, arquivo: file?.name || ""});
                    }}
                    className="flex-1"
                  />
                  <Paperclip className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={!formData.descricao.trim() || !formData.valorTotal || !formData.vencimento}
                >
                  Salvar
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setFormData({
                      descricao: "",
                      valorTotal: "",
                      vencimento: "",
                      arquivo: ""
                    });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog de Pagamento */}
      <Dialog open={isPagamentoDialogOpen} onOpenChange={setIsPagamentoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {contaParaPagamento && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{contaParaPagamento.descricao}</p>
                <p className="text-sm text-gray-600">Valor Total: R$ {contaParaPagamento.valorTotal.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Já Pago: R$ {contaParaPagamento.valorPago.toFixed(2)}</p>
                <p className="text-sm font-medium text-red-600">
                  Saldo: R$ {(contaParaPagamento.valorTotal - contaParaPagamento.valorPago).toFixed(2)}
                </p>
              </div>
              <div>
                <Label htmlFor="valorPagamento">Valor do Pagamento *</Label>
                <Input 
                  id="valorPagamento" 
                  type="number" 
                  step="0.01"
                  placeholder="0,00"
                  max={contaParaPagamento.valorTotal - contaParaPagamento.valorPago}
                  value={pagamentoData.valor}
                  onChange={(e) => setPagamentoData({...pagamentoData, valor: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="observacaoPagamento">Observação</Label>
                <Textarea 
                  id="observacaoPagamento" 
                  placeholder="Observações sobre o pagamento..." 
                  value={pagamentoData.observacao}
                  onChange={(e) => setPagamentoData({...pagamentoData, observacao: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handlePagamento}
                  disabled={!pagamentoData.valor}
                >
                  Registrar Pagamento
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setIsPagamentoDialogOpen(false);
                    setPagamentoData({ valor: "", observacao: "" });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar contas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredContas.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all" 
                  ? "Nenhuma conta encontrada" 
                  : "Nenhuma conta cadastrada"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContas.map((conta) => (
                <div key={conta.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(conta.status)}
                    <div>
                      <h3 className="font-medium text-gray-900">{conta.descricao}</h3>
                      <p className="text-sm text-gray-600">Vencimento: {new Date(conta.vencimento).toLocaleDateString('pt-BR')}</p>
                      {conta.valorPago > 0 && conta.status !== "pago" && (
                        <p className="text-xs text-blue-600">
                          Pago: R$ {conta.valorPago.toFixed(2)} | Saldo: R$ {(conta.valorTotal - conta.valorPago).toFixed(2)}
                        </p>
                      )}
                      {conta.arquivo && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          {conta.arquivo}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">
                        R$ {conta.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {conta.status !== "pago" && (
                          <DropdownMenuItem 
                            onClick={() => {
                              setContaParaPagamento(conta);
                              setIsPagamentoDialogOpen(true);
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Registrar Pagamento
                          </DropdownMenuItem>
                        )}
                        {conta.pagamentos.length > 0 && (
                          <DropdownMenuItem>
                            <History className="h-4 w-4 mr-2" />
                            Histórico ({conta.pagamentos.length} pagamentos)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDelete(conta.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
