
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  Building2,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface FornecedoresProps {
  selectedEmpresa: string;
}

export const Fornecedores = ({ selectedEmpresa }: FornecedoresProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Dados fictícios para demonstração
  const fornecedores = [
    {
      id: 1,
      nome: "Companhia de Energia",
      cnpj: "12.345.678/0001-90",
      telefone: "(11) 3333-4444",
      email: "contato@energia.com.br",
      endereco: "Rua das Indústrias, 123 - São Paulo/SP",
      categoria: "Utilidades",
      contasAbertas: 2,
      valorTotal: 850.75
    },
    {
      id: 2,
      nome: "Papelaria Central",
      cnpj: "98.765.432/0001-10",
      telefone: "(11) 2222-3333",
      email: "vendas@papelaria.com.br",
      endereco: "Av. Comercial, 456 - São Paulo/SP",
      categoria: "Material",
      contasAbertas: 1,
      valorTotal: 280.30
    },
    {
      id: 3,
      nome: "Imobiliária Silva",
      cnpj: "11.222.333/0001-44",
      telefone: "(11) 4444-5555",
      email: "contato@imosilva.com.br",
      endereco: "Rua dos Imóveis, 789 - São Paulo/SP",
      categoria: "Aluguel",
      contasAbertas: 1,
      valorTotal: 2500.00
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Fornecedores</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Fornecedor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome/Razão Social</Label>
                <Input id="nome" placeholder="Nome do fornecedor" />
              </div>
              <div>
                <Label htmlFor="cnpj">CNPJ/CPF</Label>
                <Input id="cnpj" placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" placeholder="(00) 0000-0000" />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="contato@empresa.com" />
              </div>
              <div>
                <Label htmlFor="endereco">Endereço</Label>
                <Textarea id="endereco" placeholder="Endereço completo..." />
              </div>
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Input id="categoria" placeholder="Ex: Utilidades, Material, Serviços" />
              </div>
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea id="observacoes" placeholder="Informações adicionais..." />
              </div>
              <div className="flex gap-2 pt-4">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Salvar
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de Pesquisa */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar fornecedores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total de Fornecedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{fornecedores.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contas em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {fornecedores.reduce((acc, f) => acc + f.contasAbertas, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Valor Total em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              R$ {fornecedores.reduce((acc, f) => acc + f.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Fornecedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {fornecedores.map((fornecedor) => (
          <Card key={fornecedor.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{fornecedor.nome}</CardTitle>
                    <p className="text-sm text-gray-600">{fornecedor.cnpj}</p>
                  </div>
                </div>
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
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {fornecedor.telefone}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  {fornecedor.email}
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {fornecedor.endereco}
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Contas em Aberto</p>
                      <p className="font-bold text-orange-600">{fornecedor.contasAbertas}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Valor Total</p>
                      <p className="font-bold text-red-600">
                        R$ {fornecedor.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
