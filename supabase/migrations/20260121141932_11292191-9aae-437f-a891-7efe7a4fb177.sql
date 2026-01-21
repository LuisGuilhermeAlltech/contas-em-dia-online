-- Função para retornar contas vencidas + vencendo hoje
CREATE OR REPLACE FUNCTION public.rpc_contas_vencidas_e_hoje(
  p_empresa text,
  p_hoje date
)
RETURNS TABLE(
  id uuid,
  descricao text,
  vencimento date,
  saldo numeric,
  status text,
  is_vencido boolean,
  is_hoje boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    cv.id,
    cv.descricao,
    cv.vencimento,
    cv.saldo,
    cv.status,
    cv.vencimento < p_hoje AS is_vencido,
    cv.vencimento = p_hoje AS is_hoje
  FROM contas_view cv
  WHERE cv.empresa = p_empresa
    AND cv.status IN ('Pendente', 'Parcial')
    AND cv.vencimento <= p_hoje
  ORDER BY cv.vencimento ASC
  LIMIT 10;
$$;