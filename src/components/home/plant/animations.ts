/**
 * NEON PLANT — generated keyframes + `<style>` payload.
 * Pure string generation; the component injects STYLE once.
 *
 * Motion rules mirror the deck: transform/opacity only, animated nodes sit on
 * transform-attribute-free nested `<g>`s, `.plt-paused` freezes the asset
 * while scrolled out of view, prefers-reduced-motion falls back to static.
 */
export const STYLE = [
  "/* Plant — neon potted flora */",
  ".plt-root{--plt-acid:var(--color-acid,#b8ff00);--plt-cyan:var(--color-accent,#00e5ff);--plt-mag:#ff2bd6}",
  ".plt-leaf{animation:plt-sway 3.4s ease-in-out infinite;animation-delay:var(--plt-dl,0s);transform-box:fill-box;transform-origin:0% 50%}",
  ".plt-breath{animation:plt-breath 4.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}",
  ".plt-spore{animation:plt-spore 4.8s ease-in-out infinite;animation-delay:var(--plt-dl,0s);transform-box:fill-box;transform-origin:center}",
  ".plt-scanline{animation:plt-scan 6.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}",
  ".plt-ring{animation:plt-ring 3.8s ease-in-out infinite;animation-delay:var(--plt-dl,0s);transform-box:fill-box;transform-origin:center}",
  ".plt-bloom{animation:plt-bloom 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}",
  ".plt-pulse{animation:plt-pulse 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}",
  ".plt-plaque{animation:plt-blink 2s steps(2) infinite}",
  /* freeze while scrolled out of view (toggled by IntersectionObserver) */
  ".plt-paused *{animation-play-state:paused!important}",
  "@media (prefers-reduced-motion: reduce){" +
    ".plt-leaf,.plt-breath,.plt-spore,.plt-scanline,.plt-ring,.plt-bloom,.plt-pulse{animation:none!important}" +
    ".plt-plaque{animation:none!important;opacity:1}" +
    "}",
  "@keyframes plt-sway{0%,100%{transform:rotate(-3.2deg)}50%{transform:rotate(3.2deg)}}",
  "@keyframes plt-breath{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.85;transform:scale(1.07)}}",
  "@keyframes plt-spore{0%{opacity:0;transform:translateY(8px) scale(.5)}12%{opacity:.95;transform:translateY(0) scale(1)}70%{opacity:.5;transform:translateY(-30px) scale(.85)}100%{opacity:0;transform:translateY(-48px) scale(.5)}}",
  "@keyframes plt-scan{0%,100%{transform:translateY(-102px);opacity:.7}50%{transform:translateY(0);opacity:.95}}",
  "@keyframes plt-ring{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.95;transform:scale(1.05)}}",
  "@keyframes plt-bloom{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}",
  "@keyframes plt-pulse{0%,100%{opacity:.65;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}",
  "@keyframes plt-blink{0%,100%{opacity:.5}50%{opacity:1}}",
].join("");