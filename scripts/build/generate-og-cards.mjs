/**
 * generate-og-cards.mjs
 *
 * Generates a branded 1200x630 JPG social card for every published post into
 * public/og/<slug>.jpg. WebP covers referenced by posts live behind the PHP
 * API (/api/uploads) and are therefore fetched from the live site at build
 * time; if a cover can't be fetched, a text-only card is generated instead —
 * so the script never fails the build.
 *
 * Why: WhatsApp/LinkedIn/Telegram render .webp OG images inconsistently, and
 * raw covers carry no title overlay. JPG cards with a readable headline
 * measurably lift share CTR.
 *
 * Runs automatically as part of `npm run build` (before `next build`, so the
 * cards ship in the static export).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const SITE = "https://sinisteroid.ir";
const W = 1200;
const H = 630;

const BG = "#020503";
const ACID = "#b8ff00";
const CYAN = "#00e5ff";
const INK = "#f2f7f2";

const postsDir = path.join(root, "content", "posts");
const outDir = path.join(root, "public", "og");
fs.mkdirSync(outDir, { recursive: true });

const posts = fs
  .readdirSync(postsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(postsDir, f), "utf8"));
    } catch {
      return null;
    }
  })
  .filter((p) => p && p.slug && (p.status ?? "published") !== "draft");

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Word-wrap a title to fit the card; max 3 lines, ellipsis on overflow. */
function wrap(text, maxChars, maxLines) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length + 1) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "…";
  }
  return lines.slice(0, maxLines);
}

/** SVG text overlay: brand mark, headline, site URL. Rendered by librsvg
 * (pango) — handles Latin + RTL Arabic-script shaping. */
function overlaySvg(title, isFa) {
  const lines = wrap(title, isFa ? 34 : 38, 3);
  const fs_ = lines.some((l) => l.length > 30) ? 56 : 68;
  const lh = fs_ * 1.18;
  const baseY = H - 150 - (lines.length - 1) * lh;
  const titleLines = lines
    .map(
      (l, i) =>
        `<text x="80" y="${baseY + i * lh}" font-size="${fs_}" font-weight="700" fill="${INK}">${esc(l)}</text>`
    )
    .join("\n    ");
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Tahoma, Arial, sans-serif">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.35" stop-color="#020503" stop-opacity="0"/>
      <stop offset="1" stop-color="#020503" stop-opacity="0.94"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  <rect x="80" y="64" width="56" height="6" fill="${ACID}"/>
  <text x="152" y="76" font-size="24" letter-spacing="8" fill="${ACID}" font-weight="600">SINISTEROID</text>
  <text x="${W - 80}" y="76" font-size="20" letter-spacing="2" fill="${CYAN}" text-anchor="end">${isFa ? "امید — فرانت‌اند" : "OMID — FRONTEND"}</text>
  ${titleLines}
  <text x="80" y="${H - 70}" font-size="24" letter-spacing="3" fill="${CYAN}">sinisteroid.ir</text>
</svg>`;
}

/** Fallback card background when no cover image is available. */
const flatBase = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${BG}"/>
    <g stroke="#0d1a12" stroke-width="1">
      ${Array.from({ length: 8 }, (_, i) => `<line x1="${(i + 1) * 133}" y1="0" x2="${(i + 1) * 133}" y2="${H}"/>`).join("")}
      ${Array.from({ length: 4 }, (_, i) => `<line x1="0" y1="${(i + 1) * 126}" x2="${W}" y2="${(i + 1) * 126}"/>`).join("")}
    </g>
  </svg>`
);

async function fetchCover(src) {
  if (!src) return null;
  const url = src.startsWith("http") ? src : `${SITE}${src}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) return null;
    return buf;
  } catch {
    return null;
  }
}

let made = 0;
for (const post of posts) {
  const outPath = path.join(outDir, `${post.slug}.jpg`);
  const en = post.translations?.en ?? {};
  const title = en.title ?? post.title ?? post.slug;
  const cover = await fetchCover(post.featuredImage?.src);
  const base = cover
    ? await sharp(cover)
        .resize(W, H, { fit: "cover", position: "centre" })
        .modulate({ brightness: 0.85, saturation: 1.05 })
        .toBuffer()
    : flatBase;
  const svg = Buffer.from(overlaySvg(title, false));
  await sharp(base)
    .composite([{ input: svg, top: 0, left: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outPath);
  made++;
  console.log(`  + og/${post.slug}.jpg ${cover ? "(cover)" : "(text-only)"}`);
}
console.log(`Generated ${made} OG cards → public/og/`);
