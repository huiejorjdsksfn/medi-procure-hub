/**
 * ValidationEngine v1.0 — Form + business rule validation
 * EL5 MediProcure / ProcurBosse
 */
export type VResult = { valid: boolean; errors: Record<string,string>; };

function req(v:any, label:string):string|null { return (!v&&v!==0) ? `${label} is required` : null; }
function minLen(v:string,n:number,label:string):string|null { return v&&v.length<n?`${label} must be at least ${n} characters`:null; }
function isEmail(v:string):boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function isPhone(v:string):boolean { return /^(\+?\d[\d\s\-]{7,15})$/.test(v); }
function isPositive(v:any):boolean { return !isNaN(v)&&Number(v)>0; }

function validate(rules: Array<string|null>): VResult {
  const errors: Record<string,string> = {};
  for (const r of rules) { if(r) { const[field,...rest]=r.split(":"); errors[field.trim()]=(rest.join(":")||r).trim(); } }
  return { valid: Object.keys(errors).length===0, errors };
}

export const ValidationEngine = {
  supplier(data:any): VResult {
    return validate([
      req(data.name,"name") ? "name:Supplier name is required" : null,
      data.email&&!isEmail(data.email) ? "email:Invalid email address" : null,
      data.phone&&!isPhone(data.phone) ? "phone:Invalid phone number" : null,
      req(data.status,"status") ? "status:Status is required" : null,
    ].filter(Boolean));
  },
  requisition(data:any): VResult {
    return validate([
      req(data.title,"title") ? "title:Title is required" : null,
      req(data.department,"department") ? "department:Department is required" : null,
      req(data.required_date,"required_date") ? "required_date:Required date is required" : null,
    ].filter(Boolean));
  },
  purchaseOrder(data:any): VResult {
    return validate([
      req(data.supplier_id,"supplier") ? "supplier_id:Supplier is required" : null,
      req(data.delivery_date,"delivery_date") ? "delivery_date:Delivery date is required" : null,
      !data.total_amount||!isPositive(data.total_amount) ? "total_amount:Amount must be positive" : null,
    ].filter(Boolean));
  },
  tender(data:any): VResult {
    return validate([
      req(data.title,"title") ? "title:Title is required" : null,
      req(data.category,"category") ? "category:Category is required" : null,
      req(data.closing_date,"closing_date") ? "closing_date:Closing date is required" : null,
      !data.estimated_value||!isPositive(data.estimated_value) ? "estimated_value:Estimated value must be positive" : null,
    ].filter(Boolean));
  },
  voucher(data:any): VResult {
    return validate([
      req(data.payee_name||data.received_from,"payee") ? "payee_name:Payee is required" : null,
      !data.amount||!isPositive(data.amount) ? "amount:Amount must be positive" : null,
      req(data.payment_method,"payment_method") ? "payment_method:Payment method is required" : null,
    ].filter(Boolean));
  },
  item(data:any): VResult {
    return validate([
      req(data.name,"name") ? "name:Item name is required" : null,
      req(data.unit,"unit") ? "unit:Unit of measure is required" : null,
      data.current_quantity<0 ? "current_quantity:Quantity cannot be negative" : null,
      data.reorder_level<0 ? "reorder_level:Reorder level cannot be negative" : null,
    ].filter(Boolean));
  },
  user(data:any): VResult {
    return validate([
      req(data.full_name,"full_name") ? "full_name:Full name is required" : null,
      req(data.email,"email") ? "email:Email is required" : null,
      data.email&&!isEmail(data.email) ? "email:Invalid email address" : null,
      req(data.role,"role") ? "role:Role is required" : null,
    ].filter(Boolean));
  },
  budget(data:any): VResult {
    return validate([
      req(data.title,"title") ? "title:Title is required" : null,
      req(data.fiscal_year,"fiscal_year") ? "fiscal_year:Fiscal year is required" : null,
      !data.total_amount||!isPositive(data.total_amount) ? "total_amount:Budget amount must be positive" : null,
    ].filter(Boolean));
  },
};
export default ValidationEngine;
