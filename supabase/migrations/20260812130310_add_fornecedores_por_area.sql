ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid,
  ADD COLUMN IF NOT EXISTS codigo_barras text,
  ADD COLUMN IF NOT EXISTS data_emissao date,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS juros numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multa numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS responsavel text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contas_fornecedor_id_fkey'
      AND conrelid = 'public.contas'::regclass
  ) THEN
    ALTER TABLE public.contas
      ADD CONSTRAINT contas_fornecedor_id_fkey
      FOREIGN KEY (fornecedor_id)
      REFERENCES public.fornecedores(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contas_fornecedor_id
  ON public.contas(fornecedor_id);

CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa_nome
  ON public.fornecedores(empresa, nome);

DROP VIEW IF EXISTS public.contas_view;

CREATE VIEW public.contas_view
WITH (security_invoker = true)
AS
WITH pagamentos_por_conta AS (
  SELECT
    conta_id,
    COALESCE(SUM(valor), 0)::numeric AS total_pago
  FROM public.pagamentos
  GROUP BY conta_id
)
SELECT
  c.id,
  c.descricao,
  c.empresa,
  c.empresa_id,
  c.categoria_id,
  c.fornecedor_id,
  f.nome AS fornecedor_nome,
  c.centro_custo,
  c.tipo_conta,
  c.forma_pagamento,
  c.data_emissao,
  c.data_pagamento,
  c.codigo_barras,
  c.deleted_at,
  c.desconto,
  c.juros,
  c.multa,
  c.observacoes,
  c.parcela_numero,
  c.responsavel,
  c.total_parcelas,
  c.grupo_parcela_id,
  c.created_at,
  c.updated_at,
  c.valor_total,
  c.vencimento,
  COALESCE(ppc.total_pago, 0)::numeric AS total_pago,
  COALESCE(ppc.total_pago, 0)::numeric AS pagamentos_acumulados,
  GREATEST(c.valor_total - COALESCE(ppc.total_pago, 0), 0)::numeric AS saldo,
  CASE
    WHEN c.valor_total - COALESCE(ppc.total_pago, 0) <= 0 THEN 'Pago'
    WHEN COALESCE(ppc.total_pago, 0) > 0 THEN 'Parcial'
    ELSE 'Pendente'
  END AS status
FROM public.contas c
LEFT JOIN pagamentos_por_conta ppc ON ppc.conta_id = c.id
LEFT JOIN public.fornecedores f ON f.id = c.fornecedor_id;

ALTER VIEW public.contas_view OWNER TO postgres;
GRANT SELECT ON public.contas_view TO anon, authenticated, service_role;
