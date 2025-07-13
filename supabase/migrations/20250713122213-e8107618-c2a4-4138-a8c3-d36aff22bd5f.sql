
-- Criar tabela contas
CREATE TABLE public.contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  empresa text NOT NULL,
  valor_total numeric NOT NULL CHECK (valor_total > 0),
  vencimento date NOT NULL,
  total_pago numeric DEFAULT 0 CHECK (total_pago >= 0),
  created_at timestamptz DEFAULT now()
);

-- Criar tabela pagamentos
CREATE TABLE public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid REFERENCES public.contas(id) ON DELETE CASCADE NOT NULL,
  data date NOT NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  created_at timestamptz DEFAULT now()
);

-- Criar tabela fornecedores
CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  observacao text,
  empresa text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar Row Level Security (RLS) nas tabelas
ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso para a tabela contas
CREATE POLICY "Permitir todas as operações em contas" ON public.contas
  FOR ALL USING (true) WITH CHECK (true);

-- Criar políticas de acesso para a tabela pagamentos
CREATE POLICY "Permitir todas as operações em pagamentos" ON public.pagamentos
  FOR ALL USING (true) WITH CHECK (true);

-- Criar políticas de acesso para a tabela fornecedores
CREATE POLICY "Permitir todas as operações em fornecedores" ON public.fornecedores
  FOR ALL USING (true) WITH CHECK (true);

-- Criar índices para melhor performance
CREATE INDEX idx_contas_empresa ON public.contas(empresa);
CREATE INDEX idx_contas_vencimento ON public.contas(vencimento);
CREATE INDEX idx_pagamentos_conta_id ON public.pagamentos(conta_id);
CREATE INDEX idx_fornecedores_empresa ON public.fornecedores(empresa);
