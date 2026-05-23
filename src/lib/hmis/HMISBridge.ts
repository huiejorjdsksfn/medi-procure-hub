/**
 * HMISBridge v2.0 — Kenya HMIS / DHIS2 / KenyaEMR / KHIS OBC Bridge
 */
export type HMISSystem = "dhis2" | "khis" | "kenyaemr" | "ihris" | "custom";

export interface HMISConfig {
  id: string; name: string; system: HMISSystem;
  base_url: string; username: string; password: string;
  api_token?: string; facility_code?: string; org_unit?: string;
  dataset_id?: string; enabled: boolean; last_sync?: string;
  sync_interval_minutes: number;
}

export interface SyncMapping {
  id: string; hmis_config_id: string;
  local_table: string; local_field: string;
  hmis_entity: string; hmis_field: string;
  transform?: string; direction: "push"|"pull"|"bidirectional"; enabled: boolean;
}

export interface SyncJobResult {
  config_id: string; system: string;
  started_at: string; finished_at: string;
  status: "success"|"partial"|"failed";
  pushed: number; pulled: number; conflicts: number;
  errors: string[]; records: SyncRecordResult[];
}

export interface SyncRecordResult {
  entity: string; action: "push"|"pull"|"skip"|"conflict";
  local_id: string; hmis_id?: string;
  status: "ok"|"error"|"conflict"; message?: string;
}

export class DHIS2Client {
  private base: string; private auth: string;
  constructor(config: HMISConfig) {
    this.base = config.base_url.replace(/\/$/, "");
    this.auth = config.api_token
      ? "ApiToken " + config.api_token
      : "Basic " + btoa(config.username + ":" + config.password);
  }
  private async req<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const res = await fetch(this.base + path, {
      ...opts,
      headers: { "Authorization": this.auth, "Content-Type": "application/json", "Accept": "application/json", ...(opts.headers||{}) },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) { const b = await res.text(); throw new Error("DHIS2 " + path + ": " + res.status + " " + b.slice(0,200)); }
    return res.json();
  }
  async ping(): Promise<{ok:boolean;version?:string;error?:string}> {
    try { const i: any = await this.req("/api/system/info"); return {ok:true,version:i.version}; }
    catch(e:any) { return {ok:false,error:e.message}; }
  }
  async getOrgUnits(): Promise<any[]> {
    const r: any = await this.req("/api/organisationUnits.json?fields=id,name,level,code&paging=false");
    return r.organisationUnits||[];
  }
  async getDataSets(): Promise<any[]> {
    const r: any = await this.req("/api/dataSets.json?fields=id,name,periodType&paging=false");
    return r.dataSets||[];
  }
  async getDataElements(dsId: string): Promise<any[]> {
    const r: any = await this.req("/api/dataSets/"+dsId+"/dataElements.json?fields=id,name,valueType,shortName");
    return r.dataElements||[];
  }
  async pushDataValueSet(payload:{dataSet:string;orgUnit:string;period:string;dataValues:{dataElement:string;value:string|number}[]}): Promise<any> {
    return this.req("/api/dataValueSets",{method:"POST",body:JSON.stringify(payload)});
  }
  async getDataValueSet(p:{dataSet:string;orgUnit:string;period:string}): Promise<any> {
    return this.req("/api/dataValueSets.json?" + new URLSearchParams(p as any).toString());
  }
  async pushEvent(e:{program:string;orgUnit:string;eventDate:string;dataValues:{dataElement:string;value:string}[];status?:"COMPLETED"|"ACTIVE"}): Promise<any> {
    return this.req("/api/events",{method:"POST",body:JSON.stringify({events:[e]})});
  }
}

