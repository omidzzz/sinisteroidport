import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig } */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  outputFileTracingRoot: __dirname,
  // Inline all CSS into <style> tags instead of render-blocking external
  // stylesheets — for a static export this removes the two stylesheet
  // roundtrips that cost ~1 s of first-paint latency under PSI throttling.
  experimental: { inlineCss: true },
  webpack(config, { webpack }) {
    // Lighthouse "Legacy JavaScript": Next unconditionally bundles
    // next/dist/build/polyfills/polyfill-module (~11 KiB of shims for
    // Promise.finally, Object.fromEntries, Array.prototype.at/flat(Map),
    // Object.hasOwn, String.trimStart/End, IntersectionObserver). Every
    // browser in our browserslist has all of them natively, so swap the
    // module for an empty shim (scripts/polyfill-shim.js).
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

