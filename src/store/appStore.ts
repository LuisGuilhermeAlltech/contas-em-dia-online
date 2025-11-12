import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  selectedCompanyId: string;
  selectedCompanyName: string;
  setCompany: (id: string, name: string) => void;
}

const COMPANIES = {
  'alltech-matriz': 'AllTech Matriz',
  'alltech-filial': 'AllTech Filial',
  'grupo-lider': 'Grupo Líder',
  'adryssia-cortez': 'Adryssia Cortez',
  'luis-guilherme': 'Luis Guilherme',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedCompanyId: 'alltech-matriz',
      selectedCompanyName: 'AllTech Matriz',
      setCompany: (id: string, name: string) => {
        set({ selectedCompanyId: id, selectedCompanyName: name });
      },
    }),
    {
      name: 'cd_selected_company',
    }
  )
);

export { COMPANIES };
