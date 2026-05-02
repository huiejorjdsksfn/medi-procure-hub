export interface PaginationParams {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParams {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in';
  value: any;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export type StatusType = 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'draft';

export const STATUS_COLORS: Record<StatusType, string> = {
  active: 'bg-emerald-500/10 text-emerald-600',
  inactive: 'bg-muted text-muted-foreground',
  pending: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-emerald-500/10 text-emerald-600',
  rejected: 'bg-destructive/10 text-destructive',
  draft: 'bg-blue-500/10 text-blue-600',
};
