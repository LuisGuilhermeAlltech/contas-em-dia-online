
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import DashboardPage from "./DashboardPage";
import ContasAPagarPage from "./ContasAPagarPage";
import RelatoriosPage from "./RelatoriosPage";

const Index = () => {
  const [activeMenu, setActiveMenu] = useState("dashboard");

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return <DashboardPage />;
      case "contas":
        return <ContasAPagarPage />;
      case "relatorios":
        return <RelatoriosPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <AppShell activeMenu={activeMenu} setActiveMenu={setActiveMenu}>
      {renderContent()}
    </AppShell>
  );
};

export default Index;
