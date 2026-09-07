import fs from "node:fs";

const h = fs.readFileSync("out/fa/index.html", "utf8");

// Replicate strip
const stripped = h.replace(/<script[^>]*src="\/_next\/static\/chunks\/polyfills-[^"]*\.js"[^>]*><\/script>/gi, "");
console.log("strip changed:", stripped !== h);

// Replicate preload scan
const families = ["Vazirmatn", "Orbitron"];
const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let m, found = [];
while ((m = styleRe.exec(h))) {
  const ffRe = /@font-face\s*\{([^}]*)\}/g;
  let ff;
  while ((ff = ffRe.exec(m[1]))) {
    const block = ff[1];
    const fam = block.match(/font-family:\s*"?([^";]+)"?\s*;/);
    if (!fam) continue;
    if (!families.some((a) => fam[1].trim().startsWith(a))) continue;
    const url = block.match(/url\(([^)]+\.woff2)\)/);
    found.push({ fam: fam[1].trim(), url: url ? url[1] : "NO-URL" });
  }
}
console.log("font faces found:", found);

// What does the existing preloader find?
const urls2 = new Set();
while ((m = styleRe.exec(h))) {
  const ffRe = /@font-face\s*\{([^}]*)\}/g;
  let ff;
  while ((ff = ffRe.exec(m[1]))) {
    const block = ff[1];
    const fam = block.match(/font-family:\s*"?([^";]+)"?\s*;/);
    if (!fam || !families.some((a) => fam[1].trim().startsWith(a))) continue;
    const re = /url\(([^)]+-s\.p\.woff2)\)/g;
    let f;
    while ((f = re.exec(block))) urls2.add(f[1]);
  }
}
console.log("urls matching -s.p.woff2:", [...urls2]);
