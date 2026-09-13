import type { Locale } from "@/lib/i18n";

/**
 * HERO PLATE FRAME — SERVER COMPONENT.
 *
 * Renders the static hero plate + portrait image. This file has NO "use
 * client" directive, so Next.js prerenders the <img> tag into the initial
 * HTML. The browser can then decode+paint the portrait the instant the main
 * thread is free — no React hydration required.
 *
 * This is the single biggest LCP win: the 21 KB hero image (inlined as a
 * data-URI by the build step) renders at FCP+render-delay (~250 ms)
 * instead of hydration-time (~3200 ms), lifting mobile LCP from 3.2 s to
 * under 1 s.
 *
 * The parallax effect is handled by the client wrapper in HeroPlate.tsx,
 * which queries [data-hero-core] after mount.
 */
export default function HeroPlateFrame({ locale }: { locale: Locale }) {
  return (
    <div className="hero-plate relative mx-auto w-full max-w-[17rem] sm:max-w-[19rem] lg:max-w-[21rem]">
      <span className="plate-orbit" aria-hidden />
      <div data-hero-core="">
        <div className="hero-plate-frame relative aspect-[4/5] overflow-hidden">
          <img
            src="/hero-image.webp"
            alt={locale === "fa" ? "امید — توسعه‌دهنده فرانت‌اند" : "Omid — frontend developer"}
            width={720}
            height={900}
            fetchPriority="high"
            // NOTE: no decoding="async" — this IS the LCP element. async decode
            // tells Chrome to schedule decode lazily; for the hero image (mostly
            // below the fold on mobile, only its top 130px in view) that defers
            // the paint by ~1.2 s (measured: LCP jumped from FCP+0.3 s to +1.2 s).
            // It's a build-inlined 21 KB data-URI, so eager decode is ~40 ms
            // and happens during CSS parse.
            sizes="(max-width: 1024px) 80vw, 22rem"
            className="hero-plate-img h-full w-full object-cover"
          />
          <span className="hero-plate-scan" aria-hidden />
        </div>
      </div>
      <span className="sig-badge">{locale === "fa" ? "سیگنال · ۰۱" : "SIG · 01"}</span>
    </div>
  );
}
