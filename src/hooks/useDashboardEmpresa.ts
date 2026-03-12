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

export function useDashboardEmpresa(empresaId: string | null) {
  return useQuery({
    queryKey: ['dashboard-empresa', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_dashboard_individual', {
        p_empresa_id: empresaId!,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return normalizeDashboardEmpresa(row);
    },
    enabled: !!empresaId,
    staleTime: 1000 * 60,
  });
}
