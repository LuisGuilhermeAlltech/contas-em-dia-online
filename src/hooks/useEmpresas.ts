import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Empresa {
  id: string;
  nome: string;
  slug: string | null;
}

export interface CompanyOption {
  id: string;
  name: string;
  slugs: string[];
  empresaIds: string[];
  isGroup: boolean;
  stores: Array<{
    id: string;
    nome: string;
    slug: string;
  }>;
}

const ALLTECH_GROUP_ID = 'grupo-alltech';
const EMPTY_STORE_ARRAY: CompanyOption['stores'] = [];

const isAlltechStore = (empresa: Empresa): boolean =>
  (empresa.slug || '').toLowerCase().includes('alltech');

export function buildCompanyOptions(empresas: Empresa[]): CompanyOption[] {
  const withSlug = empresas.filter(
    (empresa): empresa is Empresa & { slug: string } => Boolean(empresa.slug)
  );

  const alltechStores = withSlug.filter(isAlltechStore);
  const otherStores = withSlug.filter((empresa) => !isAlltechStore(empresa));

  const options: CompanyOption[] = [];

  if (alltechStores.length > 1) {
    options.push({
      id: ALLTECH_GROUP_ID,
      name: 'Grupo Alltech',
      slugs: alltechStores.map((empresa) => empresa.slug),
      empresaIds: alltechStores.map((empresa) => empresa.id),
      isGroup: true,
      stores: alltechStores.map((empresa) => ({
        id: empresa.id,
        nome: empresa.nome,
        slug: empresa.slug,
      })),
    });
  }

  otherStores.forEach((empresa) => {
    options.push({
      id: empresa.slug,
      name: empresa.nome,
      slugs: [empresa.slug],
      empresaIds: [empresa.id],
      isGroup: false,
      stores: [
        {
          id: empresa.id,
          nome: empresa.nome,
          slug: empresa.slug,
        },
      ],
    });
  });

  if (alltechStores.length <= 1) {
    alltechStores.forEach((empresa) => {
      options.push({
        id: empresa.slug,
        name: empresa.nome,
        slugs: [empresa.slug],
        empresaIds: [empresa.id],
        isGroup: false,
        stores: [
          {
            id: empresa.id,
            nome: empresa.nome,
            slug: empresa.slug,
          },
        ],
      });
    });
  }

  return options;
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

export function useCompanyOptions() {
  const { data: empresas = [] } = useEmpresas();

  return useMemo(() => buildCompanyOptions(empresas), [empresas]);
}

export function useEmpresaId(slug: string) {
  const { data: empresas } = useEmpresas();
  return empresas?.find((e) => e.slug === slug)?.id || null;
}

export function useSelectedCompanyScope(selectedCompanyId: string) {
  const companyOptions = useCompanyOptions();

  const selectedOption =
    companyOptions.find((option) => option.id === selectedCompanyId) || null;

  const selectedCompanySlugs = selectedOption?.slugs || [];
  const selectedEmpresaIds = selectedOption?.empresaIds || [];
  const stores = selectedOption?.stores || EMPTY_STORE_ARRAY;

  const slugToName = useMemo(
    () =>
      new Map(
        stores.map((store) => [store.slug, store.nome])
      ),
    [stores]
  );

  return {
    companyOptions,
    selectedOption,
    selectedCompanySlugs,
    selectedEmpresaIds,
    stores,
    slugToName,
    isGroupSelection: Boolean(selectedOption?.isGroup),
  };
}
