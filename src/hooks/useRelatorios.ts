import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FiltroBase {
  empresaId?: string | null;
  dataIni: string;
  dataFim: string;
}

export function useRelatorioFluxo(filtros: FiltroBase) {
  return useQuery({
    queryKey: ['relatorio-fluxo', filtros],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_relatorio_fluxo_periodo', {
        p_empresa_id: filtros.empresaId || null,
        p_data_ini: filtros.dataIni,
        p_data_fim: filtros.dataFim,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!filtros.dataIni && !!filtros.dataFim,
    staleTime: 1000 * 60,
  });
}

export function useRelatorioCategoria(filtros: FiltroBase) {
  return useQuery({
    queryKey: ['relatorio-categoria', filtros],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_relatorio_por_categoria', {
        p_empresa_id: filtros.empresaId || null,
        p_data_ini: filtros.dataIni,
        p_data_fim: filtros.dataFim,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!filtros.dataIni && !!filtros.dataFim,
    staleTime: 1000 * 60,
  });
}

export function useRelatorioFormaPagamento(filtros: FiltroBase) {
  return useQuery({
    queryKey: ['relatorio-forma-pagamento', filtros],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_relatorio_por_forma_pagamento', {
        p_empresa_id: filtros.empresaId || null,
        p_data_ini: filtros.dataIni,
        p_data_fim: filtros.dataFim,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!filtros.dataIni && !!filtros.dataFim,
    staleTime: 1000 * 60,
  });
}

interface FiltroFornecedor extends FiltroBase {
  fornecedor?: string;
}

export function useRelatorioFornecedor(filtros: FiltroFornecedor) {
  return useQuery({
    queryKey: ['relatorio-fornecedor', filtros],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_relatorio_fornecedor', {
        p_empresa_id: filtros.empresaId || null,
        p_fornecedor: filtros.fornecedor || null,
        p_data_ini: filtros.dataIni,
        p_data_fim: filtros.dataFim,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!filtros.dataIni && !!filtros.dataFim,
    staleTime: 1000 * 60,
  });
}
