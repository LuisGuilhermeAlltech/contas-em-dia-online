
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { ContasAPagar } from "@/components/ContasAPagar";
import { Fornecedores } from "@/components/Fornecedores";
import { Relatorios } from "@/components/Relatorios";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const Index = () => {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedEmpresa, setSelectedEmpresa] = useState("empresa1");

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return <Dashboard selectedEmpresa={selectedEmpresa} />;
      case "contas":
        return <ContasAPagar selectedEmpresa={selectedEmpresa} />;
      case "fornecedores":
        return <Fornecedores selectedEmpresa={selectedEmpresa} />;
      case "relatorios":
        return <Relatorios selectedEmpresa={selectedEmpresa} />;
      default:
        return <Dashboard selectedEmpresa={selectedEmpresa} />;
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
