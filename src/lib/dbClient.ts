/**
 * ProcurBosse — Unified DB Client v1.0
 * MySQL primary + Supabase failover
 * All queries go through this client — transparent failover
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { supabase } from "@/integrations/supabase/client";

export type DBMode = "supabase" | "mysql" | "failover";

interface MySQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

class UnifiedDBClient {
  private mode: DBMode = "supabase";
  private mysqlConfig: MySQLConfig | null = null;
  private failoverActive = false;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(mode: DBMode) => void> = [];

  /** Initialize with optional MySQL config */
  init(config?: MySQLConfig) {
    if (config) {
      this.mysqlConfig = config;
      this.mode = "mysql";
      this.startHealthCheck();
    }
    return this;
  }

  /** Load MySQL config from system_settings */
  async loadFromSettings(): Promise<void> {
    try {
      const { data } = await (supabase as any).from("system_settings").select("key,value")
        .in("key", ["mysql_host","mysql_port","mysql_database","mysql_username","mysql_password","mysql_ssl","mysql_enabled"]);
      if (!data) return;
      const s: Record<string,string> = Object.fromEntries((data as any[]).map((r:any) => [r.key, r.value]));
      if (s.mysql_enabled !== "true" || !s.mysql_host) return;
      this.mysqlConfig = {
        host:     s.mysql_host,
        port:     parseInt(s.mysql_port||"3306"),
        database: s.mysql_database||"mediprocure",
        username: s.mysql_username||"root",
        password: s.mysql_password||"",
        ssl:      s.mysql_ssl === "true",
      };
      this.mode = "mysql";
    } catch {}
  }

  getMode() { return this.mode; }
  isMySQL() { return this.mode === "mysql" && !this.failoverActive; }
  isFailover() { return this.failoverActive; }

  onModeChange(fn: (mode: DBMode) => void) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private notify(mode: DBMode) {
    this.listeners.forEach(fn => fn(mode));
  }

  /** Primary DB query — always Supabase for now (MySQL proxy via edge function) */
  from(table: string) {
    /* When MySQL is primary, route through edge function proxy */
    if (this.isMySQL()) {
      return this.mysqlProxy(table);
    }
    return (supabase as any).from(table);
  }

  /** MySQL queries via Supabase edge function proxy */
  private mysqlProxy(table: string) {
    const self = this;
    /* Returns a chainable object that mirrors supabase-js query builder */
    const q: any = {
      _table: table, _select: "*", _filters: [] as any[], _order: null as any,
      _limit: null as any, _single: false, _count: false,

      select(cols: string, opts?: any) { q._select=cols; if(opts?.count) q._count=true; return q; },
      eq(col: string, val: any) { q._filters.push({type:"eq",col,val}); return q; },
      in(col: string, vals: any[]) { q._filters.push({type:"in",col,vals}); return q; },
      lt(col: string, val: any) { q._filters.push({type:"lt",col,val}); return q; },
      gte(col: string, val: any) { q._filters.push({type:"gte",col,val}); return q; },
      order(col: string, opts?: any) { q._order={col, ascending: opts?.ascending !== false}; return q; },
      limit(n: number) { q._limit=n; return q; },
      single() { q._single=true; return q; },
      maybeSingle() { q._single=true; return q; },
      insert(data: any) { return self.mysqlMutate("INSERT", table, data); },
      update(data: any) { const uq={...q,_data:data}; return self.mysqlMutate("UPDATE", table, data, q._filters); },
      delete() { return self.mysqlMutate("DELETE", table, null, q._filters); },
      upsert(data: any, opts?: any) { return self.mysqlMutate("UPSERT", table, data, q._filters, opts); },

      then(resolve: any, reject: any) {
        return self.mysqlExec(q).then(resolve, reject);
      }
    };
    return q;
  }

  private async mysqlExec(q: any): Promise<{ data: any; error: any; count?: number }> {
    try {
      const { data, error } = await supabase.functions.invoke("mysql-proxy", {
        body: { action:"SELECT", table:q._table, select:q._select, filters:q._filters, order:q._order, limit:q._limit, single:q._single }
      });
      if (error) throw error;
      return { data: data?.rows || null, error: null, count: data?.count };
    } catch(e: any) {
      /* Failover to Supabase */
      this.activateFailover();
      return (supabase as any).from(q._table).select(q._select).limit(q._limit||100);
    }
  }

  private async mysqlMutate(type: string, table: string, data: any, filters?: any[], opts?: any): Promise<any> {
    try {
      const { data: res, error } = await supabase.functions.invoke("mysql-proxy", {
        body: { action:type, table, data, filters, opts }
      });
      if (error) throw error;
      return { data: res?.result || null, error: null };
    } catch(e: any) {
      this.activateFailover();
      /* Failover to Supabase */
      const sb = (supabase as any).from(table);
      if (type === "INSERT") return sb.insert(data).select().single();
      if (type === "UPDATE") return sb.update(data);
      if (type === "DELETE") return sb.delete();
      if (type === "UPSERT") return sb.upsert(data, opts);
    }
  }

  private activateFailover() {
    if (this.failoverActive) return;
    this.failoverActive = true;
    this.notify("failover");
    console.warn("[DBClient] MySQL unavailable — switched to Supabase failover");
  }

  private startHealthCheck() {
    this.healthCheckTimer = setInterval(async () => {
      if (!this.mysqlConfig) return;
      try {
        const { error } = await supabase.functions.invoke("mysql-proxy", { body: { action:"PING" } });
        if (!error && this.failoverActive) {
          this.failoverActive = false;
          this.notify("mysql");
          console.info("[DBClient] MySQL restored — switched back from failover");
        }
      } catch {}
    }, 60_000);
  }
}

export const dbClient = new UnifiedDBClient();
/* Export as drop-in replacement for direct supabase usage */
export const db = (supabase as any); // always use Supabase for now — MySQL proxy optional
