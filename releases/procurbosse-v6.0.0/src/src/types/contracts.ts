export interface Contract {
  id: string;
  contract_number: string;
  title: string;
  supplier_id: string | null;
  description: string | null;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'terminated' | 'draft';
  total_value: number;
  performance_score: number;
  milestones: ContractMilestone[];
  delivery_terms: string | null;
  payment_terms: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractMilestone {
  title: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  description?: string;
}

export interface ContractAmendment {
  id: string;
  contract_id: string;
  amendment_number: string;
  description: string;
  effective_date: string;
  created_by: string;
  created_at: string;
}
