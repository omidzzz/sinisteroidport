// Temporary script to verify the htaccessContent template literal evaluates correctly
import fs from "node:fs";
import path from "node:path";

const file = path.resolve("scripts/build/prepare-cpanel.mjs");
const src = fs.readFileSync(file, "utf8");

// Find the template literal boundaries
const marker = "const htaccessContent = `";
const startIdx = src.indexOf(marker);
if (startIdx === -1) {
  console.log("ERROR: htaccessContent template literal not found");
  process.exit(1);
}

const litStart = startIdx + marker.length; // position after the opening backtick
const litEnd = src.indexOf("`", litStart);
if (litEnd === -1) {
  console.log("ERROR: template literal closing backtick not found");
  process.exit(1);
}

// Extract the raw template literal content (as text in the source file)
const rawContent = src.substring(litStart, litEnd);

// The template literal uses \n escape sequences for newlines.
// In the source, \n is two chars: backslash (0x5C) + n (0x6E).
// We need to replace the JS escape sequence \n with actual newlines to see the output.
const backslash = String.fromCharCode(92);
const actualContent = rawContent
  .replace(new RegExp(backslash + "n", "g"), "\n")
  .replace(new RegExp(backslash + "t", "g"), "\t")
  .replace(new RegExp(backslash + backslash, "g"), backslash);

// Show lines containing sitemap, Protect, or DB-only
const lines = actualContent.split("\n");
console.log("=== htaccessContent (evaluated) — relevant lines ===");
for (const line of lines) {
  if (line.includes("sitemap") || line.includes("Protect") || line.includes("DB-only")) {
    console.log(">>> " + line);
  }
}
console.log("=== End ===");