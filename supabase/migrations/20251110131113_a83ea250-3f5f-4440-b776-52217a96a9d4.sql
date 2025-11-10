-- =====================================================
-- MIGRATION: Otimização do Dashboard e Correção de Somas
-- =====================================================

-- 1. CRIAR ÍNDICES PARA PERFORMANCE
-- -------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contas_empresa_vencimento
  ON public.contas (empresa, vencimento);

CREATE INDEX IF NOT EXISTS idx_contas_empresa_status
  ON public.contas (empresa, vencimento) 
  WHERE empresa IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pagamentos_conta_id
  ON public.pagamentos (conta_id);

-- 2. ATUALIZAR rpc_total_contas_do_dia
-- -------------------------------------------------
-- Regra: Somar SALDO (não valor_total) de contas com status Pendente ou Parcial
CREATE OR REPLACE FUNCTION public.rpc_total_contas_do_dia(p_empresa text, p_data date)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(SUM(saldo), 0)::numeric
  FROM contas_view
  WHERE empresa = p_empresa
    AND vencimento::date = p_data
    AND status IN ('Pendente', 'Parcial');
$function$;

-- 3. ATUALIZAR rpc_total_proxima_semana
-- -------------------------------------------------
-- Regra: Somar SALDO de contas com status Pendente ou Parcial
CREATE OR REPLACE FUNCTION public.rpc_total_proxima_semana(p_empresa text, p_data_inicio date, p_data_fim date)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(SUM(saldo), 0)::numeric
  FROM contas_view
  WHERE empresa = p_empresa
    AND vencimento::date >= p_data_inicio
    AND vencimento::date <= p_data_fim
    AND status IN ('Pendente', 'Parcial');
$function$;

-- 4. ATUALIZAR rpc_total_mes_atual
-- -------------------------------------------------
-- Regra: Somar SALDO de contas com status Pendente ou Parcial
CREATE OR REPLACE FUNCTION public.rpc_total_mes_atual(p_empresa text, p_data_inicio date, p_data_fim date)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(SUM(saldo), 0)::numeric
  FROM contas_view
  WHERE empresa = p_empresa
    AND vencimento::date >= p_data_inicio
    AND vencimento::date <= p_data_fim
    AND status IN ('Pendente', 'Parcial');
$function$;

-- 5. CRIAR rpc_dashboard_resumo
-- -------------------------------------------------
-- Retorna contadores de contas vencidas, pendentes e pagas no mês
CREATE OR REPLACE FUNCTION public.rpc_dashboard_resumo(
  p_empresa text, 
  p_hoje date,
  p_inicio_mes date,
  p_fim_mes date
)
RETURNS TABLE(
  contas_vencidas bigint,
  contas_pendentes bigint,
  contas_pagas_mes bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    -- Contas Vencidas: status Pendente/Parcial e vencimento < hoje
    (SELECT COUNT(*) 
     FROM contas_view 
     WHERE empresa = p_empresa 
       AND status IN ('Pendente', 'Parcial')
       AND vencimento::date < p_hoje
    ) as contas_vencidas,
    
    -- Contas Pendentes: status Pendente/Parcial e vencimento >= hoje
    (SELECT COUNT(*) 
     FROM contas_view 
     WHERE empresa = p_empresa 
       AND status IN ('Pendente', 'Parcial')
       AND vencimento::date >= p_hoje
    ) as contas_pendentes,
    
    -- Contas Pagas no Mês: status Pago e vencimento dentro do mês
    (SELECT COUNT(*) 
     FROM contas_view 
     WHERE empresa = p_empresa 
       AND status = 'Pago'
       AND vencimento::date >= p_inicio_mes
       AND vencimento::date <= p_fim_mes
    ) as contas_pagas_mes;
$function$;

-- 6. CRIAR rpc_contas_proximas
-- -------------------------------------------------
-- Retorna as próximas 5 contas a vencer (próximos 7 dias)
CREATE OR REPLACE FUNCTION public.rpc_contas_proximas(
  p_empresa text,
  p_hoje date
)
RETURNS TABLE(
  id uuid,
  descricao text,
  vencimento date,
  saldo numeric,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    id,
    descricao,
    vencimento,
    saldo,
    status
  FROM contas_view
  WHERE empresa = p_empresa
    AND status IN ('Pendente', 'Parcial')
    AND vencimento::date >= p_hoje
    AND vencimento::date <= (p_hoje + INTERVAL '7 days')::date
  ORDER BY vencimento ASC
  LIMIT 5;
$function$;

-- 7. COMENTÁRIO SOBRE CAMPO LEGADO
-- -------------------------------------------------
-- NOTA: O campo 'total_pago' na tabela 'contas' é LEGADO e não deve ser usado.
-- Toda a lógica oficial utiliza a tabela 'pagamentos' e a view 'contas_view' 
-- que calcula o saldo automaticamente.

COMMENT ON COLUMN public.contas.total_pago IS 
'CAMPO LEGADO - Não utilizar. Use contas_view.saldo para obter o valor em aberto.';