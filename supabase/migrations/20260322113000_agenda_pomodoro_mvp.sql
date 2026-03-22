-- Agenda + Pomodoro (MVP)

CREATE TABLE IF NOT EXISTS public.agenda_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  inicio_previsto timestamptz NULL,
  fim_previsto timestamptz NULL,
  pomodoros_planejados integer NOT NULL DEFAULT 1 CHECK (pomodoros_planejados > 0),
  pomodoros_concluidos integer NOT NULL DEFAULT 0 CHECK (pomodoros_concluidos >= 0),
  foco_segundos_total integer NOT NULL DEFAULT 0 CHECK (foco_segundos_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pomodoro_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tarefa_id uuid NOT NULL REFERENCES public.agenda_tarefas(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'foco' CHECK (tipo IN ('foco', 'pausa_curta', 'pausa_longa')),
  status text NOT NULL DEFAULT 'rodando' CHECK (status IN ('rodando', 'pausado', 'concluido', 'interrompido')),
  inicio_em timestamptz NOT NULL DEFAULT now(),
  fim_em timestamptz NULL,
  duracao_planejada_seg integer NOT NULL DEFAULT 1500 CHECK (duracao_planejada_seg > 0),
  duracao_real_seg integer NOT NULL DEFAULT 0 CHECK (duracao_real_seg >= 0),
  pausas_qtd integer NOT NULL DEFAULT 0 CHECK (pausas_qtd >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agenda_lembretes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tarefa_id uuid NOT NULL REFERENCES public.agenda_tarefas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('inicio', 'fim_foco', 'pausa', 'sem_progresso', 'vencimento')),
  canal text NOT NULL DEFAULT 'in_app' CHECK (canal IN ('in_app', 'push', 'email', 'whatsapp')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'cancelado')),
  agendado_em timestamptz NOT NULL,
  enviado_em timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pomodoro_config_empresa (
  empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  foco_min integer NOT NULL DEFAULT 25 CHECK (foco_min > 0),
  pausa_curta_min integer NOT NULL DEFAULT 5 CHECK (pausa_curta_min > 0),
  pausa_longa_min integer NOT NULL DEFAULT 15 CHECK (pausa_longa_min > 0),
  ciclos_pausa_longa integer NOT NULL DEFAULT 4 CHECK (ciclos_pausa_longa > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_tarefas_empresa_status
  ON public.agenda_tarefas(empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_agenda_tarefas_fim_previsto
  ON public.agenda_tarefas(fim_previsto);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessoes_empresa_tarefa
  ON public.pomodoro_sessoes(empresa_id, tarefa_id);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessoes_status
  ON public.pomodoro_sessoes(status);

CREATE INDEX IF NOT EXISTS idx_agenda_lembretes_empresa_status
  ON public.agenda_lembretes(empresa_id, status);

CREATE OR REPLACE FUNCTION public.set_updated_at_agenda()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agenda_tarefas_updated_at ON public.agenda_tarefas;
CREATE TRIGGER trg_agenda_tarefas_updated_at
  BEFORE UPDATE ON public.agenda_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_agenda();

DROP TRIGGER IF EXISTS trg_pomodoro_config_updated_at ON public.pomodoro_config_empresa;
CREATE TRIGGER trg_pomodoro_config_updated_at
  BEFORE UPDATE ON public.pomodoro_config_empresa
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_agenda();

ALTER TABLE public.agenda_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_lembretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_config_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all_agenda_tarefas ON public.agenda_tarefas;
CREATE POLICY allow_all_agenda_tarefas
ON public.agenda_tarefas
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_pomodoro_sessoes ON public.pomodoro_sessoes;
CREATE POLICY allow_all_pomodoro_sessoes
ON public.pomodoro_sessoes
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_agenda_lembretes ON public.agenda_lembretes;
CREATE POLICY allow_all_agenda_lembretes
ON public.agenda_lembretes
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_pomodoro_config_empresa ON public.pomodoro_config_empresa;
CREATE POLICY allow_all_pomodoro_config_empresa
ON public.pomodoro_config_empresa
FOR ALL
USING (true)
WITH CHECK (true);

INSERT INTO public.pomodoro_config_empresa (empresa_id)
SELECT id
FROM public.empresas
ON CONFLICT (empresa_id) DO NOTHING;
