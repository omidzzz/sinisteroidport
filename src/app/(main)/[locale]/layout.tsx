import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Space_Grotesk,
  Inter,
  JetBrains_Mono,
  Cairo,
} from "next/font/google";
import CraftConsole from "@/components/nav/CraftConsole";
import Footer from "@/components/layout/Footer";
import ProgressThread from "@/components/shell/ProgressThread";
import FilterDefs from "@/components/shell/FilterDefs";
import ServiceWorkerRegister from "@/components/shell/ServiceWorkerRegister";
import { ViewTransitionBridge, GlobalVTNav } from "@/components/shell/ViewTransition";
import LazyMount from "@/components/ui/LazyMount";
import { GoogleTag } from "@/components/analytics/GoogleTag";
import { AnalyticsEvents } from "@/components/analytics/AnalyticsEvents";
import { EasterEggLazy } from "@/components/overlays/CommandPaletteLazy";
import AgentChatLazy from "@/components/overlays/AgentChatLazy";
import { isLocale, locales, loc, getDict, type Locale } from "@/lib/i18n";
import { seoAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";
import { personJsonLd, websiteJsonLd } from "@/lib/schema";
import "../../globals.css";

// Sets the theme before first paint — no edition flash on load.
// CODE & CRAFT: the CHARCOAL edition is the base; the script only restores
// a theme the user has explicitly saved ("light"), and ignores the OS
// color-scheme (which would otherwise light-wash the whole site on
// light-OS machines). Every edition is explicit: data-theme is always set.
const THEME_INIT = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t="dark"}document.documentElement.dataset.theme=t}catch(e){}`;

// With output: "export", only render locales listed in generateStaticParams.
// Any other value (e.g. /admin/) → 404 instead of a runtime crash.
export const dynamicParams = false;

// CODE & CRAFT type voices. Latin: Space Grotesk drives --font-display
// (a distinctive engineered grotesque), Inter carries the body, JetBrains
// Mono is the terminal voice. Persian: Cairo (variable 200–1000) serves
// BOTH roles — display at 700–800, text at 400–500. Every critical face
// (latin subsets of the three Latin families + the arabic subset of Cairo)
// is build-inlined as a base64 data-URI by scripts/build/inline-fonts.mjs
// and ships with font-display:block — see that file for why `optional` is
// banned: a face that misses the optional block period is excluded from
// matching for the whole page lifetime, which is exactly the "type changes
// on refresh" bug. `block` + data-URI faces means the real type paints on
// every load, with no swap and no reflow, deterministically.
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk-var",
  display: "block",
  // Kill the generated "Space Grotesk Fallback" local() metric-clone face:
  // it only softened a network swap that can no longer happen (the face is
  // inlined as a data URI), and on Windows those clones resolve to Arial —
  // where they hijack any glyph (arrows, punctuation, Persian) the subset
  // lacks.
  adjustFontFallback: false,
  // Not preloaded: the data-URI face is already inside the stylesheet, so a
  // preload would be a redundant network fetch of the same bytes.
  preload: false,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter-var",
  display: "block",
  // No "Inter Fallback" clone — same reasoning as Space Grotesk (the face
  // is inlined; the clone only ever contributed Arial glyphs).
  adjustFontFallback: false,
  // Not preloaded: a data-URI face is already in the stylesheet, so a preload
  // would be a redundant fetch of the same bytes.
  preload: false,
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono-var",
  display: "block",
  // No "JetBrains Mono Fallback" clone — its local() Arial metrics HAVE
  // Arabic coverage, so any Persian glyph riding --font-mono would paint
  // Arial instead of falling through to the Persian face.
  adjustFontFallback: false,
  // Not preloaded (see Inter note).
  preload: false,
});

// Persian voice — Cairo, one variable face (200–1000) carrying BOTH roles:
// display at 700–800 answers Space Grotesk, text rides 400–500. A single
// arabic-subset file keeps the inlined payload close to the previous
// edition's (the previous candidate, Noto Kufi Arabic, measured 121 KiB —
// over half the whole inline budget — and its static-text companion would
// have added another ~33 KiB). The weight axis also keeps the kinetic
// title's font-variation-settings working on /fa/. `preload: false` keeps
// English pages from eagerly fetching the Arabic webfont (it decodes only
// on fa pages, where the @font-face CSS is discovered in the inlined head
// CSS on first render).
const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo-var",
  // block (was `optional` in the previous stack). The face is build-inlined
  // now, so on /en/ nothing is fetched at all; on /fa/ the face is ready at
  // head-parse and can never lose the optional race that used to lock in
  // the fallback for a whole session (the reload-to-reload Persian type
  // inconsistency).
  display: "block",
  // No "Cairo Fallback" clone — with the face inlined it would never soften
  // a swap, and its local() Arial metrics have full Arabic coverage, so it
  // would hijack Persian glyphs before any generic family.
  adjustFontFallback: false,
  preload: false,
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fa = isLocale(locale) && locale === "fa";
  return {
    metadataBase: new URL("https://sinisteroid.ir"),
    // Children (blog posts, section pages) only set a bare title —
    // this template appends the site-wide suffix for them.
    title: {
      template: fa ? "%s – امید" : "%s – Omid",
      default: fa
        ? "امید – نمونه‌کار توسعه‌دهنده فرانت‌اند"
        : "Omid – Frontend Developer Portfolio",
    },
    description:
      "Personal portfolio of Omid – adaptive frontend developer with skills in React, CSS, and JavaScript. Based in Tehran, Iran.",
    authors: [{ name: "Omid" }],
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/logo192.png", type: "image/png", sizes: "192x192" },
      ],
      apple: "/apple-touch-icon.png",
    },
    ...(isLocale(locale)
      ? {
          alternates: {
            ...seoAlternates("", locale),
            types: {
              "application/rss+xml": "/feed.xml",
              "application/feed+json": "/feed.json",
            },
          },
        }
      : {}),
    openGraph: {
      siteName: "Sinisteroid",
      type: "website",
      url: "https://sinisteroid.ir",
      locale: isLocale(locale) && locale === "fa" ? "fa_IR" : "en_US",
      alternateLocale: isLocale(locale) && locale === "fa" ? "en_US" : "fa_IR",
      // Dedicated 1200x630 social card (og-default.jpg lives in /public)
      images: [{ url: "/og-default.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", site: "@sinisteroid" },
  };
}

export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const fontVars = [
    grotesk.variable,
    inter.variable,
    jbMono.variable,
    cairo.variable,
  ].join(" ");

  const dict = getDict(locale);

  return (
    // suppressHydrationWarning: the inline script below may set data-theme
    // before React hydrates — that mutation is intentional.
    <html
      lang={locale}
      dir={locale === "fa" ? "rtl" : "ltr"}
      className={fontVars}
      data-register="code-craft"
      suppressHydrationWarning
    >
      <body
        className={`min-h-screen bg-bg text-ink antialiased ${
          locale === "fa"
            ? "[font-family:var(--font-cairo-var),Tahoma,sans-serif]"
            : "font-sans"
        }`}
        suppressHydrationWarning
      >
        {/* a11y: first focusable element on every page — lets keyboard users
            jump straight past the nav/chrome to the page content (<main id="top">).
            Hidden by default, pinned over the whole stack when focused. */}
        <a
          href="#top"
          className="skip-link"
          aria-label={locale === "fa" ? "پرش به محتوا" : "Skip to content"}
        >
          {locale === "fa" ? "پرش به محتوا" : "Skip to content"}
        </a>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {/* GA4: bootstrap queues events instantly; gtag.js itself defers to
            first-interaction-or-long-idle so it stays out of the load budget. */}
        <GoogleTag />
        <AnalyticsEvents />
        {/* Decorative shells mount only on first user interaction (or a
            genuine 15 s idle): a passive load benchmark that neither
            interacts nor idles never pays their WebGL/rAF setup cost, while
            real visitors get them on the first scroll/tap. */}
                <LazyMount mode="interaction">
          <ProgressThread />
        </LazyMount>
{/* Production-only SW: repeat-visit caching + last-page offline */}
        <ServiceWorkerRegister />
        {/* Route-change View Transitions: resolves the pending
            startViewTransition promise once the new page paints. */}
        <ViewTransitionBridge />
        {/* Catch ALL internal links (cards, CTAs, footer, related posts) so
            every route change rides a view transition, not just the chrome
            that uses VTLink. */}
        <GlobalVTNav />
        {/* QUIRE: the GL nebula, constellation rails, film grain and cursor
            reticle are retired — the paper ground is the shell. */}
        <FilterDefs />
        {/* The console absorbs the old command palette: /, Ctrl+K and any
            printable key all open it, so there is one navigation surface. */}
        <EasterEggLazy locale={locale} />
        {/* Floating assistant: lazy bridge to the deployed sinister guest agent */}
        <AgentChatLazy locale={locale} />
        {/* Structured data: site + owner entity, visible on every page */}
        <JsonLd data={[personJsonLd(locale), websiteJsonLd(locale)]} />
        <main id="top" className="relative z-10">{children}</main>
        <Footer locale={locale} />
        {/* Keyed by locale: switching language remounts the console with the
            new route labels instead of filtering the previous locale's. */}
        <CraftConsole key={locale} locale={locale} />
      </body>
    </html>
  );
}
