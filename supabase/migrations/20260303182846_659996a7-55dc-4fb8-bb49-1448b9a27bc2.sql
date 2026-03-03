
CREATE OR REPLACE FUNCTION public.fn_dashboard_geral()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'grupo', (
      SELECT json_build_object(
        'vencidas_qtd', COUNT(*) FILTER (WHERE vencimento < CURRENT_DATE),
        'vencidas_valor', COALESCE(SUM(valor_total - COALESCE(total_pago,0)) FILTER (WHERE vencimento < CURRENT_DATE), 0),
        'semana_qtd', COUNT(*) FILTER (WHERE vencimento BETWEEN v_ws.week_start AND v_ws.week_end),
        'semana_valor', COALESCE(SUM(valor_total - COALESCE(total_pago,0)) FILTER (WHERE vencimento BETWEEN v_ws.week_start AND v_ws.week_end), 0),
        'aberto_qtd', COUNT(*),
        'aberto_valor', COALESCE(SUM(valor_total - COALESCE(total_pago,0)), 0),
        'pago_mes_qtd', (SELECT COUNT(*) FROM contas WHERE status = 'paga' AND data_pagamento BETWEEN v_ini_mes AND v_fim_mes AND deleted_at IS NULL),
        'pago_mes_valor', (SELECT COALESCE(SUM(valor_total), 0) FROM contas WHERE status = 'paga' AND data_pagamento BETWEEN v_ini_mes AND v_fim_mes AND deleted_at IS NULL)
      )
      FROM contas WHERE status = 'pendente' AND deleted_at IS NULL
    ),
    'por_empresa', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.empresa_nome), '[]'::json) FROM (
        SELECT
          e.id AS empresa_id,
          e.nome AS empresa_nome,
          e.slug AS empresa_slug,
          COUNT(c.*) FILTER (WHERE c.vencimento < CURRENT_DATE) AS vencidas_qtd,
          COALESCE(SUM(c.valor_total - COALESCE(c.total_pago,0)) FILTER (WHERE c.vencimento < CURRENT_DATE), 0) AS vencidas_valor,
          COUNT(c.*) FILTER (WHERE c.vencimento BETWEEN v_ws.week_start AND v_ws.week_end) AS semana_qtd,
          COALESCE(SUM(c.valor_total - COALESCE(c.total_pago,0)) FILTER (WHERE c.vencimento BETWEEN v_ws.week_start AND v_ws.week_end), 0) AS semana_valor,
          COUNT(c.*) FILTER (WHERE c.vencimento BETWEEN v_ini_mes AND v_fim_mes) AS mes_qtd,
          COALESCE(SUM(c.valor_total - COALESCE(c.total_pago,0)) FILTER (WHERE c.vencimento BETWEEN v_ini_mes AND v_fim_mes), 0) AS mes_valor,
          COUNT(c.*) AS aberto_qtd,
          COALESCE(SUM(c.valor_total - COALESCE(c.total_pago,0)), 0) AS aberto_valor,
          (SELECT COUNT(*) FROM contas c2 WHERE c2.empresa_id = e.id AND c2.status = 'paga' AND c2.data_pagamento BETWEEN v_ini_mes AND v_fim_mes AND c2.deleted_at IS NULL) AS pago_mes_qtd,
          (SELECT COALESCE(SUM(c2.valor_total), 0) FROM contas c2 WHERE c2.empresa_id = e.id AND c2.status = 'paga' AND c2.data_pagamento BETWEEN v_ini_mes AND v_fim_mes AND c2.deleted_at IS NULL) AS pago_mes_valor
        FROM empresas e
        LEFT JOIN contas c ON c.empresa_id = e.id AND c.status = 'pendente' AND c.deleted_at IS NULL
        WHERE e.ativo = true
        GROUP BY e.id, e.nome, e.slug
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$function$;
