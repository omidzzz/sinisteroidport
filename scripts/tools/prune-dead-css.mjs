/**
 * prune-dead-css — surgical retirement of legacy sheets.
 *
 * `audit-css-usage.mjs` measures *how much* of a sheet is live; this tool acts
 * on it. It parses each legacy sheet into rules, decides per rule whether any of
 * its class tokens is reachable from real markup, and removes the unreachable
 * ones — including the comment block that introduced them.
 *
 * Guards (all conservative — a rule is kept when in doubt):
 *   - selectors with no class token (`html`, `:root`, `[data-theme]`) always stay
 *   - state hooks (`is-*`, `has-*`, `no-*`, `js-*`, `pf-*`, `on-*`) are assumed
 *     to be toggled at runtime and keep their rule
 *   - a block defining a custom property used anywhere keeps its definition,
 *     so the `every var() resolves` contract in verify-craft.mjs stays green
 *   - `@keyframes`, `@font-face`, `@property`, `@page` are never touched
 *
 * Usage:  node scripts/tools/prune-dead-css.mjs [--apply] [sheet.css ...]
 *         (dry run by default)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STYLES = path.join(ROOT, "src/styles");
const APPLY = process.argv.includes("--apply");
const only = process.argv.slice(2).filter((a) => a.endsWith(".css"));

/* ── usage corpus ─────────────────────────────────────────────────────────── */

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** Class tokens that can reach the DOM: class/className attribute values in
 *  source, any authored string of class-token shape (tokens are frequently
 *  chosen in ternaries — `? "sin-tok-c" : "sin-tok-s"` — which never appear
 *  inside a class attribute), plus every class rendered into the built HTML. */
