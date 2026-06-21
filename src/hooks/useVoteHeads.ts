/**
 * useVoteHeads — centralized, admin-customizable Vote Head registry.
 *
 * Vote heads (Kenyan government IFMIS-style budget line codes) are stored
 * as a single JSON array in system_settings under the key 'vote_heads'.
 * On first use (no row in the DB yet) a sensible default list for a
 * Kenyan county-government hospital is auto-populated so the dropdown is
 * never empty out of the box. Admin-tier users can add/edit/remove entries
 * via manageVoteHeads(); every other user just gets a live, labelled
 * dropdown automatically.
 *
 * Each entry also carries a `defaultForTypes` array so a sensible vote
 * head can be auto-selected based on the document type currently being
 * created (e.g. a Payment Voucher for "utilities" picks 2210200 by
 * default, while a Purchase Voucher for "drugs" picks 2211100).
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VoteHead {
  code: string;
  label: string;
  /** Document/voucher types this vote head should be the default for */
  defaultForTypes?: string[];
}

const SETTING_KEY = "vote_heads";

export const DEFAULT_VOTE_HEADS: VoteHead[] = [
  { code: "2210100", label: "2210100 — Utilities, Supplies & Services",        defaultForTypes: ["utility", "payment"] },
  { code: "2210200", label: "2210200 — Communication, Supplies & Services",    defaultForTypes: ["communication"] },
  { code: "2210300", label: "2210300 — Domestic Travel & Subsistence",         defaultForTypes: ["travel"] },
  { code: "2211100", label: "2211100 — Drugs & Medical Supplies",              defaultForTypes: ["purchase", "pharmaceutical"] },
  { code: "2211300", label: "2211300 — Hospital Supplies",                     defaultForTypes: ["sales"] },
  { code: "2211900", label: "2211900 — Maintenance of Office Equipment",       defaultForTypes: [] },
  { code: "2220100", label: "2220100 — Maintenance of Buildings",              defaultForTypes: [] },
  { code: "2640400", label: "2640400 — Other Transfers to Government Units",  defaultForTypes: [] },
  { code: "2710200", label: "2710200 — Government Pension & Retirement Benefits", defaultForTypes: [] },
  { code: "3110200", label: "3110200 — Purchase of Office Furniture & Equipment", defaultForTypes: [] },
  { code: "3110300", label: "3110300 — Refurbishment of Buildings",           defaultForTypes: [] },
  { code: "2630100", label: "2630100 — Capital Grants to Government Agencies", defaultForTypes: ["journal"] },
  { code: "2110100", label: "2110100 — Basic Salaries — Permanent Employees",  defaultForTypes: ["receipt"] },
];

let _cache: VoteHead[] | null = null;
const _listeners = new Set<(v: VoteHead[]) => void>();

function notify(v: VoteHead[]) { _cache = v; _listeners.forEach(fn => fn(v)); }

async function ensureSeeded(): Promise<VoteHead[]> {
  const { data } = await (supabase as any).from("system_settings").select("value").eq("key", SETTING_KEY).maybeSingle();
  if (data?.value) {
    try {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fall through to seed */ }
  }
  // First run / empty / malformed — seed with sensible defaults
  await (supabase as any).from("system_settings").upsert(
    { key: SETTING_KEY, value: JSON.stringify(DEFAULT_VOTE_HEADS), category: "finance" },
    { onConflict: "key" },
  );
  return DEFAULT_VOTE_HEADS;
}

export function useVoteHeads() {
  const [voteHeads, setVoteHeads] = useState<VoteHead[]>(_cache || DEFAULT_VOTE_HEADS);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    const handler = (v: VoteHead[]) => setVoteHeads(v);
    _listeners.add(handler);
    if (!_cache) {
      ensureSeeded().then(v => { notify(v); setLoading(false); }).catch(() => setLoading(false));
    }
    return () => { _listeners.delete(handler); };
  }, []);

  /** Pick a sensible default vote head code for a given document type */
  const defaultFor = useCallback((docType: string): string => {
    const match = voteHeads.find(v => v.defaultForTypes?.includes(docType));
    return match?.code || voteHeads[0]?.code || "";
  }, [voteHeads]);

  /** Admin-only: replace the entire vote head list */
  const manageVoteHeads = useCallback(async (next: VoteHead[]) => {
    await (supabase as any).from("system_settings").upsert(
      { key: SETTING_KEY, value: JSON.stringify(next), category: "finance" },
      { onConflict: "key" },
    );
    notify(next);
  }, []);

  const addVoteHead = useCallback(async (code: string, label: string) => {
    const next = [...voteHeads.filter(v => v.code !== code), { code, label }];
    await manageVoteHeads(next);
  }, [voteHeads, manageVoteHeads]);

  const removeVoteHead = useCallback(async (code: string) => {
    await manageVoteHeads(voteHeads.filter(v => v.code !== code));
  }, [voteHeads, manageVoteHeads]);

  return { voteHeads, loading, defaultFor, manageVoteHeads, addVoteHead, removeVoteHead };
}
