-- Adicionar campos faltantes em contas (preservando dados existentes)
ALTER TABLE public.contas 
ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id),
ADD COLUMN IF NOT EXISTS data_emissao date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS juros numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS multa numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS observacoes text,
ADD COLUMN IF NOT EXISTS responsavel text DEFAULT 'Luis Guilherme',
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Atualizar responsavel para registros existentes que não têm
UPDATE public.contas 
SET responsavel = 'Luis Guilherme' 
WHERE responsavel IS NULL;

-- Adicionar campos em pagamentos
ALTER TABLE public.pagamentos
ADD COLUMN IF NOT EXISTS forma text DEFAULT 'Dinheiro',
ADD COLUMN IF NOT EXISTS observacao text;

-- Criar view v_contas_pagar
CREATE OR REPLACE VIEW public.v_contas_pagar AS
SELECT
  c.id,
  c.empresa::uuid as empresa_id,
  c.fornecedor_id,
  c.descricao,
  c.data_emissao,
  c.vencimento as data_vencimento,
  c.valor_total as valor_original,
  c.juros,
  c.multa,
  c.desconto,
  c.observacoes,
  c.responsavel,
  c.deleted_at,
  c.created_at,
  COALESCE((
    SELECT SUM(p.valor)
    FROM public.pagamentos p
    WHERE p.conta_id = c.id
  ), 0) AS valor_pago_total,
  GREATEST(
    (c.valor_total + COALESCE(c.juros, 0) + COALESCE(c.multa, 0) - COALESCE(c.desconto, 0))
    - COALESCE((
      SELECT SUM(p.valor)
      FROM public.pagamentos p
      WHERE p.conta_id = c.id
    ), 0),
    0
  )::numeric(14,2) AS valor_aberto,
  (CASE
     WHEN (c.valor_total + COALESCE(c.juros, 0) + COALESCE(c.multa, 0) - COALESCE(c.desconto, 0))
          - COALESCE((
            SELECT SUM(p.valor)
            FROM public.pagamentos p
            WHERE p.conta_id = c.id
          ), 0) <= 0 THEN 'paga'
     WHEN c.vencimento < (NOW() AT TIME ZONE 'America/Fortaleza')::date THEN 'vencida'
     ELSE 'pendente'
   END) AS status_calc
FROM public.contas c
WHERE c.deleted_at IS NULL;

-- Habilitar RLS na view
ALTER VIEW public.v_contas_pagar SET (security_invoker = true);

-- Criar função de resumo
CREATE OR REPLACE FUNCTION public.fn_resumo_cp(
  p_empresa text,
  p_ref date DEFAULT (NOW() AT TIME ZONE 'America/Fortaleza')::date
)
RETURNS TABLE(
  total_hoje numeric,
  total_prox_semana numeric,
  total_mes_atual numeric,
  qtd_vencidas bigint,
  qtd_pendentes bigint,
  qtd_pagas_mes bigint
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
WITH base AS (
  SELECT * FROM v_contas_pagar WHERE empresa_id::text = p_empresa
),
datas AS (
  SELECT
    p_ref AS hoje,
    p_ref + 1 AS amanha,
    p_ref + 7 AS mais7,
    DATE_TRUNC('month', p_ref)::date AS ini_mes,
    (DATE_TRUNC('month', p_ref) + INTERVAL '1 month - 1 day')::date AS fim_mes
)
SELECT
  (SELECT COALESCE(SUM(valor_aberto),0) FROM base b CROSS JOIN datas d
     WHERE b.status_calc <> 'paga' AND b.data_vencimento = d.hoje) AS total_hoje,
  (SELECT COALESCE(SUM(valor_aberto),0) FROM base b CROSS JOIN datas d
     WHERE b.status_calc <> 'paga' AND b.data_vencimento BETWEEN d.amanha AND d.mais7) AS total_prox_semana,
  (SELECT COALESCE(SUM(valor_aberto),0) FROM base b CROSS JOIN datas d
     WHERE b.status_calc <> 'paga' AND b.data_vencimento BETWEEN d.ini_mes AND d.fim_mes) AS total_mes_atual,
  (SELECT COUNT(*) FROM base WHERE status_calc = 'vencida') AS qtd_vencidas,
  (SELECT COUNT(*) FROM base WHERE status_calc = 'pendente') AS qtd_pendentes,
  (SELECT COUNT(DISTINCT p.conta_id)
     FROM public.pagamentos p
     CROSS JOIN datas d
     JOIN public.contas c ON c.id = p.conta_id
     WHERE c.empresa::text = p_empresa
       AND p.data BETWEEN d.ini_mes AND d.fim_mes
       AND c.deleted_at IS NULL) AS qtd_pagas_mes;
$$;

-- Criar função para próximas contas
CREATE OR REPLACE FUNCTION public.fn_proximas_contas(
  p_empresa text,
  p_limite int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  descricao text,
  fornecedor text,
  data_vencimento date,
  valor_aberto numeric,
  status_calc text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    v.id,
    v.descricao,
    COALESCE(f.nome, 'Sem fornecedor') as fornecedor,
    v.data_vencimento,
    v.valor_aberto,
    v.status_calc
  FROM v_contas_pagar v
  LEFT JOIN fornecedores f ON f.id = v.fornecedor_id
  WHERE v.empresa_id::text = p_empresa
    AND v.status_calc <> 'paga'
    AND v.data_vencimento >= (NOW() AT TIME ZONE 'America/Fortaleza')::date
  ORDER BY v.data_vencimento ASC
  LIMIT p_limite;
$$;