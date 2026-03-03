
-- ================================================
-- FASE 1: TABELAS + MIGRAÇÃO + RPCs
-- ================================================

-- 1. TABELA EMPRESAS
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_empresas" ON public.empresas FOR ALL USING (true) WITH CHECK (true);

-- Inserir empresas a partir dos dados existentes
INSERT INTO public.empresas (nome, slug)
SELECT DISTINCT empresa, lower(replace(replace(replace(empresa, ' ', '-'), 'í', 'i'), 'Í', 'I'))
FROM public.contas
WHERE empresa IS NOT NULL AND empresa != ''
ON CONFLICT (slug) DO NOTHING;

-- 2. TABELA CATEGORIAS_CONTA
CREATE TABLE IF NOT EXISTS public.categorias_conta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  empresa_id uuid NULL REFERENCES public.empresas(id) ON DELETE SET NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.categorias_conta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_categorias" ON public.categorias_conta FOR ALL USING (true) WITH CHECK (true);

-- 3. ALTERAR CONTAS: adicionar novas colunas
ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.categorias_conta(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_custo text,
  ADD COLUMN IF NOT EXISTS tipo_conta text DEFAULT 'variavel',
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS data_pagamento date,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. MIGRAR empresa (text) → empresa_id (uuid)
UPDATE public.contas c
SET empresa_id = e.id
FROM public.empresas e
WHERE c.empresa = e.nome
  AND c.empresa_id IS NULL;

-- 5. POPULAR status a partir de pagamentos existentes
UPDATE public.contas
SET status = CASE
  WHEN COALESCE(total_pago, 0) >= valor_total THEN 'paga'
  ELSE 'pendente'
END;

-- 6. POPULAR data_pagamento a partir da tabela pagamentos
UPDATE public.contas c
SET data_pagamento = sub.ultima_data
FROM (
  SELECT conta_id, MAX(data) AS ultima_data
  FROM public.pagamentos
  GROUP BY conta_id
) sub
WHERE c.id = sub.conta_id
  AND c.data_pagamento IS NULL;

-- 7. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_contas_empresa_id ON public.contas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_status ON public.contas(status);
CREATE INDEX IF NOT EXISTS idx_contas_vencimento ON public.contas(vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_data_pagamento ON public.contas(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_contas_categoria_id ON public.contas(categoria_id);

-- 8. TRIGGER updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contas_updated_at ON public.contas;
CREATE TRIGGER trg_contas_updated_at
  BEFORE UPDATE ON public.contas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 9. TRIGGER sync status/data_pagamento quando pagamentos mudam
CREATE OR REPLACE FUNCTION public.sync_conta_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_pago numeric;
  v_valor_total numeric;
  v_conta_id uuid;
BEGIN
  v_conta_id := COALESCE(NEW.conta_id, OLD.conta_id);

  SELECT COALESCE(SUM(valor), 0) INTO v_total_pago
  FROM public.pagamentos WHERE conta_id = v_conta_id;

  SELECT valor_total INTO v_valor_total
  FROM public.contas WHERE id = v_conta_id;

  UPDATE public.contas
  SET
    total_pago = v_total_pago,
    status = CASE WHEN v_total_pago >= v_valor_total THEN 'paga' ELSE 'pendente' END,
    data_pagamento = (SELECT MAX(data) FROM public.pagamentos WHERE conta_id = v_conta_id)
  WHERE id = v_conta_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_status_insert ON public.pagamentos;
CREATE TRIGGER trg_sync_status_insert
  AFTER INSERT ON public.pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_conta_status();

DROP TRIGGER IF EXISTS trg_sync_status_delete ON public.pagamentos;
CREATE TRIGGER trg_sync_status_delete
  AFTER DELETE ON public.pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_conta_status();

DROP TRIGGER IF EXISTS trg_sync_status_update ON public.pagamentos;
CREATE TRIGGER trg_sync_status_update
  AFTER UPDATE ON public.pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_conta_status();

-- 10. fn_week_bounds
CREATE OR REPLACE FUNCTION public.fn_week_bounds(ref_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(week_start date, week_end date)
LANGUAGE sql STABLE
AS $$
  SELECT
    (date_trunc('week', ref_date::timestamp))::date AS week_start,
    (date_trunc('week', ref_date::timestamp) + INTERVAL '6 days')::date AS week_end;
$$;

-- 11. fn_dashboard_individual
CREATE OR REPLACE FUNCTION public.fn_dashboard_individual(p_empresa_id uuid)
RETURNS TABLE(
  total_hoje numeric,
  total_semana_atual numeric,
  total_mes_atual numeric,
  contas_vencidas_qtd bigint,
  contas_vencidas_valor numeric,
  contas_pendentes_qtd bigint,
  contas_pendentes_valor numeric,
  pagas_mes_qtd bigint,
  pagas_mes_valor numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH ws AS (SELECT * FROM fn_week_bounds()),
       mes AS (
         SELECT
           date_trunc('month', CURRENT_DATE)::date AS ini,
           (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date AS fim
       )
  SELECT
    (SELECT COALESCE(SUM(valor_total - COALESCE(total_pago,0)), 0)
     FROM contas WHERE empresa_id = p_empresa_id AND status = 'pendente' AND vencimento = CURRENT_DATE AND deleted_at IS NULL),

    (SELECT COALESCE(SUM(valor_total - COALESCE(total_pago,0)), 0)
     FROM contas c CROSS JOIN ws
     WHERE c.empresa_id = p_empresa_id AND c.status = 'pendente'
       AND c.vencimento BETWEEN ws.week_start AND ws.week_end AND c.deleted_at IS NULL),

    (SELECT COALESCE(SUM(valor_total - COALESCE(total_pago,0)), 0)
     FROM contas c CROSS JOIN mes
     WHERE c.empresa_id = p_empresa_id AND c.status = 'pendente'
       AND c.vencimento BETWEEN mes.ini AND mes.fim AND c.deleted_at IS NULL),

    (SELECT COUNT(*) FROM contas
     WHERE empresa_id = p_empresa_id AND status = 'pendente' AND vencimento < CURRENT_DATE AND deleted_at IS NULL),

    (SELECT COALESCE(SUM(valor_total - COALESCE(total_pago,0)), 0) FROM contas
     WHERE empresa_id = p_empresa_id AND status = 'pendente' AND vencimento < CURRENT_DATE AND deleted_at IS NULL),

    (SELECT COUNT(*) FROM contas
     WHERE empresa_id = p_empresa_id AND status = 'pendente' AND deleted_at IS NULL),

    (SELECT COALESCE(SUM(valor_total - COALESCE(total_pago,0)), 0) FROM contas
     WHERE empresa_id = p_empresa_id AND status = 'pendente' AND deleted_at IS NULL),

    (SELECT COUNT(*) FROM contas c CROSS JOIN mes
     WHERE c.empresa_id = p_empresa_id AND c.status = 'paga'
       AND c.data_pagamento BETWEEN mes.ini AND mes.fim AND c.deleted_at IS NULL),

    (SELECT COALESCE(SUM(valor_total), 0) FROM contas c CROSS JOIN mes
     WHERE c.empresa_id = p_empresa_id AND c.status = 'paga'
       AND c.data_pagamento BETWEEN mes.ini AND mes.fim AND c.deleted_at IS NULL);
$$;

-- 12. fn_dashboard_geral
CREATE OR REPLACE FUNCTION public.fn_dashboard_geral()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_ws record;
  v_ini_mes date;
  v_fim_mes date;
BEGIN
  SELECT * INTO v_ws FROM fn_week_bounds();
  v_ini_mes := date_trunc('month', CURRENT_DATE)::date;
  v_fim_mes := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date;

  SELECT json_build_object(
    'alertas', (
      SELECT json_build_object(
        'vencidas_qtd', COUNT(*) FILTER (WHERE vencimento < CURRENT_DATE),
        'vencidas_valor', COALESCE(SUM(valor_total - COALESCE(total_pago,0)) FILTER (WHERE vencimento < CURRENT_DATE), 0),
        'vence_hoje_qtd', COUNT(*) FILTER (WHERE vencimento = CURRENT_DATE),
        'vence_hoje_valor', COALESCE(SUM(valor_total - COALESCE(total_pago,0)) FILTER (WHERE vencimento = CURRENT_DATE), 0),
        'vence_3dias_qtd', COUNT(*) FILTER (WHERE vencimento BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 3),
        'vence_3dias_valor', COALESCE(SUM(valor_total - COALESCE(total_pago,0)) FILTER (WHERE vencimento BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 3), 0),
        'vence_semana_qtd', COUNT(*) FILTER (WHERE vencimento BETWEEN v_ws.week_start AND v_ws.week_end),
        'vence_semana_valor', COALESCE(SUM(valor_total - COALESCE(total_pago,0)) FILTER (WHERE vencimento BETWEEN v_ws.week_start AND v_ws.week_end), 0),
        'total_aberto_valor', COALESCE(SUM(valor_total - COALESCE(total_pago,0)), 0),
        'pago_mes_qtd', (SELECT COUNT(*) FROM contas WHERE status = 'paga' AND data_pagamento BETWEEN v_ini_mes AND v_fim_mes AND deleted_at IS NULL),
        'pago_mes_valor', (SELECT COALESCE(SUM(valor_total), 0) FROM contas WHERE status = 'paga' AND data_pagamento BETWEEN v_ini_mes AND v_fim_mes AND deleted_at IS NULL)
      )
      FROM contas WHERE status = 'pendente' AND deleted_at IS NULL
    ),
    'por_empresa', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT
          e.id AS empresa_id,
          e.nome AS empresa_nome,
          COUNT(*) FILTER (WHERE c.vencimento < CURRENT_DATE) AS vencidas_qtd,
          COALESCE(SUM(c.valor_total - COALESCE(c.total_pago,0)) FILTER (WHERE c.vencimento < CURRENT_DATE), 0) AS vencidas_valor,
          COALESCE(SUM(c.valor_total - COALESCE(c.total_pago,0)) FILTER (WHERE c.vencimento BETWEEN v_ws.week_start AND v_ws.week_end), 0) AS semana_valor,
          COALESCE(SUM(c.valor_total - COALESCE(c.total_pago,0)) FILTER (WHERE c.vencimento BETWEEN v_ini_mes AND v_fim_mes), 0) AS mes_valor,
          COALESCE(SUM(c.valor_total - COALESCE(c.total_pago,0)), 0) AS aberto_valor
        FROM empresas e
        LEFT JOIN contas c ON c.empresa_id = e.id AND c.status = 'pendente' AND c.deleted_at IS NULL
        WHERE e.ativo = true
        GROUP BY e.id, e.nome
        ORDER BY e.nome
      ) t
    ),
    'distribuicao_temporal', (
      SELECT json_build_object(
        'hoje', COALESCE(SUM(valor_total - COALESCE(total_pago,0)) FILTER (WHERE vencimento = CURRENT_DATE), 0),
        'd3', COALESCE(SUM(valor_total - COALESCE(total_pago,0)) FILTER (WHERE vencimento BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 3), 0),
        'd7', COALESCE(SUM(valor_total - COALESCE(total_pago,0)) FILTER (WHERE vencimento BETWEEN CURRENT_DATE + 4 AND CURRENT_DATE + 7), 0),
        'd15', COALESCE(SUM(valor_total - COALESCE(total_pago,0)) FILTER (WHERE vencimento BETWEEN CURRENT_DATE + 8 AND CURRENT_DATE + 15), 0),
        'd30', COALESCE(SUM(valor_total - COALESCE(total_pago,0)) FILTER (WHERE vencimento BETWEEN CURRENT_DATE + 16 AND CURRENT_DATE + 30), 0)
      )
      FROM contas WHERE status = 'pendente' AND deleted_at IS NULL
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 13. fn_relatorio_fluxo_periodo
CREATE OR REPLACE FUNCTION public.fn_relatorio_fluxo_periodo(
  p_empresa_id uuid DEFAULT NULL,
  p_data_ini date DEFAULT CURRENT_DATE - 30,
  p_data_fim date DEFAULT CURRENT_DATE
)
RETURNS TABLE(dia date, pago_valor numeric, aberto_valor numeric, vencido_valor numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH dias AS (
    SELECT generate_series(p_data_ini, p_data_fim, '1 day'::interval)::date AS dia
  )
  SELECT
    d.dia,
    COALESCE(SUM(c.valor_total) FILTER (WHERE c.status = 'paga' AND c.data_pagamento = d.dia), 0) AS pago_valor,
    COALESCE(SUM(c.valor_total - COALESCE(c.total_pago,0)) FILTER (WHERE c.status = 'pendente' AND c.vencimento = d.dia), 0) AS aberto_valor,
    COALESCE(SUM(c.valor_total - COALESCE(c.total_pago,0)) FILTER (WHERE c.status = 'pendente' AND c.vencimento = d.dia AND d.dia < CURRENT_DATE), 0) AS vencido_valor
  FROM dias d
  LEFT JOIN contas c ON (
    (c.data_pagamento = d.dia AND c.status = 'paga')
    OR (c.vencimento = d.dia AND c.status = 'pendente')
  ) AND c.deleted_at IS NULL
    AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
  GROUP BY d.dia
  ORDER BY d.dia;
$$;

-- 14. fn_relatorio_por_categoria
CREATE OR REPLACE FUNCTION public.fn_relatorio_por_categoria(
  p_empresa_id uuid DEFAULT NULL,
  p_data_ini date DEFAULT CURRENT_DATE - 30,
  p_data_fim date DEFAULT CURRENT_DATE
)
RETURNS TABLE(categoria_nome text, total_valor numeric, total_qtd bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(cat.nome, 'Sem categoria') AS categoria_nome,
    COALESCE(SUM(c.valor_total), 0) AS total_valor,
    COUNT(*) AS total_qtd
  FROM contas c
  LEFT JOIN categorias_conta cat ON cat.id = c.categoria_id
  WHERE c.deleted_at IS NULL
    AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
    AND c.vencimento BETWEEN p_data_ini AND p_data_fim
  GROUP BY cat.nome
  ORDER BY total_valor DESC;
$$;

-- 15. fn_relatorio_por_forma_pagamento
CREATE OR REPLACE FUNCTION public.fn_relatorio_por_forma_pagamento(
  p_empresa_id uuid DEFAULT NULL,
  p_data_ini date DEFAULT CURRENT_DATE - 30,
  p_data_fim date DEFAULT CURRENT_DATE
)
RETURNS TABLE(forma_pagamento text, total_valor numeric, total_qtd bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(c.forma_pagamento, 'Nao informado') AS forma_pagamento,
    COALESCE(SUM(c.valor_total), 0) AS total_valor,
    COUNT(*) AS total_qtd
  FROM contas c
  WHERE c.deleted_at IS NULL
    AND c.status = 'paga'
    AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
    AND c.data_pagamento BETWEEN p_data_ini AND p_data_fim
  GROUP BY c.forma_pagamento
  ORDER BY total_valor DESC;
$$;

-- 16. fn_relatorio_fornecedor
CREATE OR REPLACE FUNCTION public.fn_relatorio_fornecedor(
  p_empresa_id uuid DEFAULT NULL,
  p_fornecedor text DEFAULT NULL,
  p_data_ini date DEFAULT CURRENT_DATE - 365,
  p_data_fim date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  fornecedor text,
  total_valor numeric,
  total_qtd bigint,
  media_mensal numeric,
  ultimo_pagamento date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH meses AS (
    SELECT GREATEST(
      EXTRACT(MONTH FROM age(p_data_fim, p_data_ini)) +
      EXTRACT(YEAR FROM age(p_data_fim, p_data_ini)) * 12,
      1
    ) AS qtd_meses
  )
  SELECT
    COALESCE(f.nome, 'Sem fornecedor') AS fornecedor,
    COALESCE(SUM(c.valor_total), 0) AS total_valor,
    COUNT(*) AS total_qtd,
    ROUND(COALESCE(SUM(c.valor_total), 0) / m.qtd_meses, 2) AS media_mensal,
    MAX(c.data_pagamento) AS ultimo_pagamento
  FROM contas c
  LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
  CROSS JOIN meses m
  WHERE c.deleted_at IS NULL
    AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
    AND c.vencimento BETWEEN p_data_ini AND p_data_fim
    AND (p_fornecedor IS NULL OR f.nome ILIKE '%' || p_fornecedor || '%')
  GROUP BY f.nome, m.qtd_meses
  ORDER BY total_valor DESC;
$$;
