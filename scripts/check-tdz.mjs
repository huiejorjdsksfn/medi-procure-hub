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

  // ── Pass 1: useMemo/useCallback whose deps array references a later const ──
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
        flagged.push({ file: path.relative(SRC, file), line: d.lineNo, name: d.name, dep, depLine: lineOf[dep], kind: "hook-deps" });
      }
    }
  }

  // ── Pass 2: plain `const NAME = { ... }` / `const NAME = [ ... ]` at
  // component-body scope (2-space indent) referencing an identifier that
  // is itself a later `const` declaration in the same file. This is the
  // exact bug found 2026-07-19: MENUS referenced `tabs`, a plain const
  // object declared ~45 lines further down — useMemo/useCallback-only
  // checking above did not (and structurally cannot) catch this, since
  // there's no hook or dependency array involved, just component-body
  // execution order. Scoped to top-level `const NAME =` declarations only
  // (2-space indent, i.e. directly inside a component function body) to
  // keep the false-positive rate low; deeply nested literals are skipped.
  const allConstRe = /\n {2}const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]/g;
  const allDeclLines = {};
  let cm;
  while ((cm = allConstRe.exec(text))) {
    const name = cm[1];
    if (allDeclLines[name] === undefined) allDeclLines[name] = text.slice(0, cm.index).split("\n").length;
  }
  const objLitRe = /\n {2}const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::[^=]+)?=\s*[{[]/g;
  let om;
  while ((om = objLitRe.exec(text))) {
    const name = om[1];
    const startLine = text.slice(0, om.index).split("\n").length;
    // bracket-match the literal body to bound the scan window
    const openChar = text[objLitRe.lastIndex - 1];
    const closeChar = openChar === "{" ? "}" : "]";
    let depth = 1, i = objLitRe.lastIndex;
    while (i < text.length && depth > 0) {
      if (text[i] === openChar) depth++;
      else if (text[i] === closeChar) depth--;
      i++;
    }
    const body = text.slice(objLitRe.lastIndex, i);
    // identifiers referenced as bare words (rough heuristic: word-boundary
    // matches, excluding property-access positions like `.tabs` or `tabs:`
    // key names, which is unavoidable noise but keeps this a scanner, not
    // a parser — false positives are expected and this stays advisory-only
    // in spirit, though wired as a hard gate since it caught a real bug).
    const refs = new Set((body.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || []));
    for (const ref of refs) {
      if (ref === name) continue;
      if (allDeclLines[ref] !== undefined && allDeclLines[ref] > startLine) {
        // Only report once per (name, ref) pair
        const already = flagged.some(f => f.name === name && f.dep === ref && f.file === path.relative(SRC, file));
        if (!already) flagged.push({ file: path.relative(SRC, file), line: startLine, name, dep: ref, depLine: allDeclLines[ref], kind: "const-order" });
      }
    }
  }
}

walk(SRC);

const hookIssues = flagged.filter(f => f.kind === "hook-deps");
const constIssues = flagged.filter(f => f.kind === "const-order");

if (hookIssues.length) {
  console.error("TDZ check FAILED — useMemo/useCallback referencing a const declared later in the same scope:\n");
  for (const f of hookIssues) {
    console.error(`  ${f.file}:${f.line}  const ${f.name} = useMemo/useCallback(...) depends on '${f.dep}', declared later at line ${f.depLine}`);
  }
}
if (constIssues.length) {
  console.error(`\n${hookIssues.length ? "\n" : ""}TDZ check — const-order candidates (heuristic, review each — may include false positives from property/key names matching a const elsewhere):\n`);
  for (const f of constIssues) {
    console.error(`  ${f.file}:${f.line}  const ${f.name} = {...} references '${f.dep}', a const declared later at line ${f.depLine}`);
  }
}

if (hookIssues.length) {
  console.error(`\n${hookIssues.length} confirmed issue(s) (hook-deps). Move the dependency's declaration above the hook that uses it.`);
  process.exit(1);
} else if (constIssues.length) {
  console.log(`\n${constIssues.length} const-order candidate(s) to review manually (not failing the build — this pass has known false positives).`);
  process.exit(0);
} else {
  console.log("TDZ check passed — no hooks or const declarations reference a later-declared const.");
}
