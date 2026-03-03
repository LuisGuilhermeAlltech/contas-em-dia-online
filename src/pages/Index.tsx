import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import DashboardGeralPage from "./DashboardGeralPage";
import DashboardPage from "./DashboardPage";
import ContasAPagarPage from "./ContasAPagarPage";
import RelatoriosPage from "./RelatoriosPage";

const Index = () => {
  const [activeMenu, setActiveMenu] = useState("dashboard-geral");

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard-geral":
        return <DashboardGeralPage />;
      case "dashboard":
        return <DashboardPage />;
      case "contas":
        return <ContasAPagarPage />;
      case "relatorios":
        return <RelatoriosPage />;
      default:
        return <DashboardGeralPage />;
    }
  };

  return (
    <AppShell activeMenu={activeMenu} setActiveMenu={setActiveMenu}>
      {renderContent()}
    </AppShell>
  );
};

export default Index;
