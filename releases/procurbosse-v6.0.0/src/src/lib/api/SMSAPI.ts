/** EL5 MediProcure v5.8 - SMS API (Optimized with bulk, templates, conversations) */
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

export interface SMSMessage { id:string; recipient_name?:string; recipient_phone:string; message_body:string; message_type:string; direction:string; department?:string; status:string; twilio_sid?:string; segments?:number; cost?:number; sent_at?:string; delivered_at?:string; created_at:string; }
export interface SMSTemplate { id:string; name:string; content:string; variables:string[]; category:string; is_active:boolean; use_count:number; created_at:string; }
export interface SMSConversation { id:string; phone_number:string; contact_name?:string; status:string; assigned_to?:string; department?:string; last_message?:string; last_message_at?:string; unread_count:number; created_at:string; }
export interface BulkOperation { id:string; name?:string; body:string; recipients_count:number; successful_count:number; failed_count:number; status:string; created_at:string; }

function fmt254(phone:string): string {
  const n = phone.replace(/\D/g,"");
  if (n.startsWith("0")) return "+254"+n.slice(1);
  if (n.startsWith("254")) return "+"+n;
  if (n.startsWith("+")) return phone;
  return "+254"+n;
}

export const SMSAPI = {
  /** Load messages + templates + conversations in parallel */
  async loadAll() {
    const [msgs,templates,convos,bulk] = await Promise.all([
      db.from("reception_messages").select("*").order("created_at",{ascending:false}).limit(200),
      db.from("sms_templates").select("*").eq("is_active",true).order("category"),
      db.from("sms_conversations").select("*").order("last_message_at",{ascending:false}).limit(50),
      db.from("sms_bulk_operations").select("*").order("created_at",{ascending:false}).limit(20),
    ]);
    return { messages:msgs.data||[], templates:templates.data||[], conversations:convos.data||[], bulkOps:bulk.data||[] };
  },

  async send(phone:string, body:string, opts?:{name?:string; dept?:string; type?:string; templateId?:string}): Promise<{ok:boolean; error?:string}> {
    const to = fmt254(phone);
    const channel = opts?.type === "whatsapp" ? "whatsapp" : "sms";
    // Edge function handles logging - no duplicate client-side insert needed
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: { to, message:body, channel, recipient_name:opts?.name, department:opts?.dept }
    });
    return { ok: !error && (data?.ok ?? true), error: error?.message || data?.results?.[0]?.error };
  },

  async sendBulk(phones:string[], body:string, opts?:{name?:string; dept?:string; templateId?:string}): Promise<{total:number;ok:number;failed:number}> {
    const { data:bulkOp } = await db.from("sms_bulk_operations").insert({ body, recipients_count:phones.length, successful_count:0, failed_count:0, status:"running", started_at:new Date().toISOString(), template_id:opts?.templateId||null }).select().single();
    let ok=0, failed=0;
    // Process in chunks of 5 with 200ms delay
    for (let i=0; i<phones.length; i+=5) {
      const chunk = phones.slice(i,i+5);
      const results = await Promise.all(chunk.map(p=>SMSAPI.send(p,body,opts)));
      ok += results.filter(r=>r.ok).length;
      failed += results.filter(r=>!r.ok).length;
      if (i+5<phones.length) await new Promise(r=>setTimeout(r,200));
    }
    if (bulkOp) await db.from("sms_bulk_operations").update({ successful_count:ok, failed_count:failed, status:"completed", completed_at:new Date().toISOString() }).eq("id",bulkOp.id);
    return { total:phones.length, ok, failed };
  },

  renderTemplate(template:SMSTemplate, vars:Record<string,string>): string {
    return template.content.replace(/\{\{(\w+)\}\}/g, (_,key)=>vars[key]||`{{${key}}}`);
  },

  async createTemplate(t:Partial<SMSTemplate>): Promise<SMSTemplate> {
    const { data,error } = await db.from("sms_templates").insert({ ...t, use_count:0, is_active:true }).select().single();
    if(error) throw new Error(error.message); return data;
  },

  async updateTemplate(id:string, t:Partial<SMSTemplate>) { await db.from("sms_templates").update(t).eq("id",id); },
  async deleteTemplate(id:string) { await db.from("sms_templates").update({ is_active:false }).eq("id",id); },

  async getConversationMessages(phone:string): Promise<SMSMessage[]> {
    const { data } = await db.from("reception_messages").select("*").eq("recipient_phone",fmt254(phone)).order("created_at",{ascending:true}).limit(100);
    return data||[];
  },

  async assignConversation(id:string, userId:string, dept:string) { await db.from("sms_conversations").update({ assigned_to:userId, department:dept, status:"assigned" }).eq("id",id); },
  async closeConversation(id:string) { await db.from("sms_conversations").update({ status:"closed" }).eq("id",id); },

  async getMetrics(days=7) {
    const since = new Date(Date.now()-days*86400000).toISOString();
    const { data } = await db.from("reception_messages").select("status,message_type,direction,segments").gte("created_at",since);
    const msgs = data||[];
    return {
      total: msgs.length,
      sent: msgs.filter((m:any)=>m.direction==="outbound").length,
      received: msgs.filter((m:any)=>m.direction==="inbound").length,
      failed: msgs.filter((m:any)=>m.status==="failed").length,
      delivered: msgs.filter((m:any)=>m.status==="delivered").length,
      whatsapp: msgs.filter((m:any)=>m.message_type==="whatsapp").length,
      sms: msgs.filter((m:any)=>m.message_type==="sms").length,
    };
  },
};