function buildLiveSet() {
  const live = new Set();
  const addTokens = (chunk) => {
    for (const t of chunk.split(/\s+/)) if (t) live.add(t);
  };
  for (const f of walk(path.join(ROOT, "src"))) {
    if (!/\.(tsx|ts|jsx|js)$/.test(f)) continue;
    const text = fs.readFileSync(f, "utf8");
    for (const m of text.matchAll(/(?:class|className)\s*=\s*["'`]([^"'`]{0,600})["'`]/g)) {
      addTokens(m[1]);
    }
    for (const m of text.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)) {
      for (const q of m[1].matchAll(/["'`]([^"'`]+)["'`]/g)) addTokens(q[1]);
    }
    for (const m of text.matchAll(/["'`]([^"'`\n]{1,80})["'`]/g)) {
      const s = m[1].trim();
      if (!/^-?[a-zA-Z][\w-]*$/.test(s)) continue;
      if (s.length >= 4 || s.includes("-")) addTokens(s);
    }
  }
  const outDir = path.join(ROOT, "out");
  if (fs.existsSync(outDir)) {
    for (const f of walk(outDir)) {
      if (!f.endsWith(".html")) continue;
      const text = fs.readFileSync(f, "utf8");
      for (const m of text.matchAll(/class="([^"]*)"/g)) addTokens(m[1]);
    }
  }
  return live;
}

/** Custom properties consumed anywhere in the style tree. */
function buildUsedVars() {
  const used = new Set();
  for (const f of walk(STYLES)) {
    if (!f.endsWith(".css")) continue;
    for (const m of fs.readFileSync(f, "utf8").matchAll(/var\(\s*(--[\w-]+)/g)) used.add(m[1]);
  }
  return used;
}


/* ── css parsing ──────────────────────────────────────────────────────────── */

const NEVER_PRUNE = /^@(keyframes|-webkit-keyframes|font-face|property|page|charset|import)/;
const STATE_HOOK = /^(?:is|has|no|js|pf|on)-/;

function classTokens(selector) {
  const out = [];
  for (const m of selector.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) out.push(m[1]);
  return out;
}

function findClose(text, brace, end) {
  let depth = 0;
  for (let i = brace; i < end; i++) {
    if (text.startsWith("/*", i)) {
      const c = text.indexOf("*/", i);
      i = c === -1 ? end : c + 1;
      continue;
    }
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  return end;
}

/**
 * Prune the content between [start,end) — a stylesheet, or a container's body.
 * Kept rules keep their original bytes; a dropped rule takes its leading
 * whitespace and comment with it.
 */
function pruneContent(text, start, end, ctx) {
  let out = "";
  let pending = "";
  let i = start;
  while (i < end) {
    if (text.startsWith("/*", i)) {
      const c = text.indexOf("*/", i);
      const j = c === -1 ? end : c + 2;
      pending += text.slice(i, j);
      i = j;
      continue;
    }
    if (/\s/.test(text[i])) {
      pending += text[i];
      i++;
      continue;
    }
    const brace = text.indexOf("{", i);
    const semi = text.indexOf(";", i);
    if (brace === -1 || (semi !== -1 && semi < brace)) {
      const j = semi === -1 ? end : semi + 1; // statement at-rule — always kept
      out += pending + text.slice(i, j);
      pending = "";
      i = j;
      continue;
    }
    const prelude = text.slice(i, brace).trim();
    const close = findClose(text, brace, end);
    const body = text.slice(brace + 1, close);
    if (prelude.startsWith("@") && /\{/.test(body)) {
      ctx.containers++;
      const inner = pruneContent(body, 0, body.length, ctx);
      if (inner.trim() === "") ctx.droppedContainers++;
      else out += pending + `${prelude}{${inner}}`;
      pending = "";
      i = close + 1;
      continue;
    }
    if (ctx.keep(prelude, body)) {
      out += pending + text.slice(i, close + 1);
      pending = "";
      i = close + 1;
      continue;
    }
    ctx.dropped++;
    ctx.droppedBytes += close + 1 - i;
    pending = "";
    i = close + 1;
  }
  return out + pending;
}

/* ── run ──────────────────────────────────────────────────────────────────── */

const LIVE = buildLiveSet();
const USED_VARS = buildUsedVars();
const sheets = (only.length ? only : fs.readdirSync(STYLES).filter((f) => f.endsWith(".css"))).sort();

let totalBefore = 0;
let totalAfter = 0;
let totalDropped = 0;

for (const sheet of sheets) {
  const file = path.join(STYLES, sheet);
  const css = fs.readFileSync(file, "utf8");
  const ctx = {
    dropped: 0,
    droppedBytes: 0,
    containers: 0,
    droppedContainers: 0,
    keep(prelude, body) {
      if (NEVER_PRUNE.test(prelude)) return true;
      const tokens = classTokens(prelude);
      if (tokens.length === 0) return true; // element / id / attribute selectors
      if (tokens.some((t) => LIVE.has(t))) return true;
      if (tokens.some((t) => STATE_HOOK.test(t))) return true;
      for (const m of body.matchAll(/(--[\w-]+)\s*:/g)) if (USED_VARS.has(m[1])) return true;
      return false;
    },
  };

  const next = pruneContent(css, 0, css.length, ctx);
  const before = Buffer.byteLength(css);
  const after = Buffer.byteLength(next);
  totalBefore += before;
  totalAfter += after;
  totalDropped += ctx.dropped;

  const pct = before ? Math.round((1 - after / before) * 100) : 0;
  console.log(
    `${sheet.padEnd(22)} ${String(Math.round(before / 1024)).padStart(3)}K → ${String(
      Math.round(after / 1024)
    ).padStart(3)}K  -${String(pct).padStart(2)}%  rules dropped: ${ctx.dropped}${
      ctx.droppedContainers ? ` (+${ctx.droppedContainers} empty @-blocks)` : ""
    }`
  );

  if (APPLY && after !== before) fs.writeFileSync(file, next);
  if (after === 0 && before > 0) console.log("   ↳ FULLY DEAD — drop its @import from globals.css");
}

console.log(
  `\ntotal ${Math.round(totalBefore / 1024)}K → ${Math.round(totalAfter / 1024)}K, ${totalDropped} dead rules${
    APPLY ? " — written" : " (dry run: pass --apply)"
  }`
);

