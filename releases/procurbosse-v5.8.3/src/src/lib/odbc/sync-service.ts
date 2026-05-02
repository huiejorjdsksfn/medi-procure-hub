export interface SyncLog {
  id: string;
  table_name: string;
  records_synced: number;
  status: 'success' | 'error' | 'partial';
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface SyncResult {
  table: string;
  inserted: number;
  updated: number;
  errors: number;
  duration_ms: number;
}

export const createSyncLog = (table: string): Partial<SyncLog> => ({
  table_name: table,
  records_synced: 0,
  status: 'success',
  started_at: new Date().toISOString(),
});

export const calculateSyncStats = (results: SyncResult[]): {
  totalRecords: number;
  totalErrors: number;
  totalDuration: number;
  successRate: number;
} => {
  const totalRecords = results.reduce((s, r) => s + r.inserted + r.updated, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors, 0);
  const totalDuration = results.reduce((s, r) => s + r.duration_ms, 0);
  const successRate = totalRecords > 0 ? Math.round(((totalRecords - totalErrors) / totalRecords) * 100) : 100;
  return { totalRecords, totalErrors, totalDuration, successRate };
};
