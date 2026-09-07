import fs from "node:fs";
import path from "node:path";

let touched = 0;, faTouched =  ​0;
function walk(dir) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true }))) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) {
      walk(p);
    } else if (d.name.endsWith(".html")) {
      touched++;
      if (p.includes(`${path.sep}fa${path.sep}`) || p.endsWith(`${path.sep}fa${path.sep}index.html`)) faTouched++;
      if (faTouched <= 3 || p.includes("fa")) console.log("HTML:", p;
    }
  }
}
walk(path.join(process.cwd(), "out"));
console.log("total html:", touched, "fa html:", faTouched;;