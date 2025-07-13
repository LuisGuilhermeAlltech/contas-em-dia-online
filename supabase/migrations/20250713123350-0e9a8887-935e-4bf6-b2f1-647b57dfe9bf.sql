
-- Criar view para calcular saldos e status das contas
CREATE OR REPLACE VIEW contas_view AS
SELECT
  c.*,
  COALESCE(SUM(p.valor), 0) as total_pago,
  c.valor_total - COALESCE(SUM(p.valor), 0) as saldo,
  CASE
    WHEN c.valor_total - COALESCE(SUM(p.valor), 0) <= 0 THEN 'Pago'
    WHEN COALESCE(SUM(p.valor), 0) > 0 THEN 'Parcial'
    ELSE 'Pendente'
  END as status
FROM contas c
LEFT JOIN pagamentos p ON p.conta_id = c.id
GROUP BY c.id;

-- Habilitar RLS na view (herda das tabelas base)
ALTER VIEW contas_view OWNER TO postgres;

-- Inserir conta de teste
INSERT INTO public.contas (descricao, empresa, valor_total, vencimento) 
VALUES ('Nota 001 - Material de Construção João', 'grupo-lider', 1500.00, '2025-07-20');
