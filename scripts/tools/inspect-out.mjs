import fs from "node:fs";
import path from "node:path";

const files = [
  "out/fa/index.html",
  "out/fa/blog/index.html",
  "out/fa/skills/index.html",
  "out/fa/work/index.html",
  "out/en/index.html",
  "out/en/blog/index.html",
  "out/en/skills/index.html",
  "out/blog/live/index.html",
];

for (const f of files) {
  try {
    const p = path.join(process.cwd(), f);
    const st = fs.statSync(p);
    const h = fs.readFileSync(p, "utf8");
    const poly = (h.match(/<script[^>]*src="\/_next\/static\/chunks\/polyfills-[^"]*\.js"[^>]*><\/script>/gi) ?? []).length;
    const pres = h.match(/<link[^>]*rel="preload"[^>]*>/gi) ?? [];
    const kinds = pres.map((x) => {
      const a = x.match(/as="([^"]+)"/);
      const hh = x.match(/href="([^"]+)"/);
      return (a ? a[1] : "?") + ":" + (hh ? hh[1].split("/").pop().slice(0, 24) : "");
    });
    console.log(f, "| mtime=", st.mtime.toISOString(), "| poly=", poly, "| preloads=", kinds.join(","));
  } catch (e) {
    console.log(f, "ERR", e.message);
  }
}