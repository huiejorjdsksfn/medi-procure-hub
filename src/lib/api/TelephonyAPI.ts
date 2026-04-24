/** EL5 MediProcure v5.8 - Telephony API (Optimized) */
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

export interface PhoneCall { id:string; caller_extension?:string; caller_name?:string; callee_extension?:string; callee_name?:string; direction:string; start_time:string; answer_time?:string; end_time?:string; duration_seconds?:number; status:string; recording_url?:string; ivr_path?:string[]; transferred_to?:string; department?:string; notes?:string; }
export interface PhoneExtension { id:string; extension_number:string; display_name:string; department?:string; status:string; forward_to?:string; voicemail_enabled:boolean; last_seen?:string; }
export interface IVRMenu { id:string; menu_key:string; name:string; greeting_text:string; timeout_ms:number; max_retries:number; fallback_action:string; is_active:boolean; sort_order:number; }
export interface IVROption { id:string; menu_id:string; digit:string; description:string; action:string; target:string; sort_order:number; }
export interface CallQueue { id:string; name:string; display_name:string; strategy:string; max_wait_seconds:number; is_active:boolean; }
export interface Voicemail { id:string; for_extension:string; from_number?:string; from_name?:string; audio_url?:string; transcript?:string; duration_seconds?:number; status:string; received_at:string; }

export const TelephonyAPI = {
  /** Batch-load all call center data in parallel */
  async loadAll() {
    const [calls,exts,ivr,queues,vm] = await Promise.all([
      db.from("phone_calls").select("*").order("start_time",{ascending:false}).limit(100),
      db.from("phone_extensions").select("*").order("extension_number"),
      db.from("ivr_menus").select("*, ivr_options(*)").eq("is_active",true).order("sort_order"),
      db.from("call_queues").select("*, queue_agents(*)").eq("is_active",true),
      db.from("voicemails").select("*").eq("status","new").order("received_at",{ascending:false}).limit(20),
    ]);
    return { calls:calls.data||[], extensions:exts.data||[], menus:ivr.data||[], queues:queues.data||[], voicemails:vm.data||[] };
  },
  async logCall(call: Partial<PhoneCall>): Promise<PhoneCall> {
    const { data,error } = await db.from("phone_calls").insert({ ...call, start_time:new Date().toISOString() }).select().single();
    if(error) throw new Error(error.message); return data;
  },
  async updateCall(id:string, updates:Partial<PhoneCall>) { await db.from("phone_calls").update(updates).eq("id",id); },
  async updateExtensionStatus(id:string, status:string) { await db.from("phone_extensions").update({ status, last_seen:new Date().toISOString() }).eq("id",id); },
  async getCallMetrics(days=7) {
    const since = new Date(Date.now()-days*86400000).toISOString();
    const { data } = await db.from("phone_calls").select("status,duration_seconds,direction").gte("start_time",since);
    const calls = data||[];
    return {
      total: calls.length,
      answered: calls.filter((c:any)=>c.status==="completed").length,
      missed: calls.filter((c:any)=>c.status==="missed").length,
      avgDuration: calls.filter((c:any)=>c.duration_seconds).reduce((s:number,c:any)=>s+(c.duration_seconds||0),0)/Math.max(1,calls.filter((c:any)=>c.duration_seconds).length),
      inbound: calls.filter((c:any)=>c.direction==="inbound").length,
      outbound: calls.filter((c:any)=>c.direction==="outbound").length,
    };
  },
  async makeCall(from:string, to:string, notes?:string): Promise<PhoneCall> {
    return TelephonyAPI.logCall({ caller_extension:from, callee_extension:to, direction:"outbound", status:"ringing", notes });
  },
  async answerCall(id:string) { await TelephonyAPI.updateCall(id,{ status:"connected", answer_time:new Date().toISOString() }); },
  async endCall(id:string, durationSec:number) { await TelephonyAPI.updateCall(id,{ status:"completed", end_time:new Date().toISOString(), duration_seconds:durationSec }); },
  async getVoicemails(extension:string): Promise<Voicemail[]> {
    const { data } = await db.from("voicemails").select("*").eq("for_extension",extension).eq("status","new").order("received_at",{ascending:false});
    return data||[];
  },
  async markVoicemailListened(id:string) { await db.from("voicemails").update({ status:"listened" }).eq("id",id); },
  async saveIVRMenu(menu: Partial<IVRMenu>): Promise<void> { await db.from("ivr_menus").upsert(menu, {onConflict:"menu_key"}); },
  async saveIVROption(opt: Partial<IVROption>): Promise<void> { await db.from("ivr_options").upsert(opt); },
  async deleteIVROption(id:string) { await db.from("ivr_options").delete().eq("id",id); },
};
