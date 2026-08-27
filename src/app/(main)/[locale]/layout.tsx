import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Space_Grotesk,
  JetBrains_Mono,
  Vazirmatn,
  Syne,
  Noto_Kufi_Arabic,
  Unbounded,
} from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GLBackground from "@/components/GLBackground";
import GridLines from "@/components/GridLines";
import Cursor from "@/components/Cursor";
import CommandPalette, { type CmdEntry } from "@/components/CommandPalette";
import EasterEgg from "@/components/EasterEgg";
import { getAllPosts } from "@/lib/posts";
import { postTitle } from "@/lib/post-helpers";
import skillsData from "@/data/skills.json";
import { isLocale, locales, loc, getDict, type Locale } from "@/lib/i18n";
import { seoAlternates } from "@/lib/seo";
import { JsonLd, personJsonLd, websiteJsonLd } from "@/lib/schema";
import "../../globals.css";

// Sets the theme before first paint — no light-mode flash on load.
const THEME_INIT = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){}`;

// With output: "export", only render locales listed in generateStaticParams.
// Any other value (e.g. /admin/) → 404 instead of a runtime crash.
export const dynamicParams = false;

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

// Persian body text needs an Arabic-script face; Vazirmatn is variable too,
// so the kinetic weight effect still works.
const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
});

// Display faces: Syne for Latin headings (brutalist variable, keeps the
// kinetic weight effect); Noto Kufi Arabic mirrors it for Persian —
// geometric Kufi letterforms, also variable (100–900).
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-kufi",
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
    ...(isLocale(locale)
      ? {
          alternates: {
            ...seoAlternates("", locale),
            types: { "application/rss+xml": "/feed.xml" },
          },
        }
      : {}),
    openGraph: {
      siteName: "Sinisteroid",
      type: "website",
      url: "https://sinisteroid.ir",
      // Dedicated 1200x630 social card (homePic.webp is a 960x1280 portrait)
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

  // Indexable commands for the palette: pages, skills and posts (content is
  // compiled at build time and serialized into the static export).
  const NAV_PATHS = ["/", "/work", "/skills", "/education", "/showcase", "/blog"];
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
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${vazirmatn.variable} ${syne.variable} ${notoKufiArabic.variable} ${unbounded.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`min-h-screen bg-bg text-ink antialiased ${
          locale === "fa"
            ? "[font-family:var(--font-vazirmatn),Tahoma,sans-serif]"
            : "font-sans"
        }`}
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <GLBackground />
        <GridLines />
        <div aria-hidden className="noise" />
        <Cursor />
        <CommandPalette locale={locale} entries={entries} />
        <EasterEgg locale={locale} />
        {/* Structured data: site + owner entity, visible on every page */}
        <JsonLd data={[personJsonLd(locale), websiteJsonLd(locale)]} />
        <Navbar locale={locale} />
        <main className="relative z-10">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
