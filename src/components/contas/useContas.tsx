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
      console.log("🔄 Carregando contas com paginação para empresa:", selectedEmpresa);
      
      // Primeiro, buscar o count total
      const { count: totalCount, error: countError } = await supabase
        .from('contas_view')
        .select('*', { count: 'exact', head: true })
        .eq('empresa', selectedEmpresa);

      if (countError) {
        console.error("❌ Erro ao contar contas:", countError);
        throw countError;
      }

      console.log(`📊 Total de contas no banco: ${totalCount}`);

      // Carregar todas as contas usando paginação de 1000 em 1000
      const pageSize = 1000;
      const totalPages = Math.ceil((totalCount || 0) / pageSize);
      let allContas: ContaView[] = [];

      for (let page = 0; page < totalPages; page++) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        console.log(`📥 Carregando página ${page + 1}/${totalPages} (registros ${from}-${to})`);
        
        const { data: pageData, error: pageError } = await supabase
          .from('contas_view')
          .select('*')
          .eq('empresa', selectedEmpresa)
          .order('vencimento', { ascending: true })
          .range(from, to);

        if (pageError) {
          console.error(`❌ Erro ao carregar página ${page + 1}:`, pageError);
          throw pageError;
        }

        if (pageData) {
          allContas = [...allContas, ...pageData];
          console.log(`✓ Página ${page + 1} carregada: ${pageData.length} registros`);
        }
      }

      setContas(allContas);
      const apos07 = allContas.filter(c => c.vencimento && c.vencimento > '2025-11-07').length;
      console.log(`✅ Total carregado: ${allContas.length} de ${totalCount} (${apos07} após 07/11)`);
      
      if (allContas.length > 0) {
        const ultima = allContas[allContas.length - 1];
        console.log(`📅 Última conta: ${ultima.vencimento} - ${ultima.descricao}`);
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
