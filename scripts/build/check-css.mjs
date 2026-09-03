// Quick check for direction:ltr in built CSS
import fs from "node:fs";
import path from "node:path";

const cssDir = path.resolve("out/_next/static/css");
if (!fs.existsSync(cssDir)) {
  console.log("CSS dir not found:", cssDir);
  process.exit(0);
}

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory()) walk(fp);
    else if (f.name.endsWith(".css")) files.push(fp);
  }
}
walk(cssDir);

console.log("CSS files found:", files.length);
let found = false;
for (const f of files) {
  const content = fs.readFileSync(f, "utf8");
  if (content.includes("direction:ltr")) {
    found = true;
    console.log("Found 'direction:ltr' in:", path.basename(f));
    if (content.includes("ticker")) {
      console.log("  -> also has ticker-related CSS");
    }
  }
}
if (!found) {
  console.log("direction:ltr NOT found in any CSS file");
  console.log("Need to rebuild with next build to pick up CSS changes");
}