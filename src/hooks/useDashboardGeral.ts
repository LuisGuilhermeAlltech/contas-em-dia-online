import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GrupoKpis {
  vencidas_qtd: number;
  vencidas_valor: number;
  semana_qtd: number;
  semana_valor: number;
  aberto_qtd: number;
  aberto_valor: number;
  pago_mes_qtd: number;
  pago_mes_valor: number;
}

interface EmpresaResumo {
  empresa_id: string;
  empresa_nome: string;
  empresa_slug: string;
  vencidas_qtd: number;
  vencidas_valor: number;
  semana_qtd: number;
  semana_valor: number;
  mes_qtd: number;
  mes_valor: number;
  aberto_qtd: number;
  aberto_valor: number;
  pago_mes_qtd: number;
  pago_mes_valor: number;
}

export interface DashboardGeralData {
  grupo: GrupoKpis;
  por_empresa: EmpresaResumo[];
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
