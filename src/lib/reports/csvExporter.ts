export function csvExport(data: any[], columns: string[], filename: string = 'export'): void {
  const header = columns.join(',');
  const rows = data.map(row => columns.map(col => {
    const val = String(row[col] ?? '');
    return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
  }).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
