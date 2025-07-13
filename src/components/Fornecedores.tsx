
import { useState, useEffect } from "react";
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
  Building2
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FornecedoresProps {
  selectedEmpresa: string;
}

interface Fornecedor {
  id: string;
  nome: string;
  observacao?: string;
  empresa: string;
  created_at: string;
}

export const Fornecedores = ({ selectedEmpresa }: FornecedoresProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nome: "",
    observacao: ""
  });

  // Carregar fornecedores do Supabase
  const loadFornecedores = async () => {
    try {
      setLoading(true);
      console.log("Carregando fornecedores para empresa:", selectedEmpresa);
      
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('empresa', selectedEmpresa)
        .order('nome', { ascending: true });

      if (error) {
        console.error("Erro ao carregar fornecedores:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar fornecedores do banco de dados",
          variant: "destructive",
        });
        return;
      }

      setFornecedores(data || []);
      console.log("Fornecedores carregados:", data);
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar fornecedores quando a empresa mudar
  useEffect(() => {
    if (selectedEmpresa) {
      loadFornecedores();
    }
  }, [selectedEmpresa]);

  const handleSave = async () => {
    console.log("=== SALVANDO FORNECEDOR NO SUPABASE ===");
    console.log("Dados do formulário:", formData);
    console.log("Empresa selecionada:", selectedEmpresa);

    try {
      // Validação
      if (!formData.nome || formData.nome.trim() === "") {
        toast({
          title: "Campo obrigatório",
          description: "Por favor, preencha o nome do fornecedor",
          variant: "destructive",
        });
        return;
      }

      // Inserir no Supabase
      const { data, error } = await supabase
        .from('fornecedores')
        .insert({
          nome: formData.nome.trim(),
          observacao: formData.observacao.trim() || null,
          empresa: selectedEmpresa
        })
        .select()
        .single();

      if (error) {
        console.error("Erro do Supabase:", error);
        toast({
          title: "Erro ao salvar",
          description: "Erro ao salvar fornecedor no banco de dados",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Fornecedor salvo no Supabase:", data);

      // Limpar formulário e fechar dialog
      setFormData({ nome: "", observacao: "" });
      setIsDialogOpen(false);

      // Recarregar lista
      await loadFornecedores();

      toast({
        title: "✅ Sucesso!",
        description: `Fornecedor "${data.nome}" cadastrado com sucesso`,
      });

    } catch (error) {
      console.error("❌ ERRO INESPERADO:", error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao salvar o fornecedor",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (fornecedorId: string) => {
    if (!confirm("Tem certeza que deseja excluir este fornecedor?")) return;

    try {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', fornecedorId);

      if (error) {
        console.error("Erro ao excluir:", error);
        toast({
          title: "Erro",
          description: "Erro ao excluir fornecedor",
          variant: "destructive",
        });
        return;
      }

      await loadFornecedores();
      toast({
        title: "Sucesso!",
        description: "Fornecedor excluído com sucesso",
      });
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir fornecedor",
        variant: "destructive",
      });
    }
  };

  const filteredFornecedores = fornecedores.filter(fornecedor => 
    fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <p className="text-gray-600">Carregando fornecedores...</p>
        </div>
      </div>
    );
  }

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
                <Label htmlFor="nome">Nome *</Label>
                <Input 
                  id="nome" 
                  placeholder="Nome do fornecedor" 
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="observacao">Observação</Label>
                <Textarea 
                  id="observacao" 
                  placeholder="Observações adicionais (opcional)..." 
                  value={formData.observacao}
                  onChange={(e) => setFormData({...formData, observacao: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={!formData.nome.trim()}
                >
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {filteredFornecedores.length} fornecedor(es) cadastrado(s)
          </div>
        </CardContent>
      </Card>

      {/* Lista de Fornecedores */}
      {filteredFornecedores.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFornecedores.map((fornecedor) => (
            <Card key={fornecedor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{fornecedor.nome}</CardTitle>
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
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDelete(fornecedor.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              {fornecedor.observacao && (
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Observação:</p>
                      <p className="text-sm text-gray-800">{fornecedor.observacao}</p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
