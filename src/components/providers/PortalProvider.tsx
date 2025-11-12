import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';

interface PortalContextValue {
  getPortalContainer: () => HTMLElement | null;
}

const PortalContext = createContext<PortalContextValue | null>(null);

interface PortalProviderProps {
  children: ReactNode;
  companyId: string;
}

export const PortalProvider = ({ children, companyId }: PortalProviderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const getPortalContainer = () => {
    return containerRef.current;
  };

  return (
    <PortalContext.Provider value={{ getPortalContainer }}>
      {children}
      <div 
        ref={containerRef}
        id="overlay-root" 
        data-company={companyId}
        className="portal-container"
      />
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within PortalProvider');
  }
  return context.getPortalContainer();
};
