import { createContext, useContext, ReactNode } from 'react';
import { useInventory } from '@/hooks/useInventory';

interface InventoryContextType {
  items: any[];
  categories: any[];
  loading: boolean;
  lowStockItems: any[];
  outOfStockItems: any[];
  totalValue: number;
  refetchItems: () => Promise<void>;
  refetchCategories: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType>({
  items: [], categories: [], loading: true,
  lowStockItems: [], outOfStockItems: [], totalValue: 0,
  refetchItems: async () => {}, refetchCategories: async () => {},
});

export const useInventoryContext = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const inventory = useInventory();
  return (
    <InventoryContext.Provider value={inventory}>
      {children}
    </InventoryContext.Provider>
  );
};
