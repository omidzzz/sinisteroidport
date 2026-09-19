#!/usr/bin/env node
import fs from "node:fs";

const css = fs.readFileSync(process.argv[2], "utf8");
const faces = [...css.matchAll(/@font-face\{[^}]+\}/g)];
for (const m of faces) {
  const block = m[0];
  const family = (block.match(/font-family:([^;]+);/)?.[1] ?? "?").trim();
  const weight = (block.match(/font-weight:([^;]+);/)?.[1] ?? "?").trim();
  const unicode = (block.match(/unicode-range:([^;]+);/)?.[1] ?? "?").trim();
  const src = (block.match(/src:url\(([^)]+)\)/)?.[1] ?? "?").trim();
  const isData = src.startsWith("data:");
  if (family === "Cairo") {
    console.log(`Cairo | weight: ${weight} | unicode: ${unicode} | ${isData ? "INLINED" : src}`);
  }
}
