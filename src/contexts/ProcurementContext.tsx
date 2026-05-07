import { createContext, useContext, ReactNode } from 'react';
import { useProcurement } from '@/hooks/useProcurement';

interface ProcurementContextType {
  requisitions: any[];
  purchaseOrders: any[];
  loading: boolean;
  refetchRequisitions: () => Promise<void>;
  refetchPurchaseOrders: () => Promise<void>;
}

const ProcurementContext = createContext<ProcurementContextType>({
  requisitions: [],
  purchaseOrders: [],
  loading: true,
  refetchRequisitions: async () => {},
  refetchPurchaseOrders: async () => {},
});

export const useProcurementContext = () => useContext(ProcurementContext);

export const ProcurementProvider = ({ children }: { children: ReactNode }) => {
  const procurement = useProcurement();
  return (
    <ProcurementContext.Provider value={procurement}>
      {children}
    </ProcurementContext.Provider>
  );
};
