import { exportToPDF } from '@/lib/export';

export const useExport = () => {
  const exportPDF = (data: any[], title: string, columns: string[]) => {
    exportToPDF(data, title, columns);
  };

  return { exportPDF };
};
