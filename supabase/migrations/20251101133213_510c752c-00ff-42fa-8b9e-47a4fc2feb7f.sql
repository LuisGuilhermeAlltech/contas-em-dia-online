-- Criar função RPC para calcular total de contas do dia
-- Considera apenas contas pendentes no fuso America/Sao_Paulo
CREATE OR REPLACE FUNCTION rpc_total_contas_do_dia(p_empresa text, p_data date)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(valor_total), 0)::numeric
  FROM contas_view
  WHERE empresa = p_empresa
    AND vencimento::date = p_data
    AND status = 'Pendente';
$$;

-- Revogar acesso público e conceder apenas aos roles necessários
REVOKE ALL ON FUNCTION rpc_total_contas_do_dia(text, date) FROM public;
GRANT EXECUTE ON FUNCTION rpc_total_contas_do_dia(text, date) TO anon, authenticated, service_role;

-- Criar função RPC para calcular total da próxima semana
CREATE OR REPLACE FUNCTION rpc_total_proxima_semana(p_empresa text, p_data_inicio date, p_data_fim date)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(saldo), 0)::numeric
  FROM contas_view
  WHERE empresa = p_empresa
    AND vencimento::date >= p_data_inicio
    AND vencimento::date <= p_data_fim
    AND status = 'Pendente';
$$;

REVOKE ALL ON FUNCTION rpc_total_proxima_semana(text, date, date) FROM public;
GRANT EXECUTE ON FUNCTION rpc_total_proxima_semana(text, date, date) TO anon, authenticated, service_role;

-- Criar função RPC para calcular total do mês
CREATE OR REPLACE FUNCTION rpc_total_mes_atual(p_empresa text, p_data_inicio date, p_data_fim date)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(saldo), 0)::numeric
  FROM contas_view
  WHERE empresa = p_empresa
    AND vencimento::date >= p_data_inicio
    AND vencimento::date <= p_data_fim
    AND status = 'Pendente';
$$;

REVOKE ALL ON FUNCTION rpc_total_mes_atual(text, date, date) FROM public;
GRANT EXECUTE ON FUNCTION rpc_total_mes_atual(text, date, date) TO anon, authenticated, service_role;