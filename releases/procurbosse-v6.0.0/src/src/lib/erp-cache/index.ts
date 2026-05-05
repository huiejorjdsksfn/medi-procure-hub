/**
 * ProcurBosse ERP Cache Engine v1.0
 * Multi-layer: Memory → IndexedDB → LocalStorage → Offline stale
 * EL5 MediProcure — Embu Level 5 Hospital
 */
const DB_NAME = "el5_erp_cache";
const DB_VER  = 3;
const STORE   = "erp_store";
const MEM_LIMIT = 200;

const MEM: Map<string,{data:any;exp:number}> = new Map();
let _db: IDBDatabase | null = null;

function openIDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((res,rej)=>{
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:"k"});
    };
    req.onsuccess = e => { _db=(e.target as IDBOpenDBRequest).result; res(_db); };
    req.onerror   = () => rej(req.error);
  });
}

async function idbGet(k:string):Promise<any>{
  try{const db=await openIDB();return new Promise((r,j)=>{const q=db.transaction(STORE,"readonly").objectStore(STORE).get(k);q.onsuccess=()=>r(q.result??null);q.onerror=()=>j(q.error);});}catch{return null;}
}
async function idbSet(k:string,v:any):Promise<void>{
  try{const db=await openIDB();await new Promise<void>((r,j)=>{const q=db.transaction(STORE,"readwrite").objectStore(STORE).put(v);q.onsuccess=()=>r();q.onerror=()=>j(q.error);});}catch{}
}
async function idbDel(k:string):Promise<void>{
  try{const db=await openIDB();await new Promise<void>(r=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(k);tx.oncomplete=()=>r();});}catch{}
}

interface CE{k:string;data:any;exp:number;tag?:string;}

export const ERPCache = {
  async set(key:string,data:any,ttlMs=5*60_000,tag?:string):Promise<void>{
    const exp=Date.now()+ttlMs;
    if(MEM.size>=MEM_LIMIT){const o=[...MEM.entries()].sort((a,b)=>a[1].exp-b[1].exp)[0];if(o)MEM.delete(o[0]);}
    MEM.set(key,{data,exp});
    idbSet(key,{k:key,data,exp,tag}).catch(()=>{});
    try{localStorage.setItem("el5c:"+key,JSON.stringify({k:key,data,exp,tag}));}catch{}
  },

  async get<T=any>(key:string):Promise<T|null>{
    const now=Date.now();
    const m=MEM.get(key);if(m&&m.exp>now)return m.data as T;if(m)MEM.delete(key);
    const idb=await idbGet(key) as CE|null;
    if(idb&&idb.exp>now){MEM.set(key,{data:idb.data,exp:idb.exp});return idb.data as T;}
    try{const r=localStorage.getItem("el5c:"+key);if(r){const ls=JSON.parse(r)as CE;if(ls.exp>now){MEM.set(key,{data:ls.data,exp:ls.exp});return ls.data as T;}localStorage.removeItem("el5c:"+key);}}catch{}
    return null;
  },

  getSync<T=any>(key:string):T|null{
    const now=Date.now();const m=MEM.get(key);if(m&&m.exp>now)return m.data as T;
    try{const r=localStorage.getItem("el5c:"+key);if(r){const ls=JSON.parse(r)as CE;if(ls.exp>now)return ls.data as T;}}catch{}
    return null;
  },

  async del(key:string):Promise<void>{MEM.delete(key);await idbDel(key);try{localStorage.removeItem("el5c:"+key);}catch{}},

  async delPrefix(prefix:string):Promise<void>{
    [...MEM.keys()].filter(k=>k.startsWith(prefix)).forEach(k=>MEM.delete(k));
    try{const db=await openIDB();const all:string[]=await new Promise(r=>{const q=db.transaction(STORE,"readonly").objectStore(STORE).getAllKeys();q.onsuccess=()=>r(q.result as string[]);});const tx=db.transaction(STORE,"readwrite");const st=tx.objectStore(STORE);all.filter(k=>k.startsWith(prefix)).forEach(k=>st.delete(k));}catch{}
    try{Object.keys(localStorage).filter(k=>k.startsWith("el5c:"+prefix)).forEach(k=>localStorage.removeItem(k));}catch{}
  },

  async clearAll():Promise<void>{
    MEM.clear();
    try{const db=await openIDB();db.transaction(STORE,"readwrite").objectStore(STORE).clear();}catch{}
    try{Object.keys(localStorage).filter(k=>k.startsWith("el5c:")).forEach(k=>localStorage.removeItem(k));}catch{}
  },

  async getOrFetch<T>(key:string,fetchFn:()=>Promise<T>,ttlMs=5*60_000,tag?:string):Promise<{data:T|null;fromCache:boolean;error?:any}>{
    const cached=await this.get<T>(key);
    if(cached!==null)return{data:cached,fromCache:true};
    try{const data=await fetchFn();if(data!=null)await this.set(key,data,ttlMs,tag);return{data,fromCache:false};}
    catch(error){const stale=await this.getStale<T>(key);return{data:stale,fromCache:true,error};}
  },

  async getStale<T=any>(key:string):Promise<T|null>{
    const m=MEM.get(key);if(m)return m.data as T;
    const idb=await idbGet(key) as CE|null;if(idb)return idb.data as T;
    try{const r=localStorage.getItem("el5c:"+key);if(r)return(JSON.parse(r)as CE).data as T;}catch{}
    return null;
  },
};

export default ERPCache;
