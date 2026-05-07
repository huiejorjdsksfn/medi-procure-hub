/**
 * WorkflowEngine v1.0 — ERP approval workflows
 * Manages: Requisition → PO → GRN → Payment approval chains
 * EL5 MediProcure / ProcurBosse
 */
import { supabase } from "@/integrations/supabase/client";
import NotificationEngine from "@/engines/notification/NotificationEngine";
const db = supabase as any;

type WorkflowAction = "submit"|"approve"|"reject"|"return"|"complete";
type WorkflowTable = "requisitions"|"purchase_orders"|"payment_vouchers"|"tenders"|"contracts";

async function getApprovers(role:string): Promise<string[]> {
  const { data } = await db.from("user_roles").select("user_id").in("role",[role,"admin","superadmin"]);
  return (data||[]).map((r:any)=>r.user_id);
}

async function notifyApprovers(table:string, item:any, action:string, approvers:string[]) {
  for (const uid of approvers) {
    await NotificationEngine.create({
      user_id: uid,
      title: `${action.charAt(0).toUpperCase()+action.slice(1)} Required`,
      message: `${table.replace(/_/g," ")} #${item.requisition_number||item.po_number||item.voucher_number||item.id} requires your ${action}`,
      type: "workflow",
      link: `/${table.replace(/_/g,"-")}`,
      priority: "high",
    });
  }
}

export const WorkflowEngine = {
  async transition(table:WorkflowTable, id:string, action:WorkflowAction, userId:string, reason?:string):Promise<{ok:boolean;error?:string}> {
    const statusMap:Record<WorkflowAction,string> = {
      submit:"submitted", approve:"approved", reject:"rejected", return:"draft", complete:"completed"
    };
    const newStatus = statusMap[action];
    const now = new Date().toISOString();
    const updates:any = { status:newStatus, updated_at:now };
    if(action==="approve"){ updates.approved_by=userId; updates.approved_at=now; }
    if(action==="reject"){  updates.rejected_by=userId; updates.rejected_at=now; if(reason) updates.rejection_reason=reason; }

    const { error } = await db.from(table).update(updates).eq("id",id);
    if(error) return { ok:false, error:error.message };

    // Notify next approvers
    if(action==="submit") {
      const approvers = await getApprovers("procurement_manager");
      const { data:item } = await db.from(table).select("*").eq("id",id).single();
      if(item) await notifyApprovers(table,item,"approval",approvers);
    }
    return { ok:true };
  },

  /** Get approval history for an item */
  async getHistory(table:string, id:string): Promise<any[]> {
    const { data } = await db.from("audit_log").select("*").eq("table_name",table).eq("record_id",id).order("created_at",{ascending:false}).limit(20);
    return data||[];
  },

  /** Check if user can approve */
  canApprove(userRoles:string[]): boolean {
    return userRoles.some(r=>["admin","superadmin","procurement_manager"].includes(r));
  },
};
export default WorkflowEngine;
