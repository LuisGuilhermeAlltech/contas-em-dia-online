import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

interface FiltroBase {
  empresaIds: string[];
  dataIni: string;
  dataFim: string;
}

interface FiltroFornecedor extends FiltroBase {
  fornecedor?: string;
}

export type RelatorioFluxoRow =
  Database['public']['Functions']['fn_relatorio_fluxo_periodo']['Returns'][number];
export type RelatorioCategoriaRow =
  Database['public']['Functions']['fn_relatorio_por_categoria']['Returns'][number];
export type RelatorioFormaPagamentoRow =
  Database['public']['Functions']['fn_relatorio_por_forma_pagamento']['Returns'][number];
export type RelatorioFornecedorRow =
  Database['public']['Functions']['fn_relatorio_fornecedor']['Returns'][number];

const toNumber = (value: unknown) => Number(value || 0);

const normalizeEmpresaIds = (empresaIds: string[]) =>
  Array.from(new Set((empresaIds || []).filter(Boolean)));

const getMonthSpan = (dataIni: string, dataFim: string) => {
  const ini = new Date(`${dataIni}T00:00:00`);
  const fim = new Date(`${dataFim}T00:00:00`);

  if (Number.isNaN(ini.getTime()) || Number.isNaN(fim.getTime())) return 1;

  const months =
    (fim.getFullYear() - ini.getFullYear()) * 12 +
    (fim.getMonth() - ini.getMonth()) +
    1;

  return Math.max(months, 1);
};

async function fetchFluxoByEmpresa(
  empresaId: string,
  dataIni: string,
  dataFim: string
): Promise<RelatorioFluxoRow[]> {
  const { data, error } = await supabase.rpc('fn_relatorio_fluxo_periodo', {
    p_empresa_id: empresaId,
    p_data_ini: dataIni,
    p_data_fim: dataFim,
  });
  if (error) throw error;
  return data || [];
}

async function fetchCategoriaByEmpresa(
  empresaId: string,
  dataIni: string,
  dataFim: string
): Promise<RelatorioCategoriaRow[]> {
  const { data, error } = await supabase.rpc('fn_relatorio_por_categoria', {
    p_empresa_id: empresaId,
    p_data_ini: dataIni,
    p_data_fim: dataFim,
  });
  if (error) throw error;
  return data || [];
}

async function fetchFormaPagamentoByEmpresa(
  empresaId: string,
  dataIni: string,
  dataFim: string
): Promise<RelatorioFormaPagamentoRow[]> {
  const { data, error } = await supabase.rpc('fn_relatorio_por_forma_pagamento', {
    p_empresa_id: empresaId,
    p_data_ini: dataIni,
    p_data_fim: dataFim,
  });
  if (error) throw error;
  return data || [];
}

async function fetchFornecedorByEmpresa(
  empresaId: string,
  dataIni: string,
  dataFim: string,
  fornecedor?: string
): Promise<RelatorioFornecedorRow[]> {
  const { data, error } = await supabase.rpc('fn_relatorio_fornecedor', {
    p_empresa_id: empresaId,
    p_fornecedor: fornecedor || null,
    p_data_ini: dataIni,
    p_data_fim: dataFim,
  });
  if (error) throw error;
  return data || [];
}

export function useRelatorioFluxo(filtros: FiltroBase) {
  return useQuery<RelatorioFluxoRow[]>({
    queryKey: ['relatorio-fluxo', filtros],
    queryFn: async () => {
      const empresaIds = normalizeEmpresaIds(filtros.empresaIds);
      if (!empresaIds.length) return [];

      const rawRows = (
        await Promise.all(
          empresaIds.map((empresaId) =>
            fetchFluxoByEmpresa(empresaId, filtros.dataIni, filtros.dataFim)
          )
        )
      ).flat();

      const merged = new Map<string, RelatorioFluxoRow>();

      rawRows.forEach((row) => {
        const key = row.dia;
        const previous = merged.get(key);

        if (!previous) {
          merged.set(key, {
            dia: row.dia,
            pago_valor: toNumber(row.pago_valor),
            aberto_valor: toNumber(row.aberto_valor),
            vencido_valor: toNumber(row.vencido_valor),
          });
          return;
        }

        merged.set(key, {
          dia: key,
          pago_valor: toNumber(previous.pago_valor) + toNumber(row.pago_valor),
          aberto_valor: toNumber(previous.aberto_valor) + toNumber(row.aberto_valor),
          vencido_valor: toNumber(previous.vencido_valor) + toNumber(row.vencido_valor),
        });
      });

      return Array.from(merged.values()).sort((a, b) => a.dia.localeCompare(b.dia));
    },
    enabled:
      !!filtros.dataIni &&
      !!filtros.dataFim &&
      normalizeEmpresaIds(filtros.empresaIds).length > 0,
    staleTime: 1000 * 60,
  });
}

