import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Empresa {
  id: string;
  nome: string;
  slug: string;
}

export function useEmpresas() {
  return useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome, slug')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return (data || []) as Empresa[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useEmpresaId(slug: string) {
  const { data: empresas } = useEmpresas();
  return empresas?.find(e => e.slug === slug)?.id || null;
}
