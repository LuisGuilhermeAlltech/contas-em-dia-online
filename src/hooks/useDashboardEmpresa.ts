import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardEmpresaData {
  total_hoje: number;
  total_semana_atual: number;
  total_mes_atual: number;
  contas_vencidas_qtd: number;
  contas_vencidas_valor: number;
  contas_pendentes_qtd: number;
  contas_pendentes_valor: number;
  pagas_mes_qtd: number;
  pagas_mes_valor: number;
}

const toNumber = (value: unknown): number => Number(value || 0);
const EMPTY_DASHBOARD: DashboardEmpresaData = {
  total_hoje: 0,
  total_semana_atual: 0,
  total_mes_atual: 0,
  contas_vencidas_qtd: 0,
  contas_vencidas_valor: 0,
  contas_pendentes_qtd: 0,
  contas_pendentes_valor: 0,
  pagas_mes_qtd: 0,
  pagas_mes_valor: 0,
};

const normalizeDashboardEmpresa = (payload: unknown): DashboardEmpresaData => {
  const row = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;

  return {
    total_hoje: toNumber(row.total_hoje),
    total_semana_atual: toNumber(row.total_semana_atual),
    total_mes_atual: toNumber(row.total_mes_atual),
    contas_vencidas_qtd: toNumber(row.contas_vencidas_qtd),
    contas_vencidas_valor: toNumber(row.contas_vencidas_valor),
    contas_pendentes_qtd: toNumber(row.contas_pendentes_qtd),
    contas_pendentes_valor: toNumber(row.contas_pendentes_valor),
    pagas_mes_qtd: toNumber(row.pagas_mes_qtd),
    pagas_mes_valor: toNumber(row.pagas_mes_valor),
  };
};

const sumDashboardData = (
  acc: DashboardEmpresaData,
  row: DashboardEmpresaData
): DashboardEmpresaData => ({
  total_hoje: acc.total_hoje + row.total_hoje,
  total_semana_atual: acc.total_semana_atual + row.total_semana_atual,
  total_mes_atual: acc.total_mes_atual + row.total_mes_atual,
  contas_vencidas_qtd: acc.contas_vencidas_qtd + row.contas_vencidas_qtd,
  contas_vencidas_valor: acc.contas_vencidas_valor + row.contas_vencidas_valor,
  contas_pendentes_qtd: acc.contas_pendentes_qtd + row.contas_pendentes_qtd,
  contas_pendentes_valor: acc.contas_pendentes_valor + row.contas_pendentes_valor,
  pagas_mes_qtd: acc.pagas_mes_qtd + row.pagas_mes_qtd,
  pagas_mes_valor: acc.pagas_mes_valor + row.pagas_mes_valor,
});

async function fetchDashboardForEmpresa(empresaId: string): Promise<DashboardEmpresaData> {
  const { data, error } = await supabase.rpc('fn_dashboard_individual', {
    p_empresa_id: empresaId,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return normalizeDashboardEmpresa(row);
}

export function useDashboardEmpresa(empresaIds: string[]) {
  return useQuery({
    queryKey: ['dashboard-empresa', empresaIds],
    queryFn: async () => {
      if (!empresaIds.length) return EMPTY_DASHBOARD;

      if (empresaIds.length === 1) {
        return fetchDashboardForEmpresa(empresaIds[0]);
      }

      const dashboards = await Promise.all(
        empresaIds.map((empresaId) => fetchDashboardForEmpresa(empresaId))
      );

      return dashboards.reduce(sumDashboardData, EMPTY_DASHBOARD);
    },
    enabled: empresaIds.length > 0,
    staleTime: 1000 * 60,
  });
}
