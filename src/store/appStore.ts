import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  selectedCompanyId: string;
  selectedCompanyName: string;
  overlaysOpen: Set<string>;
  setCompany: (id: string, name: string) => void;
  registerOverlay: (id: string) => void;
  unregisterOverlay: (id: string) => void;
  closeAllOverlays: () => void;
}

const COMPANIES = {
  'alltech-matriz': 'AllTech Matriz',
  'alltech-filial': 'AllTech Filial',
  'grupo-lider': 'Grupo Líder',
  'luis-guilherme': 'Luis Guilherme',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      selectedCompanyId: 'alltech-matriz',
      selectedCompanyName: 'AllTech Matriz',
      overlaysOpen: new Set<string>(),
      setCompany: (id: string, name: string) => {
        // Close all overlays before switching company
        get().closeAllOverlays();
        set({ selectedCompanyId: id, selectedCompanyName: name });
      },
      registerOverlay: (id: string) => {
        set((state) => {
          const newSet = new Set(state.overlaysOpen);
          newSet.add(id);
          return { overlaysOpen: newSet };
        });
      },
      unregisterOverlay: (id: string) => {
        set((state) => {
          const newSet = new Set(state.overlaysOpen);
          newSet.delete(id);
          return { overlaysOpen: newSet };
        });
      },
      closeAllOverlays: () => {
        set({ overlaysOpen: new Set<string>() });
      },
    }),
    {
      name: 'cd_selected_company',
      partialize: (state) => ({
        selectedCompanyId: state.selectedCompanyId,
        selectedCompanyName: state.selectedCompanyName,
      }),
    }
  )
);

export { COMPANIES };
