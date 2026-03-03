import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Alertas {
  vencidas_qtd: number;
  vencidas_valor: number;
  vence_hoje_qtd: number;
  vence_hoje_valor: number;
  vence_3dias_qtd: number;
  vence_3dias_valor: number;
  vence_semana_qtd: number;
  vence_semana_valor: number;
  total_aberto_valor: number;
  pago_mes_qtd: number;
  pago_mes_valor: number;
}

interface EmpresaResumo {
  empresa_id: string;
  empresa_nome: string;
  vencidas_qtd: number;
  vencidas_valor: number;
  semana_valor: number;
  mes_valor: number;
  aberto_valor: number;
}

interface DistribuicaoTemporal {
  hoje: number;
  d3: number;
  d7: number;
  d15: number;
  d30: number;
}

export interface DashboardGeralData {
  alertas: Alertas;
  por_empresa: EmpresaResumo[];
  distribuicao_temporal: DistribuicaoTemporal;
}

export function useDashboardGeral() {
  return useQuery({
    queryKey: ['dashboard-geral'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_dashboard_geral');
      if (error) throw error;
      return data as unknown as DashboardGeralData;
    },
    staleTime: 1000 * 60,
  });
}
