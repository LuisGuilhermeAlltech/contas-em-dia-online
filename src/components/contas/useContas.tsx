import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type ContaView = Tables<'contas_view'>;

export const useContas = (selectedEmpresa: string) => {
  const [contas, setContas] = useState<ContaView[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const loadContas = useCallback(async () => {
    if (loadingRef.current) {
      console.log("Carregamento já em andamento, ignorando chamada duplicada");
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      console.log("Carregando contas para empresa:", selectedEmpresa);
      
      const { data: contasData, error } = await supabase
        .from('contas_view')
        .select('*')
        .eq('empresa', selectedEmpresa)
        .order('vencimento', { ascending: true })
        .limit(5000);

      if (error) {
        console.error("Erro ao carregar contas:", error);
        throw error;
      }

      setContas(contasData || []);
      console.log("Contas carregadas:", contasData?.length || 0);
    } catch (error) {
      console.error("Erro inesperado ao carregar contas:", error);
      setContas([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [selectedEmpresa]);

  return { contas, loading, loadContas };
};
