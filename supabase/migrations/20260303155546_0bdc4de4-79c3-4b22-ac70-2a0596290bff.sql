
-- Corrigir nomes das empresas (estão como slug, devem ser nomes legíveis)
UPDATE public.empresas SET nome = 'AllTech Matriz' WHERE slug = 'alltech-matriz';
UPDATE public.empresas SET nome = 'AllTech Filial' WHERE slug = 'alltech-filial';
UPDATE public.empresas SET nome = 'Grupo Líder' WHERE slug = 'grupo-lider';
UPDATE public.empresas SET nome = 'Luis Guilherme' WHERE slug = 'luis-guilherme';
UPDATE public.empresas SET nome = 'Adryssia Cortez', ativo = false WHERE slug = 'adryssia-cortez';

-- Recalcular total_pago a partir da tabela pagamentos
UPDATE public.contas c
SET total_pago = sub.soma
FROM (
  SELECT conta_id, COALESCE(SUM(valor), 0) AS soma
  FROM public.pagamentos
  GROUP BY conta_id
) sub
WHERE c.id = sub.conta_id;

-- Recalcular status baseado no total_pago recalculado
UPDATE public.contas
SET status = CASE
  WHEN COALESCE(total_pago, 0) >= valor_total THEN 'paga'
  ELSE 'pendente'
END;

-- Recalcular data_pagamento 
UPDATE public.contas c
SET data_pagamento = sub.ultima_data
FROM (
  SELECT conta_id, MAX(data) AS ultima_data
  FROM public.pagamentos
  GROUP BY conta_id
) sub
WHERE c.id = sub.conta_id;
