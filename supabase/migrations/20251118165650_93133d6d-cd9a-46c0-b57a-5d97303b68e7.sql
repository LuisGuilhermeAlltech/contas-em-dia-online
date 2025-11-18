-- Adicionar campos para controle de parcelas/mensalidades
ALTER TABLE public.contas
ADD COLUMN IF NOT EXISTS parcela_numero integer,
ADD COLUMN IF NOT EXISTS total_parcelas integer,
ADD COLUMN IF NOT EXISTS grupo_parcela_id uuid;

-- Criar índice para melhorar performance nas consultas por grupo
CREATE INDEX IF NOT EXISTS idx_contas_grupo_parcela ON public.contas(grupo_parcela_id) WHERE grupo_parcela_id IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.contas.parcela_numero IS 'Número da parcela atual (1, 2, 3...). Null para contas sem parcelas.';
COMMENT ON COLUMN public.contas.total_parcelas IS 'Total de parcelas do grupo. Null para contas sem parcelas.';
COMMENT ON COLUMN public.contas.grupo_parcela_id IS 'UUID que agrupa várias contas como parcelas de um mesmo lançamento.';