import fs from "node:fs";
const h = fs.readFileSync("out/en/index.html", "utf8");
const chunks = [...h.matchAll(/<script>self\.__next_f\.push\(([\s\S]*?)\)<\/script>/g)];
chunks.sort((a, b) => b[1].length - a[1].length);
const chunk = chunks[0][1];
console.log("biggest chunk:", chunk.length, "bytes");
for (let off = 10000; off < chunk.length; off += 25000) {
  console.log(`\n@${off}:`, chunk.slice(off, off + 170).replace(/\s+/g, " "));
}
for (const key of ["className", "dangerouslySetInnerHTML", "T275c", "hero", "manifesto", "skill", "telemetry", "undefined"]) {
  console.log(`"${key}" occurrences:`, chunk.split(key).length - 1);
}