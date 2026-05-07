export function populateTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  Object.entries(data).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  });
  return result;
}

export const TEMPLATES = {
  requisition: `STORES REQUISITION\n\nReq No: {{requisition_number}}\nDate: {{date}}\nDepartment: {{department}}\nPriority: {{priority}}\n\nJustification: {{justification}}\n\nItems:\n{{items}}\n\nTotal Amount: KSH {{total_amount}}\n\nRequested by: {{requested_by}}\nApproved by: {{approved_by}}`,
  purchaseOrder: `LOCAL PURCHASE ORDER\n\nLPO No: {{po_number}}\nDate: {{date}}\nSupplier: {{supplier_name}}\nDelivery Date: {{delivery_date}}\n\nItems:\n{{items}}\n\nTotal: KSH {{total_amount}}\n\nAuthorized by: {{authorized_by}}`,
  goodsReceived: `GOODS RECEIVED NOTE\n\nGRN No: {{grn_number}}\nDate: {{date}}\nPO Ref: {{po_reference}}\nSupplier: {{supplier_name}}\n\nInspection: {{inspection_status}}\nNotes: {{notes}}\n\nReceived by: {{received_by}}`,
};
