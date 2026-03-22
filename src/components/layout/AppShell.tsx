import { useEffect, useMemo, useState, ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/appStore';
import { useEmpresas } from '@/hooks/useEmpresas';
import { PortalProvider } from '@/components/providers/PortalProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useOffline } from '@/hooks/useOffline';

interface AppShellProps {
  children: ReactNode;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
}

export const AppShell = ({ children, activeMenu, setActiveMenu }: AppShellProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { selectedCompanyId, selectedCompanyName, setCompany } = useAppStore();
  const { data: empresas = [] } = useEmpresas();
  const { isOnline } = useOffline();

  const companyOptions = useMemo(
    () =>
      empresas
        .filter((empresa) => !!empresa.slug)
        .map((empresa) => ({
          id: empresa.slug!,
          name: empresa.nome,
        })),
    [empresas]
  );

  const selectedCompany = companyOptions.find((company) => company.id === selectedCompanyId);

  const handleCompanyChange = (value: string) => {
    const company = companyOptions.find((item) => item.id === value);
    if (!company) return;
    setCompany(company.id, company.name);
  };

  useEffect(() => {
    if (!companyOptions.length) return;

    if (!selectedCompany) {
      const firstCompany = companyOptions[0];
      setCompany(firstCompany.id, firstCompany.name);
      return;
    }

    if (selectedCompany.name !== selectedCompanyName) {
      setCompany(selectedCompany.id, selectedCompany.name);
    }
  }, [companyOptions, selectedCompany, selectedCompanyName, setCompany]);

  const menuItems = [
    { id: 'dashboard-geral', label: 'Visao Geral' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'contas', label: 'Contas a Pagar' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'relatorios', label: 'Relatorios' },
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
                <Select value={selectedCompany?.id} onValueChange={handleCompanyChange}>
                  <SelectTrigger className="w-full notranslate" translate="no">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="notranslate" translate="no">
                    {companyOptions.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        <span className="notranslate" translate="no">{company.name}</span>
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
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span
                  className={`inline-flex h-7 items-center rounded-full px-2 text-xs font-medium ${
                    isOnline
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <span className="notranslate" translate="no">
                  {selectedCompany?.name || selectedCompanyName || 'Sem empresa selecionada'}
                </span>
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
