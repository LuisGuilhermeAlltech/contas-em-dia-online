import { useState, ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore, COMPANIES } from '@/store/appStore';
import { PortalProvider } from '@/components/providers/PortalProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AppShellProps {
  children: ReactNode;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
}

export const AppShell = ({ children, activeMenu, setActiveMenu }: AppShellProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { selectedCompanyId, selectedCompanyName, setCompany } = useAppStore();

  const handleCompanyChange = (value: string) => {
    const name = COMPANIES[value as keyof typeof COMPANIES];
    setCompany(value, name);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'contas', label: 'Contas a Pagar' },
    { id: 'relatorios', label: 'Relatórios' },
  ];

  return (
    <PortalProvider companyId={selectedCompanyId}>
      <div className="min-h-screen bg-background flex notranslate" translate="no">
        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-0 z-40 h-screen transition-all duration-300 bg-card border-r ${
            sidebarOpen ? 'w-64' : 'w-16'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center justify-between px-4 border-b">
              {sidebarOpen && (
                <h1 className="text-lg font-bold text-foreground">Contas em Dia</h1>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="ml-auto"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {sidebarOpen && (
              <div className="p-4 border-b">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  <span className="notranslate" translate="no">Empresa</span>
                </label>
                <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
                  <SelectTrigger className="w-full notranslate" translate="no">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="notranslate" translate="no">
                    {Object.entries(COMPANIES).map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        <span className="notranslate" translate="no">{name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeMenu === item.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveMenu(item.id)}
                >
                  {sidebarOpen ? item.label : item.label.charAt(0)}
                </Button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-16'
          }`}
        >
          <header className="bg-card shadow-sm border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                Sistema de Controle Financeiro
              </h2>
              <div className="text-sm text-muted-foreground">
                <span className="notranslate" translate="no">{selectedCompanyName}</span>
              </div>
            </div>
          </header>

          <main className="p-6">
            <ErrorBoundary>
              <div key={selectedCompanyId}>
                {children}
              </div>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </PortalProvider>
  );
};
