import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Space_Grotesk,
  JetBrains_Mono,
  Vazirmatn,
  Orbitron,
  Noto_Kufi_Arabic,
  Unbounded,
} from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GLBackground from "@/components/shell/GLBackground";
import ProgressThread from "@/components/shell/ProgressThread";
import GridLines from "@/components/shell/GridLines";
import Cursor from "@/components/shell/Cursor";
import { GoogleTag } from "@/components/analytics/GoogleTag";
import { AnalyticsEvents } from "@/components/analytics/AnalyticsEvents";
import {
  CommandPaletteLazy,
  EasterEggLazy,
} from "@/components/overlays/CommandPaletteLazy";
import type { CmdEntry } from "@/components/overlays/CommandPalette";
import { getAllPosts } from "@/lib/blog/repository";
import { postTitle } from "@/lib/blog/format";
import skillsData from "@/data/skills.json";
import { NAV_PATHS } from "@/lib/nav";
import { isLocale, locales, loc, getDict, type Locale } from "@/lib/i18n";
import { seoAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";
import { personJsonLd, websiteJsonLd } from "@/lib/schema";
import "../../globals.css";

// Sets the theme before first paint — no light-mode flash on load.
// Default is DARK (the house identity); the script only restores a theme the
// user has explicitly saved, and ignores the OS color-scheme (which would
// otherwise light-wash the whole site on light-OS machines).
const THEME_INIT = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t="dark"}document.documentElement.dataset.theme=t}catch(e){}`;

// With output: "export", only render locales listed in generateStaticParams.
// Any other value (e.g. /admin/) → 404 instead of a runtime crash.
export const dynamicParams = false;

// Display face for the ACID RAVE identity — a wide techno variable face
// (400–900) driving --font-display for Latin headings; Kufi mirrors it in Persian.
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron-var",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Display logotype face for the SINISTER[OID] brand — a wide, slightly
// techno variable face (200–900). Loaded only for the lockup, so it does
// not add global weight.
const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  display: "swap",
});

// Persian body text needs an Arabic-script face; Vazirmatn is variable too,
// so the kinetic weight effect still works. Noto Kufi Arabic mirrors the
// removed Syne — geometric Kufi letterforms, variable (100–900). `preload:
// false` keeps English pages from eagerly fetching the Arabic webfonts (they
// decode only on fa pages, where the @font-face CSS is discovered in the
// inlined head CSS on first render).
const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
  preload: false,
});

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-kufi",
  display: "swap",
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
    orbitron.variable,
    spaceGrotesk.variable,
    jetbrainsMono.variable,
    unbounded.variable,
    vazirmatn.variable,
    notoKufiArabic.variable,
  ].join(" ");

  // Indexable commands for the palette: pages, skills and posts (content is
  // compiled at build time and serialized into the static export).
  const dict = getDict(locale);
  const posts = getAllPosts();
  const groupPage = locale === "fa" ? "بخش" : "Page";
  const groupSkill = locale === "fa" ? "مهارت" : "Skills";
  const groupPost = locale === "fa" ? "نوشته" : "Posts";
  const entries: CmdEntry[] = [
    ...dict.nav.map((n, i) => ({
      id: `page-${i}`,
      label: n.label,
      sub: NAV_PATHS[i],
      group: groupPage,
      href: loc(locale, NAV_PATHS[i]),
    })),
    ...skillsData.flatMap((g) =>
      g.skills.map((s) => ({
        id: `skill-${s.name}`,
        label: s.name,
        sub: g.category,
        group: groupSkill,
        href: loc(locale, "/skills"),
      }))
    ),
    ...posts.map((p) => ({
      id: `post-${p.slug}`,
      label: postTitle(p, locale),
      sub: p.date ? p.date.slice(0, 10) : undefined,
      group: groupPost,
      href: loc(locale, `/blog/${p.slug}`),
    })),
  ];

  return (
    // suppressHydrationWarning: the inline script below may set data-theme
    // before React hydrates — that mutation is intentional.
    <html
      lang={locale}
      dir={locale === "fa" ? "rtl" : "ltr"}
      className={fontVars}
      suppressHydrationWarning
    >
      <body
        className={`min-h-screen bg-bg text-ink antialiased ${
          locale === "fa"
            ? "[font-family:var(--font-vazirmatn),Tahoma,sans-serif]"
            : "font-sans"
        }`}
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {/* GA4: tag loads post-hydration (afterInteractive), event wiring is
            delegated and renders nothing on screen. */}
        <GoogleTag />
        <AnalyticsEvents />
        <ProgressThread />
        <GLBackground />
        <GridLines />
        <div aria-hidden className="noise" />
        <Cursor />
        <CommandPaletteLazy locale={locale} entries={entries} />
        <EasterEggLazy locale={locale} />
        {/* Structured data: site + owner entity, visible on every page */}
        <JsonLd data={[personJsonLd(locale), websiteJsonLd(locale)]} />
        <Navbar locale={locale} />
        <main id="top" className="relative z-10">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
