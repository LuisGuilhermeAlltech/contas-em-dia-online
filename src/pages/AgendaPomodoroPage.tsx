import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BellRing,
  CheckCircle2,
  Pause,
  Play,
  Plus,
  Square,
  StopCircle,
  TimerReset,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAppStore } from '@/store/appStore';
import { useEmpresaId } from '@/hooks/useEmpresas';
import { toast } from 'sonner';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type AgendaTarefa = Tables<'agenda_tarefas'>;
type AgendaLembrete = Tables<'agenda_lembretes'>;
type PomodoroConfig = Tables<'pomodoro_config_empresa'>;
type PomodoroSessao = Tables<'pomodoro_sessoes'>;

interface NovaTarefaForm {
  titulo: string;
  descricao: string;
  pomodorosPlanejados: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  fimPrevisto: string;
}

interface ActiveTimer {
  sessionId: string;
  tarefaId: string;
  tarefaTitulo: string;
  plannedSeconds: number;
  elapsedBeforePause: number;
  resumedAtMs: number | null;
  isPaused: boolean;
  pausesCount: number;
}

interface WeeklyFocusRow {
  dayKey: string;
  dayLabel: string;
  pomodoros: number;
  focoSegundos: number;
}

interface WeeklyTaskRow {
  tarefaId: string;
  titulo: string;
  pomodoros: number;
  focoSegundos: number;
}

interface LembretePendente {
  id: string;
  tipo: AgendaLembrete['tipo'];
  tarefa_id: string;
  agendado_em: string;
  agenda_tarefas: {
    titulo: string;
    status: string;
    foco_segundos_total: number;
    pomodoros_concluidos: number;
    fim_previsto: string | null;
  } | null;
}

const defaultForm: NovaTarefaForm = {
  titulo: '',
  descricao: '',
  pomodorosPlanejados: '1',
  prioridade: 'media',
  fimPrevisto: '',
};

const statusLabel: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluida',
  cancelada: 'Cancelada',
};

const prioridadeLabel: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

const priorityBadgeClass: Record<string, string> = {
  baixa: 'bg-emerald-100 text-emerald-700',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-amber-100 text-amber-700',
  urgente: 'bg-red-100 text-red-700',
};

const statusBadgeClass: Record<string, string> = {
  pendente: 'bg-slate-100 text-slate-700',
  em_andamento: 'bg-indigo-100 text-indigo-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-zinc-200 text-zinc-700',
};

const formatSeconds = (totalSeconds: number): string => {
  const value = Math.max(totalSeconds, 0);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const toUtcIsoOrNull = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatDateTime = (value: string | null): string => {
  if (!value) return 'Sem prazo';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const addMinutesToIso = (isoDate: string, minutes: number): string => {
  const date = new Date(isoDate);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
};

const addSecondsToIso = (isoDate: string, seconds: number): string => {
  const date = new Date(isoDate);
  date.setSeconds(date.getSeconds() + seconds);
  return date.toISOString();
};

const getWeekStartIso = (): string => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - 6);
  return date.toISOString();
};

