-- Criar tabela comprovantes_pagamento
CREATE TABLE IF NOT EXISTS public.comprovantes_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagamento_id UUID NOT NULL REFERENCES public.pagamentos(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  arquivo_tipo TEXT NOT NULL,
  data_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_expiracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 year')
);

-- Habilitar RLS
ALTER TABLE public.comprovantes_pagamento ENABLE ROW LEVEL SECURITY;

-- Política permissiva para todas as operações
CREATE POLICY "Permitir todas as operações em comprovantes"
ON public.comprovantes_pagamento
FOR ALL
USING (true)
WITH CHECK (true);