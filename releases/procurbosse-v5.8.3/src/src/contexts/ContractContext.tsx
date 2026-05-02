import { createContext, useContext, ReactNode } from 'react';
import { useContracts } from '@/hooks/useContracts';

interface ContractContextType {
  contracts: any[];
  loading: boolean;
  activeContracts: any[];
  expiringContracts: any[];
  totalContractValue: number;
  refetchContracts: () => Promise<void>;
}

const ContractContext = createContext<ContractContextType>({
  contracts: [], loading: true,
  activeContracts: [], expiringContracts: [], totalContractValue: 0,
  refetchContracts: async () => {},
});

export const useContractContext = () => useContext(ContractContext);

export const ContractProvider = ({ children }: { children: ReactNode }) => {
  const contracts = useContracts();
  return (
    <ContractContext.Provider value={contracts}>
      {children}
    </ContractContext.Provider>
  );
};
