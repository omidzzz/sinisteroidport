// Temporary script to fix double-escaped backslashes in prepare-cpanel.mjs
import fs from "node:fs";
import path from "node:path";

const file = path.resolve("scripts/prepare-cpanel.mjs");
let c = fs.readFileSync(file, "utf8");

// The editor tool doubled our backslashes.  Our added section contains
// \\n (two backslashes + n) where the template literal expects \n (one backslash + n),
// and \\. where it expects \.
const start = c.indexOf("# ── Dynamic sitemap");
const end = c.indexOf("# ── Protect sensitive files", start) + "# ── Protect sensitive files".length;

const before = c.substring(0, start);
const after = c.substring(end);
let section = c.substring(start, end);

// Replace double-backslash-n with single-backslash-n
// In the raw file, \\n appears as two backslash chars + n char.
// We want one backslash char + n char.
const bsla = String.fromCharCode(92); // single backslash
section = section.split(bsla + bsla + "n").join(bsla + "n");
section = section.split(bsla + bsla + ".").join(bsla + ".");

fs.writeFileSync(file, before + section + after);
console.log("Fixed double-escaping in prepare-cpanel.mjs");