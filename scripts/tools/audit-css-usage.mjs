/**
 * audit-css-usage.mjs
 *
 * Evidence for pruning the stylesheet: for every sheet globals.css imports,
 * how many of the classes it defines are referenced by a component source or
 * a prerendered document?
 *
 * Why this exists: the visual registers this site has been through left
 * sheets behind for components that no longer render. Deleting CSS on a hunch
 * breaks things; deleting it on a measurement is safe. This is the
 * measurement, and it is deliberately conservative — it reads SOURCE as well
 * as built HTML, because anything client-only (the agent panel is ssr:false,
 * every illustration is ScrollLazy) never appears in the static export.
 *
 * A 0% sheet is dead. A low % with REAL survivors is not: it needs surgical
 * pruning, and this prints the survivor list so the pruning can be targeted.
 *
 *   node scripts/tools/audit-css-usage.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const globals = fs.readFileSync(path.join(root, "src", "app", "globals.css"), "utf8");

/** Sheets imported by the entry point, in cascade order. */
const sheets = [...globals.matchAll(/@import\s+"\.\.\/styles\/([\w-]+)\.css"/g)].map(
  (m) => m[1]
);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const sources = [...walk(path.join(root, "src"))].filter((f) => /\.(tsx|ts)$/.test(f));
const htmlDir = path.join(root, "out");
const htmls = fs.existsSync(htmlDir)
  ? [...walk(htmlDir)].filter((f) => f.endsWith(".html"))
  : [];

console.log(
  `auditing ${sheets.length} sheets against ${sources.length} sources + ${htmls.length} documents\n`
);

const haystack = [...sources, ...htmls].map((f) => fs.readFileSync(f, "utf8")).join("\n");
const sourceText = sources.map((f) => fs.readFileSync(f, "utf8")).join("\n");

const rows = [];
for (const name of sheets) {
  const file = path.join(root, "src", "styles", `${name}.css`);
  if (!fs.existsSync(file)) continue;
  const css = fs.readFileSync(file, "utf8");
  const classes = [];
  for (const m of css.matchAll(/\.([a-zA-Z][\w-]{2,})(?![\d.])/g)) {
    if (!classes.includes(m[1])) classes.push(m[1]);
  }
  const live = classes.filter((c) => haystack.includes(c));
  const dead = classes.filter((c) => !haystack.includes(c));
  // A survivor that appears in no component source is only in HTML — worth
  // flagging, since it usually means the class is generic (e.g. "dark").
  const sourceBacked = live.filter((c) => sourceText.includes(c));
  rows.push({
    name,
    kb: Math.round(Buffer.byteLength(css) / 1024),
    classes: classes.length,
    live: live.length,
    sourceBacked: sourceBacked.length,
    dead,
  });
}

rows.sort((a, b) => b.kb - a.kb);
console.log(
  "sheet".padEnd(18),
  "size".padStart(6),
  "classes".padStart(8),
  "live".padStart(6),
  "live%".padStart(7)
);
let deadSheets = 0;
for (const r of rows) {
  const pct = r.classes ? Math.round((r.live / r.classes) * 100) : 0;
  const flag = pct === 0 ? "  <- dead, delete" : pct < 45 ? "  <- prune" : "";
  if (pct === 0) deadSheets += r.kb;
  console.log(
    r.name.padEnd(18),
    `${r.kb}K`.padStart(6),
    String(r.classes).padStart(8),
    String(r.live).padStart(6),
    `${pct}%`.padStart(7),
    flag
  );
}
console.log(`\n${deadSheets}K of fully-dead CSS still imported.`);

console.log("\n--- prune targets (survivors that keep the sheet alive) ---");
for (const r of rows.filter((x) => x.live / x.classes < 0.45 && x.live > 0)) {
  const survivors = [];
  const css = fs.readFileSync(path.join(root, "src", "styles", `${r.name}.css`), "utf8");
  for (const m of css.matchAll(/\.([a-zA-Z][\w-]{2,})(?![\d.])/g)) {
    const c = m[1];
    if (!survivors.includes(c) && haystack.includes(c)) {
      const inSrc =
        sources.filter((f) => fs.readFileSync(f, "utf8").includes(c)).length > 0;
      survivors.push(inSrc ? c : `${c}(html)`);
    }
  }
  console.log(`\n${r.name}: ${survivors.join(", ")}`);
}