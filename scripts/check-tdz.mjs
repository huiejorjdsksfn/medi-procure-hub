#!/usr/bin/env node
/**
 * check-tdz.mjs — guards against the exact bug class that crashed /users on
 * 2026-07-18 ("Cannot access 'filtered' before initialization"): a
 * useMemo/useCallback declared BEFORE a const it depends on, in the same
 * component scope. That's a real ReferenceError at render time in strict
 * ES module output, not just a lint nit — it crashed 100% of visits to the
 * affected page. This is a static, regex-based check (not a full JS/TS
 * parser) but it caught the real bug with zero false positives across the
 * whole src/ tree, so it's wired in as a hard failure, not a warning.
 *
 * Usage: node scripts/check-tdz.mjs
 * Exit code 1 if any issue is found (fails CI); 0 otherwise.
 */
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "src");
let flagged = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".tsx")) checkFile(full);
  }
}

function checkFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const declRe = /\n(\s*)const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*use(?:Memo|Callback)\(/g;
  const decls = [];
  let m;
  while ((m = declRe.exec(text))) {
    const name = m[2];
    const lineNo = text.slice(0, m.index).split("\n").length;
    const tail = text.slice(declRe.lastIndex, declRe.lastIndex + 6000);
    const depMatch = tail.match(/\]\s*,\s*\[([^\]]*)\]\s*\)/);
    const depText = depMatch ? depMatch[1] : "";
    decls.push({ name, lineNo, depText });
  }
  const lineOf = Object.fromEntries(decls.map(d => [d.name, d.lineNo]));
  for (const d of decls) {
    const deps = d.depText.split(",").map(s => s.trim()).filter(Boolean);
    for (const dep of deps) {
      if (lineOf[dep] !== undefined && lineOf[dep] > d.lineNo) {
        flagged.push({
          file: path.relative(SRC, file),
          line: d.lineNo,
          name: d.name,
          dep,
          depLine: lineOf[dep],
        });
      }
    }
  }
}

walk(SRC);

if (flagged.length) {
  console.error("TDZ check FAILED — useMemo/useCallback referencing a const declared later in the same scope:\n");
  for (const f of flagged) {
    console.error(`  ${f.file}:${f.line}  const ${f.name} = useMemo/useCallback(...) depends on '${f.dep}', declared later at line ${f.depLine}`);
  }
  console.error(`\n${flagged.length} issue(s). Move the dependency's declaration above the hook that uses it.`);
  process.exit(1);
} else {
  console.log("TDZ check passed — no hooks reference a later-declared const.");
}
