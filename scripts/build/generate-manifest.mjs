/**
 * generate-manifest.mjs
 *
 * Writes public/manifest.json from src/lib/brand.json — the same single
 * source the TS app reads. The manifest names the person/site and points
 * the PWA chrome at the dark-edition ground, so a re-brand is one JSON
 * edit instead of a hunt through literals.
 *
 * Runs automatically as part of `npm run build` (before `next build`, so
 * the shipped file travels with the static export like every other
 * hand-authored public/ asset).
 */
import fs from "node:fs";
import path from "node:path";
import { BRAND, root } from "../lib/brand.mjs";

const manifest = {
  short_name: BRAND.site,
  name: `${BRAND.person} – Frontend Developer Portfolio`,
  description: `Personal portfolio of ${BRAND.person} – adaptive frontend developer with skills in React, CSS, and JavaScript.`,
  icons: [
    {
      src: "favicon.ico",
      sizes: "64x64 32x32 24x24 16x16",
      type: "image/x-icon",
    },
    {
      src: "logo192.png",
      type: "image/png",
      sizes: "192x192",
    },
    {
      src: "logo512.png",
      type: "image/png",
      sizes: "512x512",
    },
  ],
  start_url: ".",
  display: "standalone",
  theme_color: BRAND.themeColors.dark,
  background_color: BRAND.themeColors.dark,
};

fs.writeFileSync(
  path.join(root, "public", "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);
console.log("✓ wrote public/manifest.json (from brand.json)");
