/**
 * NotificationEngine v1.0 — Real-time in-app + browser push
 * EL5 MediProcure / ProcurBosse
 */
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;
type NotifHandler = (n: any) => void;
const handlers: NotifHandler[] = [];
let ch: any = null;

export const NotificationEngine = {
  subscribe(userId: string, onNotif: NotifHandler) {
    handlers.push(onNotif);
    if (ch) return;
    ch = db.channel(`notif:${userId}`)
      .on("postgres_changes",{ event:"INSERT",schema:"public",table:"notifications",filter:`user_id=eq.${userId}` },
        (p:any)=>{ handlers.forEach(h=>h(p.new)); NotificationEngine.showBrowserPush(p.new.title, p.new.message); })
      .subscribe();
  },
  unsubscribe(){ if(ch){db.removeChannel(ch);ch=null;} handlers.length=0; },
  async markRead(id:string){ await db.from("notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("id",id); },
  async markAllRead(userId:string){ await db.from("notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("user_id",userId).eq("is_read",false); },
  async create(p:{user_id:string;title:string;message:string;type?:string;link?:string;priority?:string}){
    await db.from("notifications").insert({...p,type:p.type||"info",priority:p.priority||"normal",is_read:false});
  },
  async getUnreadCount(userId:string):Promise<number>{
    const{count}=await db.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",userId).eq("is_read",false);
    return count||0;
  },
  async requestPushPermission():Promise<boolean>{
    if(!("Notification" in window)) return false;
    return (await Notification.requestPermission())==="granted";
  },
  showBrowserPush(title:string,body:string,icon="/icons/icon-128.png"){
    if(typeof Notification!=="undefined"&&Notification.permission==="granted") new Notification(title,{body,icon,tag:"el5"});
  },
};
export default NotificationEngine;
