
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DashboardNovo } from "@/components/DashboardNovo";
import { ContasAPagarNovo } from "@/components/ContasAPagarNovo";
import { ContasAdryssia } from "@/components/ContasAdryssia";
import { RelatoriosNovo } from "@/components/RelatoriosNovo";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const Index = () => {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedEmpresa, setSelectedEmpresa] = useState("d0f7e8c5-7d49-438e-bc8f-9fb3b4e31e64");

  const renderContent = () => {
    console.log('Renderizando conteúdo para menu:', activeMenu);
    
    try {
      switch (activeMenu) {
        case "dashboard":
          return <DashboardNovo selectedEmpresa={selectedEmpresa} />;
        case "contas":
          return (
            <ErrorBoundary>
              <ContasAPagarNovo selectedEmpresa={selectedEmpresa} />
            </ErrorBoundary>
          );
        case "adryssia":
          return (
            <ErrorBoundary>
              <ContasAdryssia selectedEmpresa={selectedEmpresa} />
            </ErrorBoundary>
          );
        case "relatorios":
          return <RelatoriosNovo selectedEmpresa={selectedEmpresa} />;
        default:
          return <DashboardNovo selectedEmpresa={selectedEmpresa} />;
      }
    } catch (error) {
      console.error('Erro ao renderizar conteúdo:', error);
      return <div>Erro ao carregar conteúdo</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        selectedEmpresa={selectedEmpresa}
        setSelectedEmpresa={setSelectedEmpresa}
      />
      
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                Sistema de Controle Financeiro
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Header actions removidos para simplificar */}
            </div>
          </div>
        </header>

        <main className="p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
