// Fix double backslashes in the .htaccess template literal section we added
import fs from "node:fs";

const p = "scripts/build/prepare-cpanel.mjs";
let c = fs.readFileSync(p, "utf8");

// Find section boundaries
const s = c.indexOf("# \u2500\u2500 Dynamic sitemap");
const e = c.indexOf("# \u2500\u2500 Protect sensitive files", s) + "# \u2500\u2500 Protect sensitive files".length;

const before = c.substring(0, s);
const after = c.substring(e);
let mid = c.substring(s, e);

// Check current state
const hasDouble = mid.includes("\\\\" + "n");
console.log("Has double-backslash-n:", hasDouble);
console.log("Section length:", mid.length);

// Replace: \\\\n -> \\n  and \\\\. -> \\.
// We search for literal two-char backslash sequences
const BB = "\\" + "\\"; // two backslash chars
const SB = "\\" + "";  // one backslash char

mid = mid.split(BB + "n").join(SB + "n");
mid = mid.split(BB + ".").join(SB + ".");

const stillHasDouble = mid.includes(BB + "n");
console.log("Still has double-backslash-n:", stillHasDouble);

fs.writeFileSync(p, before + mid + after);
console.log("Done.");