const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export default function AgendaPomodoroPage() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useAppStore();
  const empresaUuid = useEmpresaId(selectedCompanyId);

  const [form, setForm] = useState<NovaTarefaForm>(defaultForm);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [tick, setTick] = useState(0);

  const { data: pomodoroConfig } = useQuery<PomodoroConfig | null>({
    queryKey: ['pomodoro-config', empresaUuid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pomodoro_config_empresa')
        .select('*')
        .eq('empresa_id', empresaUuid!)
        .maybeSingle();

      if (error) throw error;

      if (data) return data;

      const { data: inserted, error: insertError } = await supabase
        .from('pomodoro_config_empresa')
        .insert({ empresa_id: empresaUuid! })
        .select('*')
        .single();

      if (insertError) throw insertError;
      return inserted;
    },
    enabled: !!empresaUuid,
  });

  const { data: tarefas = [], isLoading } = useQuery<AgendaTarefa[]>({
    queryKey: ['agenda-tarefas', empresaUuid, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('agenda_tarefas')
        .select('*')
        .eq('empresa_id', empresaUuid!)
        .order('status', { ascending: true })
        .order('fim_previsto', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaUuid,
  });

  const focoSegundosPadrao = (pomodoroConfig?.foco_min || 25) * 60;

  const { data: sessoesSemana = [] } = useQuery<PomodoroSessao[]>({
    queryKey: ['agenda-sessoes-semana', empresaUuid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pomodoro_sessoes')
        .select('*')
        .eq('empresa_id', empresaUuid!)
        .eq('status', 'concluido')
        .gte('fim_em', getWeekStartIso())
        .not('fim_em', 'is', null)
        .order('fim_em', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaUuid,
    staleTime: 1000 * 30,
  });

  const { data: lembretesPendentesCount = 0 } = useQuery<number>({
    queryKey: ['agenda-lembretes-pendentes', empresaUuid],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('agenda_lembretes')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaUuid!)
        .eq('status', 'pendente')
        .eq('canal', 'in_app');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!empresaUuid,
    refetchInterval: 30000,
  });

  const cancelPendingReminderByType = useCallback(
    async (tarefaId: string, tipo: AgendaLembrete['tipo']) => {
      if (!empresaUuid) return;

      const { error } = await supabase
        .from('agenda_lembretes')
        .update({ status: 'cancelado' })
        .eq('empresa_id', empresaUuid)
        .eq('tarefa_id', tarefaId)
        .eq('tipo', tipo)
        .eq('status', 'pendente');

      if (error) {
        console.error('Erro ao cancelar lembrete pendente', error);
      }
    },
    [empresaUuid]
  );

  const agendarLembrete = useCallback(
    async (payload: {
      tarefaId: string;
      tipo: AgendaLembrete['tipo'];
      agendadoEm: string;
      canal?: AgendaLembrete['canal'];
    }) => {
      if (!empresaUuid) return;

      const { error } = await supabase.from('agenda_lembretes').insert({
        empresa_id: empresaUuid,
        tarefa_id: payload.tarefaId,
        tipo: payload.tipo,
        canal: payload.canal || 'in_app',
        status: 'pendente',
        agendado_em: payload.agendadoEm,
      });

      if (error) {
        console.error('Erro ao agendar lembrete', error);
      }
    },
    [empresaUuid]
  );

  const processarLembretesPendentes = useCallback(async () => {
    if (!empresaUuid) return;

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('agenda_lembretes')
      .select(
        'id, tipo, tarefa_id, agendado_em, agenda_tarefas(titulo, status, foco_segundos_total, pomodoros_concluidos, fim_previsto)'
      )
      .eq('empresa_id', empresaUuid)
      .eq('status', 'pendente')
      .eq('canal', 'in_app')
      .lte('agendado_em', nowIso)
      .order('agendado_em', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Erro ao processar lembretes pendentes', error);
      return;
    }

    const lembretes = ((data || []) as unknown as LembretePendente[]).filter(Boolean);
    if (!lembretes.length) return;

    const enviados: string[] = [];
    const cancelados: string[] = [];

    for (const lembrete of lembretes) {
      const tarefa = lembrete.agenda_tarefas;
      const titulo = tarefa?.titulo || 'tarefa';

      if (lembrete.tipo === 'sem_progresso') {
        const semProgresso =
          tarefa?.status === 'pendente' &&
          (tarefa.foco_segundos_total || 0) === 0 &&
          (tarefa.pomodoros_concluidos || 0) === 0;

        if (!semProgresso) {
          cancelados.push(lembrete.id);
          continue;
        }

        toast.warning(`Sem progresso na tarefa "${titulo}"`);
        enviados.push(lembrete.id);
        continue;
      }

      if (lembrete.tipo === 'fim_foco') {
        toast.success(`Ciclo de foco finalizado: "${titulo}"`);
        enviados.push(lembrete.id);
        continue;
      }

      if (lembrete.tipo === 'pausa') {
        toast.info(`Hora da pausa: "${titulo}"`);
        enviados.push(lembrete.id);
        continue;
      }

      if (lembrete.tipo === 'vencimento') {
        toast.warning(`Prazo proximo da tarefa "${titulo}"`);
        enviados.push(lembrete.id);
        continue;
      }

      if (lembrete.tipo === 'inicio') {
        toast.info(`Lembrete de inicio: "${titulo}"`);
        enviados.push(lembrete.id);
        continue;
      }

      enviados.push(lembrete.id);
    }

    if (enviados.length) {
      const { error: markSentError } = await supabase
        .from('agenda_lembretes')
        .update({ status: 'enviado', enviado_em: nowIso })
        .in('id', enviados);

      if (markSentError) {
        console.error('Erro ao marcar lembretes como enviados', markSentError);
      }
    }

    if (cancelados.length) {
      const { error: markCanceledError } = await supabase
        .from('agenda_lembretes')
        .update({ status: 'cancelado' })
        .in('id', cancelados);

      if (markCanceledError) {
        console.error('Erro ao cancelar lembretes', markCanceledError);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['agenda-lembretes-pendentes'] });
  }, [empresaUuid, queryClient]);

  const getElapsedSeconds = useCallback((timer: ActiveTimer, nowMs = Date.now()): number => {
    if (timer.isPaused || timer.resumedAtMs === null) {
      return timer.elapsedBeforePause;
    }

    const secondsInRun = Math.floor((nowMs - timer.resumedAtMs) / 1000);
    return Math.min(timer.plannedSeconds, timer.elapsedBeforePause + Math.max(secondsInRun, 0));
  }, []);

  useEffect(() => {
    if (!activeTimer || activeTimer.isPaused) return undefined;

    const intervalId = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTimer]);

  useEffect(() => {
    if (!empresaUuid) return undefined;

    void processarLembretesPendentes();

    const intervalId = window.setInterval(() => {
      void processarLembretesPendentes();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [empresaUuid, processarLembretesPendentes]);

  const elapsedSeconds = useMemo(() => {
    if (!activeTimer) return 0;
    return getElapsedSeconds(activeTimer);
  }, [activeTimer, getElapsedSeconds, tick]);

  const remainingSeconds = useMemo(() => {
    if (!activeTimer) return 0;
    return Math.max(activeTimer.plannedSeconds - elapsedSeconds, 0);
  }, [activeTimer, elapsedSeconds]);

  const timerProgress = useMemo(() => {
    if (!activeTimer || activeTimer.plannedSeconds <= 0) return 0;
    return Math.min(100, Math.round((elapsedSeconds / activeTimer.plannedSeconds) * 100));
  }, [activeTimer, elapsedSeconds]);

  const criarTarefaMutation = useMutation({
    mutationFn: async (payload: NovaTarefaForm) => {
      if (!empresaUuid) {
        throw new Error('Empresa nao identificada');
      }

      const pomodorosPlanejados = Number(payload.pomodorosPlanejados) || 1;

      const { data: tarefaCriada, error } = await supabase
        .from('agenda_tarefas')
        .insert({
          empresa_id: empresaUuid,
          titulo: payload.titulo.trim(),
          descricao: payload.descricao.trim() || null,
          prioridade: payload.prioridade,
          status: 'pendente',
          pomodoros_planejados: Math.max(1, pomodorosPlanejados),
          fim_previsto: toUtcIsoOrNull(payload.fimPrevisto),
        })
        .select('id, fim_previsto')
        .single();

      if (error) throw error;

      const nowIso = new Date().toISOString();

      await agendarLembrete({
        tarefaId: tarefaCriada.id,
        tipo: 'sem_progresso',
        agendadoEm: addMinutesToIso(nowIso, 90),
      });

      if (tarefaCriada.fim_previsto) {
        const prazo = new Date(tarefaCriada.fim_previsto);
        const lembretePrazo = new Date(prazo.getTime() - 15 * 60 * 1000);
        if (lembretePrazo.getTime() > Date.now()) {
          await agendarLembrete({
            tarefaId: tarefaCriada.id,
            tipo: 'vencimento',
            agendadoEm: lembretePrazo.toISOString(),
          });
        }
      }
    },
    onSuccess: () => {
      toast.success('Tarefa criada');
      setForm(defaultForm);
      queryClient.invalidateQueries({ queryKey: ['agenda-tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-lembretes-pendentes'] });
    },
    onError: () => {
      toast.error('Erro ao criar tarefa');
    },
  });

  const concluirTarefaMutation = useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from('agenda_tarefas')
        .update({ status: 'concluida' })
        .eq('id', tarefaId);

      if (error) throw error;

      const { error: reminderError } = await supabase
        .from('agenda_lembretes')
        .update({ status: 'cancelado' })
        .eq('tarefa_id', tarefaId)
        .eq('status', 'pendente');

      if (reminderError) throw reminderError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-lembretes-pendentes'] });
      toast.success('Tarefa marcada como concluida');
    },
    onError: () => {
      toast.error('Erro ao atualizar tarefa');
    },
  });

  const finalizarTimer = useCallback(
    async (countAsPomodoro: boolean) => {
      if (!activeTimer) return;

      try {
        const nowIso = new Date().toISOString();
        const elapsed = getElapsedSeconds(activeTimer);

        const { error: updateSessaoError } = await supabase
          .from('pomodoro_sessoes')
          .update({
            status: countAsPomodoro ? 'concluido' : 'interrompido',
            fim_em: nowIso,
            duracao_real_seg: elapsed,
            pausas_qtd: activeTimer.pausesCount,
          })
          .eq('id', activeTimer.sessionId);

        if (updateSessaoError) throw updateSessaoError;

        await cancelPendingReminderByType(activeTimer.tarefaId, 'fim_foco');
        if (countAsPomodoro) {
          await agendarLembrete({
            tarefaId: activeTimer.tarefaId,
            tipo: 'pausa',
            agendadoEm: nowIso,
          });
        }

        const { data: tarefa, error: tarefaError } = await supabase
          .from('agenda_tarefas')
          .select('id, status, pomodoros_concluidos, pomodoros_planejados, foco_segundos_total')
          .eq('id', activeTimer.tarefaId)
          .single();

        if (tarefaError) throw tarefaError;

        if (tarefa) {
          const novosPomodoros = countAsPomodoro
            ? tarefa.pomodoros_concluidos + 1
            : tarefa.pomodoros_concluidos;

          const novoStatus = countAsPomodoro
            ? novosPomodoros >= tarefa.pomodoros_planejados
              ? 'concluida'
              : 'em_andamento'
            : elapsed > 0 && tarefa.status === 'pendente'
              ? 'em_andamento'
              : tarefa.status;

          const { error: updateTarefaError } = await supabase
            .from('agenda_tarefas')
            .update({
              pomodoros_concluidos: novosPomodoros,
              foco_segundos_total: tarefa.foco_segundos_total + elapsed,
              status: novoStatus,
            })
            .eq('id', tarefa.id);

          if (updateTarefaError) throw updateTarefaError;
        }

        if (countAsPomodoro || elapsed > 0) {
          await cancelPendingReminderByType(activeTimer.tarefaId, 'sem_progresso');
        }

        setActiveTimer(null);
        setTick(0);
        queryClient.invalidateQueries({ queryKey: ['agenda-tarefas'] });
        queryClient.invalidateQueries({ queryKey: ['pomodoro-sessoes'] });
        queryClient.invalidateQueries({ queryKey: ['agenda-sessoes-semana'] });
        queryClient.invalidateQueries({ queryKey: ['agenda-lembretes-pendentes'] });
        toast.success(countAsPomodoro ? 'Pomodoro concluido' : 'Pomodoro interrompido');
      } catch (error) {
        console.error('Erro ao finalizar pomodoro', error);
        toast.error('Erro ao finalizar pomodoro');
      }
    },
    [activeTimer, agendarLembrete, cancelPendingReminderByType, getElapsedSeconds, queryClient]
  );

  useEffect(() => {
    if (!activeTimer || activeTimer.isPaused) return;
    if (remainingSeconds > 0) return;

    void finalizarTimer(true);
  }, [activeTimer, finalizarTimer, remainingSeconds]);

  const iniciarPomodoro = async (tarefa: AgendaTarefa) => {
    if (!empresaUuid) {
      toast.error('Selecione uma empresa para iniciar');
      return;
    }

    if (activeTimer) {
      toast.warning('Ja existe um pomodoro ativo');
      return;
    }

    try {
      const nowIso = new Date().toISOString();

      const { data: sessao, error: sessaoError } = await supabase
        .from('pomodoro_sessoes')
        .insert({
          empresa_id: empresaUuid,
          tarefa_id: tarefa.id,
          tipo: 'foco',
          status: 'rodando',
          inicio_em: nowIso,
          duracao_planejada_seg: focoSegundosPadrao,
          duracao_real_seg: 0,
          pausas_qtd: 0,
        })
        .select('id')
        .single();

      if (sessaoError) throw sessaoError;

      if (tarefa.status === 'pendente') {
        const { error: statusError } = await supabase
          .from('agenda_tarefas')
          .update({ status: 'em_andamento' })
          .eq('id', tarefa.id);

        if (statusError) throw statusError;
      }

      await cancelPendingReminderByType(tarefa.id, 'fim_foco');
      await cancelPendingReminderByType(tarefa.id, 'sem_progresso');
      await agendarLembrete({
        tarefaId: tarefa.id,
        tipo: 'fim_foco',
        agendadoEm: addMinutesToIso(nowIso, pomodoroConfig?.foco_min || 25),
      });

      setActiveTimer({
        sessionId: sessao.id,
        tarefaId: tarefa.id,
        tarefaTitulo: tarefa.titulo,
        plannedSeconds: focoSegundosPadrao,
        elapsedBeforePause: 0,
        resumedAtMs: Date.now(),
        isPaused: false,
        pausesCount: 0,
      });
      setTick(0);

      queryClient.invalidateQueries({ queryKey: ['agenda-tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-lembretes-pendentes'] });
      toast.success(`Pomodoro iniciado em "${tarefa.titulo}"`);
    } catch (error) {
      console.error('Erro ao iniciar pomodoro', error);
      toast.error('Nao foi possivel iniciar o pomodoro');
    }
  };

  const pausarPomodoro = useCallback(async () => {
    if (!activeTimer || activeTimer.isPaused) return;

    try {
      const elapsed = getElapsedSeconds(activeTimer);
      const newPausesCount = activeTimer.pausesCount + 1;

      const { error } = await supabase
        .from('pomodoro_sessoes')
        .update({
          status: 'pausado',
          duracao_real_seg: elapsed,
          pausas_qtd: newPausesCount,
        })
        .eq('id', activeTimer.sessionId);

      if (error) throw error;

      await cancelPendingReminderByType(activeTimer.tarefaId, 'fim_foco');

      setActiveTimer((prev) =>
        prev
          ? {
              ...prev,
              isPaused: true,
              elapsedBeforePause: elapsed,
              resumedAtMs: null,
              pausesCount: newPausesCount,
            }
          : prev
      );
      queryClient.invalidateQueries({ queryKey: ['agenda-lembretes-pendentes'] });
      toast.success('Pomodoro pausado');
    } catch (error) {
      console.error('Erro ao pausar pomodoro', error);
      toast.error('Nao foi possivel pausar');
    }
  }, [activeTimer, cancelPendingReminderByType, getElapsedSeconds, queryClient]);

  const retomarPomodoro = useCallback(async () => {
    if (!activeTimer || !activeTimer.isPaused) return;

    try {
      const { error } = await supabase
        .from('pomodoro_sessoes')
        .update({ status: 'rodando' })
        .eq('id', activeTimer.sessionId);

      if (error) throw error;

      const remainingSeconds = Math.max(
        activeTimer.plannedSeconds - activeTimer.elapsedBeforePause,
        1
      );
      await agendarLembrete({
        tarefaId: activeTimer.tarefaId,
        tipo: 'fim_foco',
        agendadoEm: addSecondsToIso(new Date().toISOString(), remainingSeconds),
      });

      setActiveTimer((prev) =>
        prev
          ? {
              ...prev,
              isPaused: false,
              resumedAtMs: Date.now(),
            }
          : prev
      );
      queryClient.invalidateQueries({ queryKey: ['agenda-lembretes-pendentes'] });
      toast.success('Pomodoro retomado');
    } catch (error) {
      console.error('Erro ao retomar pomodoro', error);
      toast.error('Nao foi possivel retomar');
    }
  }, [activeTimer, agendarLembrete, queryClient]);

  const totalFocoHoje = useMemo(() => {
    return tarefas.reduce((acc, tarefa) => acc + tarefa.foco_segundos_total, 0);
  }, [tarefas]);

  const weeklyFocusRows = useMemo<WeeklyFocusRow[]>(() => {
    const rows: WeeklyFocusRow[] = [];
    const rowByDay = new Map<string, WeeklyFocusRow>();

    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);
      const dayKey = date.toISOString().slice(0, 10);
      const row: WeeklyFocusRow = {
        dayKey,
        dayLabel: formatShortDate(date),
        pomodoros: 0,
        focoSegundos: 0,
      };

      rows.push(row);
      rowByDay.set(dayKey, row);
    }

    for (const sessao of sessoesSemana) {
      if (!sessao.fim_em) continue;
      const fimDate = new Date(sessao.fim_em);
      if (Number.isNaN(fimDate.getTime())) continue;
      fimDate.setHours(0, 0, 0, 0);
      const key = fimDate.toISOString().slice(0, 10);
      const target = rowByDay.get(key);
      if (!target) continue;

      target.pomodoros += 1;
      target.focoSegundos += sessao.duracao_real_seg || 0;
    }

    return rows;
  }, [sessoesSemana]);

  const weeklyTopTasks = useMemo<WeeklyTaskRow[]>(() => {
    const titleByTask = new Map<string, string>(
      tarefas.map((tarefa) => [tarefa.id, tarefa.titulo])
    );

    const aggregates = new Map<string, WeeklyTaskRow>();
    for (const sessao of sessoesSemana) {
      const existing = aggregates.get(sessao.tarefa_id);
      if (!existing) {
        aggregates.set(sessao.tarefa_id, {
          tarefaId: sessao.tarefa_id,
          titulo: titleByTask.get(sessao.tarefa_id) || 'Tarefa',
          pomodoros: 1,
          focoSegundos: sessao.duracao_real_seg || 0,
        });
        continue;
      }

      existing.pomodoros += 1;
      existing.focoSegundos += sessao.duracao_real_seg || 0;
    }

    return Array.from(aggregates.values())
      .sort((a, b) => b.focoSegundos - a.focoSegundos || b.pomodoros - a.pomodoros)
      .slice(0, 5);
  }, [sessoesSemana, tarefas]);

  const totalFocoSemana = useMemo(() => {
    return weeklyFocusRows.reduce((acc, row) => acc + row.focoSegundos, 0);
  }, [weeklyFocusRows]);

  const totalPomodorosSemana = useMemo(() => {
    return weeklyFocusRows.reduce((acc, row) => acc + row.pomodoros, 0);
  }, [weeklyFocusRows]);

  if (!selectedCompanyId) {
    return <div className="p-6 text-muted-foreground">Selecione uma empresa para abrir a agenda.</div>;
  }

  if (!empresaUuid) {
    return <div className="p-6 text-muted-foreground">Carregando empresa...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Agenda e Pomodoro</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{tarefas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pomodoros Concluidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {tarefas.reduce((acc, tarefa) => acc + tarefa.pomodoros_concluidos, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tempo Focado Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatSeconds(totalFocoHoje)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lembretes Pendentes</CardTitle>
            <BellRing className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lembretesPendentesCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className={activeTimer ? 'border-primary' : ''}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Timer</CardTitle>
          <span className="text-sm text-muted-foreground">
            Ciclo foco: {pomodoroConfig?.foco_min || 25} min
          </span>
        </CardHeader>
        <CardContent>
          {!activeTimer ? (
            <p className="text-muted-foreground">Nenhum pomodoro em andamento.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{activeTimer.tarefaTitulo}</p>
                  <p className="text-sm text-muted-foreground">
                    {activeTimer.isPaused ? 'Pausado' : 'Em execucao'}
                  </p>
                </div>
                <div className="text-4xl font-bold tabular-nums">{formatSeconds(remainingSeconds)}</div>
              </div>

              <Progress value={timerProgress} />

              <div className="flex flex-wrap gap-2">
                {activeTimer.isPaused ? (
                  <Button onClick={retomarPomodoro}>
                    <Play className="h-4 w-4 mr-2" />
                    Retomar
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={pausarPomodoro}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </Button>
                )}

                <Button variant="outline" onClick={() => void finalizarTimer(true)}>
                  <Square className="h-4 w-4 mr-2" />
                  Finalizar foco
                </Button>

                <Button variant="destructive" onClick={() => void finalizarTimer(false)}>
                  <StopCircle className="h-4 w-4 mr-2" />
                  Interromper
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Visao Semanal de Foco</CardTitle>
          <span className="text-sm text-muted-foreground">
            {totalPomodorosSemana} pomodoros | {formatSeconds(totalFocoSemana)}
          </span>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyFocusRows.map((row) => ({
                  dia: row.dayLabel,
                  minutos: Math.round(row.focoSegundos / 60),
                  pomodoros: row.pomodoros,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="dia" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'minutos') return [`${value} min`, 'Foco'];
                    return [value, 'Pomodoros'];
                  }}
                />
                <Bar dataKey="minutos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Top tarefas da semana</h3>
            {weeklyTopTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sem sessoes concluidas nos ultimos 7 dias.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Tarefa</th>
                      <th className="text-right p-2">Pomodoros</th>
                      <th className="text-right p-2">Tempo focado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyTopTasks.map((row) => (
                      <tr key={row.tarefaId} className="border-b hover:bg-muted/50">
                        <td className="p-2">{row.titulo}</td>
                        <td className="p-2 text-right">{row.pomodoros}</td>
                        <td className="p-2 text-right">{formatSeconds(row.focoSegundos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova Tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!form.titulo.trim()) {
                toast.warning('Informe o titulo da tarefa');
                return;
              }

              criarTarefaMutation.mutate(form);
            }}
          >
            <div className="md:col-span-2">
              <Label>Titulo</Label>
              <Input
                value={form.titulo}
                onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
                placeholder="Ex: Revisar fluxo de pagamentos"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Descricao</Label>
              <Textarea
                value={form.descricao}
                onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                placeholder="Detalhes da tarefa"
                rows={3}
              />
            </div>

            <div>
              <Label>Pomodoros planejados</Label>
              <Input
                type="number"
                min={1}
                value={form.pomodorosPlanejados}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, pomodorosPlanejados: event.target.value }))
                }
              />
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select
                value={form.prioridade}
                onValueChange={(value: NovaTarefaForm['prioridade']) =>
                  setForm((prev) => ({ ...prev, prioridade: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prazo</Label>
              <Input
                type="datetime-local"
                value={form.fimPrevisto}
                onChange={(event) => setForm((prev) => ({ ...prev, fimPrevisto: event.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={criarTarefaMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Tarefa
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Tarefas da Agenda</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="concluida">Concluidas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando tarefas...</p>
          ) : tarefas.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
          ) : (
            <div className="space-y-3">
              {tarefas.map((tarefa) => {
                const progresso = Math.min(
                  100,
                  Math.round((tarefa.pomodoros_concluidos / Math.max(tarefa.pomodoros_planejados, 1)) * 100)
                );
                const isTimerDaTarefa = activeTimer?.tarefaId === tarefa.id;
                const prioridadeClass = priorityBadgeClass[tarefa.prioridade] || priorityBadgeClass.media;
                const tarefaStatusClass = statusBadgeClass[tarefa.status] || statusBadgeClass.pendente;

                return (
                  <div
                    key={tarefa.id}
                    className={`rounded-md border p-4 space-y-3 ${isTimerDaTarefa ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{tarefa.titulo}</h3>
                        {tarefa.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">{tarefa.descricao}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${prioridadeClass}`}>
                          {prioridadeLabel[tarefa.prioridade] || tarefa.prioridade}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${tarefaStatusClass}`}>
                          {statusLabel[tarefa.status] || tarefa.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Pomodoros</p>
                        <p className="font-medium">
                          {tarefa.pomodoros_concluidos}/{tarefa.pomodoros_planejados}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tempo focado</p>
                        <p className="font-medium">{formatSeconds(tarefa.foco_segundos_total)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Prazo</p>
                        <p className="font-medium">{formatDateTime(tarefa.fim_previsto)}</p>
                      </div>
                    </div>

                    <Progress value={progresso} />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={isTimerDaTarefa ? 'secondary' : 'default'}
                        onClick={() => void iniciarPomodoro(tarefa)}
                        disabled={!!activeTimer || tarefa.status === 'concluida' || tarefa.status === 'cancelada'}
                      >
                        {isTimerDaTarefa ? (
                          <>
                            <TimerReset className="h-4 w-4 mr-2" />
                            Em execucao
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Iniciar pomodoro
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => concluirTarefaMutation.mutate(tarefa.id)}
                        disabled={tarefa.status === 'concluida'}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar concluida
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
