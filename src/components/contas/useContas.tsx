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
      
      const { data: contasData, error, count } = await supabase
        .from('contas_view')
        .select('*', { count: 'exact' })
        .eq('empresa', selectedEmpresa)
        .order('vencimento', { ascending: true })
        .range(0, 4999); // Buscar até 5000 registros

      if (error) {
        console.error("Erro ao carregar contas:", error);
        throw error;
      }

      setContas(contasData || []);
      const total = contasData?.length || 0;
      const apos07 = contasData?.filter(c => c.vencimento && c.vencimento > '2025-11-07').length || 0;
      console.log(`✅ Contas carregadas: ${total} (${apos07} após 07/11)`);
      if (contasData && contasData.length > 0) {
        const ultima = contasData[contasData.length - 1];
        console.log(`📅 Última data: ${ultima.vencimento} - ${ultima.descricao}`);
      }
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
