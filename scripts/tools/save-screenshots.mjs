import fs from "node:fs";
const j = JSON.parse(fs.readFileSync(".lighthouse/en-mobile-trace2.json", "utf8"));
const st = j.audits["screenshot-thumbnails"];
if (st?.details?.items) {
  for (const item of st.details.items) {
    const buf = Buffer.from(item.data.split(",")[1], "base64");
    const file = `.lighthouse/screenshot-${item.timing}.jpg`;
    fs.writeFileSync(file, buf);
    console.log("saved", file, buf.length, "bytes");
  }
}
