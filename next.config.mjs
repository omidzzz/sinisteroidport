import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig } */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  outputFileTracingRoot: __dirname,
  // NOTE: experimental.inlineCss was REMOVED. With output:"export" it emitted
  // the compiled stylesheet as an inline <style> — but the RSC flight payload
  // ALSO embedded the whole 194 KiB stylesheet as a text node (the flight
  // duplicates the React tree, including the style element), so the CSS was
  // shipped TWICE in every HTML document (~380 KiB of extra bytes + a 187 KiB
  // JS-string parse + flight deserialize on the main thread). An external
  // render-blocking stylesheet is discovered by the preload scanner in the
  // first bytes of the HTML, so its download overlaps the HTML transfer; the
  // net effect is smaller documents, cheaper flight hydration, equal FCP.
  // ── Legacy-JS polyfill swap (Next 16 / Turbopack) ──────────────────
  // Next unconditionally bundles next/dist/build/polyfills/polyfill-module
  // (~11 KiB of shims for Promise.finally, Object.fromEntries,
  // Array.prototype.at/flat(Map), Object.hasOwn, String.trimStart/End,
  // IntersectionObserver). Every browser in our browserslist has all of
  // them natively, so swap the module for an empty shim
  // (scripts/polyfill-shim.js). Turbopack is the default bundler in
  // Next 16; the webpack block below is kept only for explicit
  // `next build --webpack` fallback runs.
  turbopack: {
    resolveAlias: {
      "next/dist/build/polyfills/polyfill-module": "./scripts/polyfill-shim.js",
    },
  },
  webpack(config, { webpack }) {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /polyfills[/\\]polyfill-module/,
        path.resolve(__dirname, "scripts/polyfill-shim.js")
      )
    );
    return config;
  },
};

export default nextConfig;

