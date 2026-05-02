/** EL5 MediProcure v5.8 - Reception API (Optimized) */
import { supabase } from "@/integrations/supabase/client";
import { cacheEngine } from "@/engines/cache/CascadeCacheEngine";
const db = supabase as any;

export interface Visitor { id:string; full_name:string; phone?:string; id_number?:string; organization?:string; purpose?:string; host_name?:string; host_department?:string; badge_number?:string; temperature?:number; notes?:string; status:string; check_in_time:string; check_out_time?:string; created_at:string; }
export interface Appointment { id:string; visitor_name:string; visitor_phone?:string; host_name?:string; host_department?:string; scheduled_time:string; duration_minutes?:number; purpose?:string; status:string; notes?:string; reminder_sent?:boolean; created_at:string; }
export interface ReceptionDashboard { totalToday:number; activeNow:number; appointmentsToday:number; callsToday:number; messagesOut:number; }

export const ReceptionAPI = {
  async getDashboard(): Promise<ReceptionDashboard> {
    const cached = cacheEngine.get<ReceptionDashboard>("reception:dashboard");
    if (cached) return cached;
    const today = new Date(); today.setHours(0,0,0,0);
    const iso = today.toISOString();
    const [v,active,appts,calls,msgs] = await Promise.all([
      db.from("reception_visitors").select("id",{count:"exact",head:true}).gte("check_in_time",iso),
      db.from("reception_visitors").select("id",{count:"exact",head:true}).in("status",["waiting","checked_in"]),
      db.from("reception_appointments").select("id",{count:"exact",head:true}).gte("scheduled_time",iso),
      db.from("reception_calls").select("id",{count:"exact",head:true}).gte("called_at",iso),
      db.from("reception_messages").select("id",{count:"exact",head:true}).eq("direction","outbound").gte("created_at",iso),
    ]);
    const result = { totalToday:v.count||0, activeNow:active.count||0, appointmentsToday:appts.count||0, callsToday:calls.count||0, messagesOut:msgs.count||0 };
    cacheEngine.set("reception:dashboard", result, { ttl:30 });
    return result;
  },
  async getVisitors(limit=100) { const { data } = await db.from("reception_visitors").select("*").order("check_in_time",{ascending:false}).limit(limit); return (data||[]) as Visitor[]; },
  async checkIn(visitor: Partial<Visitor>): Promise<Visitor> {
    const { data,error } = await db.from("reception_visitors").insert({ ...visitor, status:"waiting", badge_number:`VB-${Date.now().toString(36).toUpperCase()}`, check_in_time:new Date().toISOString() }).select().single();
    if (error) throw new Error(error.message);
    cacheEngine.delete("reception:dashboard"); return data;
  },
  async updateStatus(id:string, status:string) { await db.from("reception_visitors").update({ status, ...(status==="checked_out"?{check_out_time:new Date().toISOString()}:{}) }).eq("id",id); cacheEngine.delete("reception:dashboard"); },
  async getAppointments(): Promise<Appointment[]> { const { data } = await db.from("reception_appointments").select("*").order("scheduled_time",{ascending:true}).gte("scheduled_time",new Date().toISOString()).limit(50); return data||[]; },
  async createAppointment(appt: Partial<Appointment>): Promise<Appointment> { const { data,error } = await db.from("reception_appointments").insert({ ...appt, status:"scheduled" }).select().single(); if(error) throw new Error(error.message); return data; },
  async logCall(call: Record<string,unknown>) { await db.from("reception_calls").insert({ ...call, called_at:new Date().toISOString() }); },
  async sendMessage(msg: Record<string,unknown>) {
    const { error } = await supabase.functions.invoke("send-sms", { body:{ to:msg.recipient_phone, message:msg.message_body, hospitalName:"EL5 MediProcure", channel:msg.message_type==="whatsapp"?"whatsapp":"sms" } });
    await db.from("reception_messages").insert({ ...msg, direction:"outbound", status:error?"failed":"sent", sent_at:new Date().toISOString() });
  },
};
