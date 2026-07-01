/**
 * EL5 MediProcure — Network Engine: Batch Coalescer
 * Collapses N single-row lookups fired within the same tick (e.g. reference
 * number dropdowns resolving several linked fields at once) into ONE
 * `select().in(column, ids)` round trip instead of N separate requests.
 *
 * Usage:
 *   const supplier = await batchLookup(supabase, {
 *     table: "suppliers", column: "id", value: supplierId, select: "id,name,contact"
 *   });
 *
 * ProcurBosse · Embu Level 5 Hospital
 */

interface LookupSpec {
  table: string;
  column: string;
  value: string | number;
  select?: string;
}

interface BatchGroup {
  table: string;
  column: string;
  select: string;
  values: Set<string | number>;
  waiters: Map<string | number, Array<(row: any) => void>>;
  timer: ReturnType<typeof setTimeout> | null;
}

const WINDOW_MS = 12; // small enough to feel instant, big enough to catch same-tick calls
const groups = new Map<string, BatchGroup>();

function groupKey(table: string, column: string, select: string): string {
  return `${table}::${column}::${select}`;
}

export function batchLookup<T = any>(supabaseClient: any, spec: LookupSpec): Promise<T | null> {
  const select = spec.select ?? "*";
  const key = groupKey(spec.table, spec.column, select);

  let group = groups.get(key);
  if (!group) {
    group = {
      table: spec.table,
      column: spec.column,
      select,
      values: new Set(),
      waiters: new Map(),
      timer: null,
    };
    groups.set(key, group);
  }

  group.values.add(spec.value);

  const promise = new Promise<T | null>((resolve) => {
    const list = group!.waiters.get(spec.value) ?? [];
    list.push(resolve);
    group!.waiters.set(spec.value, list);
  });

  if (!group.timer) {
    group.timer = setTimeout(() => flush(supabaseClient, key), WINDOW_MS);
  }

  return promise;
}

async function flush(supabaseClient: any, key: string): Promise<void> {
  const group = groups.get(key);
  if (!group) return;
  groups.delete(key);

  const ids = Array.from(group.values);
  try {
    const { data, error } = await supabaseClient
      .from(group.table)
      .select(group.select)
      .in(group.column, ids);

    const rowsById = new Map<string | number, any>();
    if (!error && data) {
      for (const row of data as any[]) rowsById.set(row[group.column], row);
    }

    group.waiters.forEach((resolvers, id) => {
      const row = rowsById.get(id) ?? null;
      resolvers.forEach((r) => r(row));
    });
  } catch {
    group.waiters.forEach((resolvers) => resolvers.forEach((r) => r(null)));
  }
}

/** Metrics: how many lookup groups are currently pending a flush */
export function batchStats() {
  return {
    pendingGroups: groups.size,
    pendingLookups: Array.from(groups.values()).reduce((sum, g) => sum + g.values.size, 0),
  };
}