export function useRelatorioCategoria(filtros: FiltroBase) {
  return useQuery<RelatorioCategoriaRow[]>({
    queryKey: ['relatorio-categoria', filtros],
    queryFn: async () => {
      const empresaIds = normalizeEmpresaIds(filtros.empresaIds);
      if (!empresaIds.length) return [];

      const rawRows = (
        await Promise.all(
          empresaIds.map((empresaId) =>
            fetchCategoriaByEmpresa(empresaId, filtros.dataIni, filtros.dataFim)
          )
        )
      ).flat();

      const merged = new Map<string, RelatorioCategoriaRow>();

      rawRows.forEach((row) => {
        const key = row.categoria_nome || 'Sem categoria';
        const previous = merged.get(key);

        if (!previous) {
          merged.set(key, {
            categoria_nome: key,
            total_qtd: toNumber(row.total_qtd),
            total_valor: toNumber(row.total_valor),
          });
          return;
        }

        merged.set(key, {
          categoria_nome: key,
          total_qtd: toNumber(previous.total_qtd) + toNumber(row.total_qtd),
          total_valor: toNumber(previous.total_valor) + toNumber(row.total_valor),
        });
      });

      return Array.from(merged.values()).sort(
        (a, b) => toNumber(b.total_valor) - toNumber(a.total_valor)
      );
    },
    enabled:
      !!filtros.dataIni &&
      !!filtros.dataFim &&
      normalizeEmpresaIds(filtros.empresaIds).length > 0,
    staleTime: 1000 * 60,
  });
}

export function useRelatorioFormaPagamento(filtros: FiltroBase) {
  return useQuery<RelatorioFormaPagamentoRow[]>({
    queryKey: ['relatorio-forma-pagamento', filtros],
    queryFn: async () => {
      const empresaIds = normalizeEmpresaIds(filtros.empresaIds);
      if (!empresaIds.length) return [];

      const rawRows = (
        await Promise.all(
          empresaIds.map((empresaId) =>
            fetchFormaPagamentoByEmpresa(empresaId, filtros.dataIni, filtros.dataFim)
          )
        )
      ).flat();

      const merged = new Map<string, RelatorioFormaPagamentoRow>();

      rawRows.forEach((row) => {
        const key = row.forma_pagamento || 'Não informado';
        const previous = merged.get(key);

        if (!previous) {
          merged.set(key, {
            forma_pagamento: key,
            total_qtd: toNumber(row.total_qtd),
            total_valor: toNumber(row.total_valor),
          });
          return;
        }

        merged.set(key, {
          forma_pagamento: key,
          total_qtd: toNumber(previous.total_qtd) + toNumber(row.total_qtd),
          total_valor: toNumber(previous.total_valor) + toNumber(row.total_valor),
        });
      });

      return Array.from(merged.values()).sort(
        (a, b) => toNumber(b.total_valor) - toNumber(a.total_valor)
      );
    },
    enabled:
      !!filtros.dataIni &&
      !!filtros.dataFim &&
      normalizeEmpresaIds(filtros.empresaIds).length > 0,
    staleTime: 1000 * 60,
  });
}

export function useRelatorioFornecedor(filtros: FiltroFornecedor) {
  return useQuery<RelatorioFornecedorRow[]>({
    queryKey: ['relatorio-fornecedor', filtros],
    queryFn: async () => {
      const empresaIds = normalizeEmpresaIds(filtros.empresaIds);
      if (!empresaIds.length) return [];

      const rawRows = (
        await Promise.all(
          empresaIds.map((empresaId) =>
            fetchFornecedorByEmpresa(
              empresaId,
              filtros.dataIni,
              filtros.dataFim,
              filtros.fornecedor
            )
          )
        )
      ).flat();

      const merged = new Map<string, RelatorioFornecedorRow>();
      const monthSpan = getMonthSpan(filtros.dataIni, filtros.dataFim);

      rawRows.forEach((row) => {
        const key = row.fornecedor || 'Não informado';
        const previous = merged.get(key);

        if (!previous) {
          merged.set(key, {
            fornecedor: key,
            total_qtd: toNumber(row.total_qtd),
            total_valor: toNumber(row.total_valor),
            media_mensal: toNumber(row.total_valor) / monthSpan,
            ultimo_pagamento: row.ultimo_pagamento,
          });
          return;
        }

        const totalValor = toNumber(previous.total_valor) + toNumber(row.total_valor);
        const rowUltimo = row.ultimo_pagamento || '';
        const prevUltimo = previous.ultimo_pagamento || '';
        const ultimoPagamento = rowUltimo > prevUltimo ? row.ultimo_pagamento : previous.ultimo_pagamento;

        merged.set(key, {
          fornecedor: key,
          total_qtd: toNumber(previous.total_qtd) + toNumber(row.total_qtd),
          total_valor: totalValor,
          media_mensal: totalValor / monthSpan,
          ultimo_pagamento: ultimoPagamento,
        });
      });

      return Array.from(merged.values()).sort(
        (a, b) => toNumber(b.total_valor) - toNumber(a.total_valor)
      );
    },
    enabled:
      !!filtros.dataIni &&
      !!filtros.dataFim &&
      normalizeEmpresaIds(filtros.empresaIds).length > 0,
    staleTime: 1000 * 60,
  });
}
