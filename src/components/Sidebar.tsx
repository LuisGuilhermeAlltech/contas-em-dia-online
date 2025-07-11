
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  FileText, 
  Building2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedEmpresa: string;
  setSelectedEmpresa: (empresa: string) => void;
}

export const Sidebar = ({ 
  activeMenu, 
  setActiveMenu, 
  sidebarOpen, 
  setSidebarOpen,
  selectedEmpresa,
  setSelectedEmpresa 
}: SidebarProps) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "contas", label: "Contas a Pagar", icon: CreditCard },
    { id: "fornecedores", label: "Fornecedores", icon: Users },
    { id: "relatorios", label: "Relatórios", icon: FileText },
  ];

  const empresas = [
    { id: "empresa1", name: "Empresa Principal" },
    { id: "empresa2", name: "Filial Norte" },
    { id: "empresa3", name: "Filial Sul" },
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg transition-all duration-300 z-50 ${
      sidebarOpen ? 'w-64' : 'w-16'
    }`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-lg text-gray-900">FinanceControl</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {sidebarOpen && (
        <div className="p-4 border-b border-gray-200">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Empresa</label>
          <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((empresa) => (
                <SelectItem key={empresa.id} value={empresa.id}>
                  {empresa.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Button
                  variant={activeMenu === item.id ? "default" : "ghost"}
                  className={`w-full justify-start h-12 ${
                    !sidebarOpen ? 'px-3' : 'px-4'
                  } ${
                    activeMenu === item.id 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveMenu(item.id)}
                >
                  <Icon className="h-5 w-5" />
                  {sidebarOpen && <span className="ml-3">{item.label}</span>}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
