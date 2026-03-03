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

export function useDashboardEmpresa(empresaId: string | null) {
  return useQuery({
    queryKey: ['dashboard-empresa', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_dashboard_individual', {
        p_empresa_id: empresaId!,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as DashboardEmpresaData;
    },
    enabled: !!empresaId,
    staleTime: 1000 * 60,
  });
}
