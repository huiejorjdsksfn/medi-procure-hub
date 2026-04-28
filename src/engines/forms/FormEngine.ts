/**
 * FormEngine v1.0 — Auto-generates field state + validation + save
 * All ERP forms use this for consistent UX + error display
 * EL5 MediProcure / ProcurBosse
 */
import { ValidationEngine } from "@/engines/validation/ValidationEngine";
import { ERPCache } from "@/lib/erp-cache";

type FormType = "supplier"|"requisition"|"purchaseOrder"|"tender"|"voucher"|"item"|"user"|"budget";

export function createFormEngine<T extends Record<string,any>>(defaults:T) {
  let _state: T = { ...defaults };
  let _errors: Record<string,string> = {};
  const _listeners: Array<(s:T)=>void> = [];

  return {
    get state(){ return _state; },
    get errors(){ return _errors; },
    set(key:keyof T, val:any){ _state={..._state,[key]:val}; delete _errors[key as string]; _listeners.forEach(l=>l(_state)); },
    setMany(vals:Partial<T>){ _state={..._state,...vals}; _listeners.forEach(l=>l(_state)); },
    reset(){ _state={...defaults}; _errors={}; _listeners.forEach(l=>l(_state)); },
    onChange(fn:(s:T)=>void){ _listeners.push(fn); return ()=>{const i=_listeners.indexOf(fn);if(i>-1)_listeners.splice(i,1);}; },
    validate(type:FormType):boolean{
      const v=ValidationEngine[type]?.(_state as any);
      if(!v) return true;
      _errors=v.errors;
      return v.valid;
    },
    async autosave(key:string, ttl=10*60_000){ await ERPCache.set("autosave:"+key, _state, ttl); },
    async loadAutosave(key:string):Promise<boolean>{
      const d=await ERPCache.get<T>("autosave:"+key);
      if(d){ _state={..._state,...d}; _listeners.forEach(l=>l(_state)); return true; } return false;
    },
    clearAutosave(key:string){ ERPCache.del("autosave:"+key); },
  };
}

export default createFormEngine;
