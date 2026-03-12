import { CardKpi } from '@/components/dashboard/CardKpi';
import { CompanySummaryCard } from '@/components/dashboard/CompanySummaryCard';
import { EmpresaResumo, useDashboardGeral } from '@/hooks/useDashboardGeral';
import { formatCurrency } from '@/lib/formatters';
import { useAppStore } from '@/store/appStore';

interface DashboardGeralPageProps {
  onNavigate?: (menu: string) => void;
}

export default function DashboardGeralPage({ onNavigate }: DashboardGeralPageProps) {
  const { data, isLoading } = useDashboardGeral();
  const setCompany = useAppStore((s) => s.setCompany);

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Carregando...</div>;
  }

  if (!data) {
    return <div className="p-6 text-muted-foreground">Nenhum dado disponivel.</div>;
  }

  const { grupo, por_empresa } = data;

  const handleViewDetails = (empresa: EmpresaResumo) => {
    if (!empresa.empresa_slug) return;
    setCompany(empresa.empresa_slug, empresa.empresa_nome);
    onNavigate?.('dashboard');
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-foreground">Visao Geral</h2>

      {/* BLOCO 1 — Consolidated Group KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardKpi
          titulo="Vencidas"
          valor={formatCurrency(Number(grupo.vencidas_valor))}
          subtitulo={`${grupo.vencidas_qtd} contas`}
          estado={Number(grupo.vencidas_qtd) > 0 ? 'critico' : 'normal'}
        />
        <CardKpi
          titulo="Semana Atual"
          valor={formatCurrency(Number(grupo.semana_valor))}
          subtitulo={`${grupo.semana_qtd} contas`}
          estado="alerta"
        />
        <CardKpi
          titulo="Total em Aberto"
          valor={formatCurrency(Number(grupo.aberto_valor))}
          subtitulo={`${grupo.aberto_qtd} contas`}
          estado="normal"
        />
        <CardKpi
          titulo="Pago no Mes"
          valor={formatCurrency(Number(grupo.pago_mes_valor))}
          subtitulo={`${grupo.pago_mes_qtd} contas`}
          estado="positivo"
        />
      </div>

      {/* BLOCO 2 — Per-Company Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {por_empresa.map((empresa) => (
          <CompanySummaryCard
            key={empresa.empresa_id}
            data={empresa}
            onViewDetails={
              empresa.empresa_slug
                ? () => handleViewDetails(empresa)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