export class KenyaEMRClient {
  private base: string; private auth: string;
  constructor(config: HMISConfig) {
    this.base = config.base_url.replace(/\/$/, "");
    this.auth = "Basic " + btoa(config.username + ":" + config.password);
  }
  private async req<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const res = await fetch(this.base + "/openmrs/ws/rest/v1" + path, {
      ...opts, headers: {"Authorization":this.auth,"Content-Type":"application/json",...(opts.headers||{})},
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error("KenyaEMR " + path + ": " + res.status);
    return res.json();
  }
  async ping(): Promise<{ok:boolean;version?:string;error?:string}> {
    try { await this.req("/session"); return {ok:true,version:"OpenMRS REST v2"}; }
    catch(e:any) { return {ok:false,error:e.message}; }
  }
  async getStockItems(): Promise<any[]> {
    const r: any = await this.req("/stockmanagement/stockitem?v=full");
    return r.results||[];
  }
  async pushStockTransaction(item:any): Promise<any> {
    return this.req("/stockmanagement/stockoperation",{method:"POST",body:JSON.stringify(item)});
  }
}

export class GenericHMISClient {
  constructor(private config: HMISConfig) {}
  async ping(): Promise<{ok:boolean;error?:string}> {
    try {
      const res = await fetch(this.config.base_url + "/health", {
        headers: {"Authorization": this.config.api_token ? "Bearer " + this.config.api_token : "Basic " + btoa(this.config.username + ":" + this.config.password)},
        signal: AbortSignal.timeout(8000),
      });
      return {ok:res.ok};
    } catch(e:any) { return {ok:false,error:e.message}; }
  }
}

export function createHMISClient(config: HMISConfig) {
  switch(config.system) {
    case "dhis2": case "khis": return new DHIS2Client(config);
    case "kenyaemr": return new KenyaEMRClient(config);
    default: return new GenericHMISClient(config);
  }
}

export function toDHIS2Period(date: Date, type: "Monthly"|"Quarterly"|"Yearly" = "Monthly"): string {
  const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,"0");
  if(type==="Monthly") return y+m;
  if(type==="Quarterly") return y+"Q"+Math.ceil((date.getMonth()+1)/3);
  return String(y);
}

export const HMIS_SYSTEMS = [
  {value:"dhis2"   as HMISSystem, label:"DHIS2",           desc:"District Health Information Software 2",        port:8080},
  {value:"khis"    as HMISSystem, label:"KHIS (Kenya)",    desc:"Kenya Health Information System (DHIS2-based)", port:8080},
  {value:"kenyaemr"as HMISSystem, label:"KenyaEMR",        desc:"OpenMRS-based Kenya Electronic Medical Records", port:8080},
  {value:"ihris"   as HMISSystem, label:"iHRIS",           desc:"Human Resources for Health",                    port:3000},
  {value:"custom"  as HMISSystem, label:"Custom REST HMIS",desc:"Any REST API-based HMIS",                       port:443 },
];

export const DEFAULT_MAPPINGS = [
  {local_table:"requisitions",     local_field:"total_amount",  hmis_entity:"dataElement", hmis_field:"DRUG_PROCUREMENT_VALUE",  transform:"sum",   direction:"push" as const},
  {local_table:"requisitions",     local_field:"status",        hmis_entity:"dataElement", hmis_field:"REQUISITION_COUNT",       transform:"count", direction:"push" as const},
  {local_table:"goods_received",   local_field:"quantity",      hmis_entity:"dataElement", hmis_field:"GOODS_RECEIVED_QTY",      transform:"sum",   direction:"push" as const},
  {local_table:"purchase_orders",  local_field:"total_amount",  hmis_entity:"dataElement", hmis_field:"PO_TOTAL_VALUE",          transform:"sum",   direction:"push" as const},
  {local_table:"items",            local_field:"stock_quantity",hmis_entity:"dataElement", hmis_field:"STOCK_ON_HAND",           transform:"sum",   direction:"bidirectional" as const},
  {local_table:"suppliers",        local_field:"name",          hmis_entity:"trackedEntity",hmis_field:"SUPPLIER_NAME",          transform:"latest",direction:"push" as const},
];
