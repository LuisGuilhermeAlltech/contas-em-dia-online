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

export interface EmpresaResumo {
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

const toNumber = (value: unknown): number => Number(value || 0);

const normalizeEmpresa = (row: Record<string, unknown>): EmpresaResumo => ({
  empresa_id: String(row.empresa_id || ''),
  empresa_nome: String(row.empresa_nome || ''),
  empresa_slug: String(row.empresa_slug || ''),
  vencidas_qtd: toNumber(row.vencidas_qtd),
  vencidas_valor: toNumber(row.vencidas_valor),
  semana_qtd: toNumber(row.semana_qtd),
  semana_valor: toNumber(row.semana_valor),
  mes_qtd: toNumber(row.mes_qtd),
  mes_valor: toNumber(row.mes_valor),
  aberto_qtd: toNumber(row.aberto_qtd),
  aberto_valor: toNumber(row.aberto_valor),
  pago_mes_qtd: toNumber(row.pago_mes_qtd),
  pago_mes_valor: toNumber(row.pago_mes_valor),
});

const normalizeDashboardGeral = (payload: unknown): DashboardGeralData => {
  const data = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const grupoRaw =
    data.grupo && typeof data.grupo === 'object'
      ? (data.grupo as Record<string, unknown>)
      : {};
  const porEmpresaRaw = Array.isArray(data.por_empresa) ? data.por_empresa : [];

  return {
    grupo: {
      vencidas_qtd: toNumber(grupoRaw.vencidas_qtd),
      vencidas_valor: toNumber(grupoRaw.vencidas_valor),
      semana_qtd: toNumber(grupoRaw.semana_qtd),
      semana_valor: toNumber(grupoRaw.semana_valor),
      aberto_qtd: toNumber(grupoRaw.aberto_qtd),
      aberto_valor: toNumber(grupoRaw.aberto_valor),
      pago_mes_qtd: toNumber(grupoRaw.pago_mes_qtd),
      pago_mes_valor: toNumber(grupoRaw.pago_mes_valor),
    },
    por_empresa: porEmpresaRaw
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map(normalizeEmpresa),
  };
};

export function useDashboardGeral() {
  return useQuery({
    queryKey: ['dashboard-geral'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_dashboard_geral');
      if (error) throw error;
      return normalizeDashboardGeral(data);
    },
    staleTime: 1000 * 60,
  });
}
