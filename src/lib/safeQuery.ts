/**
 * ProcurBosse - safeQuery v1.0
 * Universal error-safe Supabase wrapper
 * Every query returns data or [] - never throws to UI
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function safeSelect<T = any>(
  table: string,
  query?: (q: any) => any,
  fallback: T[] = []
): Promise<T[]> {
  try {
    let q = db.from(table).select("*");
    if (query) q = query(q);
    const { data, error } = await q;
    if (error) { console.warn(`[safeQuery] ${table}:`, error.message); return fallback; }
    return data || fallback;
  } catch (e: any) {
    console.warn(`[safeQuery] ${table} exception:`, e?.message);
    return fallback;
  }
}

export async function safeCount(table: string, query?: (q: any) => any): Promise<number> {
  try {
    let q = db.from(table).select("id", { count: "exact", head: true });
    if (query) q = query(q);
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  } catch { return 0; }
}

export async function safeInsert(table: string, data: any): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const { data: result, error } = await db.from(table).insert(data).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: result };
  } catch (e: any) { return { ok: false, error: e?.message || "Insert failed" }; }
}

export async function safeUpdate(table: string, id: string, data: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await db.from(table).update(data).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message || "Update failed" }; }
}

export async function safeDelete(table: string, id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message || "Delete failed" }; }
}
