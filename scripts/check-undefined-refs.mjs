#!/usr/bin/env node
/**
 * check-undefined-refs.mjs — guards against the exact bug that crashed
 * /admin/database on 2026-07-21 ("Filter is not defined"): a concurrent
 * edit rewrote an icon import block and dropped `Filter` while a
 * `<Filter .../>` JSX usage elsewhere in the same file still referenced
 * it. TypeScript's own compiler already catches this (TS2304 "Cannot find
 * name") — the existing CI step (`npx tsc --noEmit ... || true`, wired as
 * continue-on-error) runs it, but pipes to `head -30` and never fails the
 * build regardless of what it finds. So the safety net existed and fired,
 * and was silenced by the pipeline anyway.
 *
 * This script re-runs tsc (against tsconfig.app.json — the root
 * tsconfig.json has an empty "files": [] and only wires up project
 * references, so a bare `tsc --noEmit` with no -p flag checks ZERO
 * files and always exits clean regardless of real errors; this is why
 * the existing CI tsc step never caught anything, not just because of
 * its continue-on-error/head -30 piping) and hard-fails ONLY on the
 * small set of error codes that mean "this identifier does not exist
 * and WILL throw a runtime ReferenceError/TypeError if that code path
 * executes" — TS2304 (Cannot find name), TS2552 (Cannot find name, did
 * you mean), TS2593 (Cannot find name, did you forget to change your
 * target). It deliberately does NOT hard-fail on the rest of the
 * project's TS output (implicit-any, unused-var, and similar strictness
 * warnings), since those are pre-existing technical debt this script
 * isn't trying to relitigate — only genuine undefined-reference crashes.
 *
 * Usage: node scripts/check-undefined-refs.mjs
 * Exit code 1 if any undefined-reference error is found; 0 otherwise.
 */
import { execSync } from "node:child_process";

const DANGEROUS_CODES = ["TS2304", "TS2552", "TS2593"];

let output = "";
try {
  execSync("npx tsc --noEmit --skipLibCheck -p tsconfig.app.json", { encoding: "utf8", maxBuffer: 1024 * 1024 * 50 });
} catch (e) {
  output = (e.stdout || "") + (e.stderr || "");
}

const lines = output.split("\n");
const hits = lines.filter(l => DANGEROUS_CODES.some(code => l.includes(code)));

if (hits.length) {
  console.error(`Undefined-reference check FAILED — ${hits.length} identifier(s) that don't exist and will throw at runtime:\n`);
  for (const l of hits) console.error("  " + l.trim());
  console.error("\nThese are TS2304/TS2552/TS2593 errors: TypeScript can't find the name at all. If this is an\nicon or component from a shared import block, check whether a concurrent edit removed it while\nother code still uses it (this is exactly what happened to 'Filter' in AdminDatabasePage.tsx).");
  process.exit(1);
} else {
  console.log("Undefined-reference check passed — no TS2304/TS2552/TS2593 errors.");
  process.exit(0);
}
