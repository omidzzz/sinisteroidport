/**
 * FROG — nervous Pepe, psychedelic acid edition: generated keyframes +
 * `<style>` payload. Pure string generation; the component injects STYLE
 * once.
 *
 * Motion rules mirror the deck: transform/opacity only, `.frg-paused`
 * freezes the asset while scrolled out of view, prefers-reduced-motion
 * falls back to a clean static frog (chroma ghosts hidden).
 *
 * Trip stack: chromatic acid/magenta ghost inks swimming behind the green
 * line art (opacity crossfades — no filter animation), a hypnotic pair of
 * counter-rotating dashed vortex rings, a breathing acid/magenta aura, the
 * anxious shiver, and rainbow sweat dripping on a staggered cycle.
 */
export const STYLE = [
  "/* Frog — nervous Pepe (psychedelic acid) */",
  ".frg-root{--frg-acid:var(--color-acid,#b8ff00);--frg-cyan:var(--color-accent,#00e5ff);--frg-mag:#ff2bd6;--frg-ink:#9edb5a}",
  "[data-theme=\"light\"] .frg-root{--frg-ink:#3c6e1f}",
  ".frg-ink path{fill:var(--frg-ink)}",
  ".frg-ink path.frg-drop{fill:var(--frg-cyan);filter:url(#frg-glowF)}",
  ".frg-inkA path{fill:var(--frg-acid)}",
  ".frg-inkB path{fill:var(--frg-mag)}",
  ".frg-inkA,.frg-inkB{mix-blend-mode:screen}",
  ".frg-inkA{transform:translate(.5px,-.35px);animation:frg-chromaA 6.5s ease-in-out infinite}",
  ".frg-inkB{transform:translate(-.5px,.35px);animation:frg-chromaB 6.5s ease-in-out infinite}",
  /* hypno-swirl pupils: dark socket + 3 spirals per eye, strokes cycling
   * acid → cyan → magenta (frg-acid), each layer spinning at its own speed */
  ".frg-socket{fill:#07110a;stroke:var(--frg-acid);stroke-width:.14;opacity:.9}",
  ".frg-swirl{transform-box:fill-box;transform-origin:center;fill:none}",
  ".frg-swirl0{stroke:var(--frg-acid);animation:frg-spin 3.2s linear infinite,frg-acid 5s linear infinite}",
  ".frg-swirl1{stroke:var(--frg-cyan);animation:frg-spin 4.4s linear infinite reverse,frg-acid 7s linear infinite reverse}",
  ".frg-swirl2{stroke:var(--frg-mag);animation:frg-spin 2.4s linear infinite,frg-acid 9s linear infinite}",
  ".frg-frog{animation:frg-shiver 3.8s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 60%}",
  ".frg-aura{animation:frg-breathe 3.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}",
  ".frg-auraB{animation:frg-breatheB 5.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}",
  ".frg-ring{animation:frg-spin 9s linear infinite;transform-box:fill-box;transform-origin:center}",
  ".frg-ringB{animation-duration:13s;animation-direction:reverse}",
  ".frg-drop{animation:frg-drip 2.9s cubic-bezier(.45,0,.55,1) infinite;animation-delay:var(--frg-dl,0s);transform-box:fill-box}",
  ".frg-drip{animation:frg-drip 2.9s cubic-bezier(.45,0,.55,1) infinite;animation-delay:var(--frg-dl,0s);transform-box:fill-box}",
  /* freeze while scrolled out of view (toggled by IntersectionObserver) */
  ".frg-paused *{animation-play-state:paused!important}",
  "@media (prefers-reduced-motion: reduce){" +
    ".frg-frog,.frg-aura,.frg-auraB,.frg-ring,.frg-ringB,.frg-swirl0,.frg-swirl1,.frg-swirl2,.frg-drop,.frg-drip{animation:none!important}" +
    ".frg-inkA,.frg-inkB{opacity:0!important}" +
    ".frg-ring,.frg-ringB{opacity:.18}" +
    ".frg-swirl0{stroke:var(--frg-acid)}.frg-swirl1{stroke:var(--frg-cyan)}.frg-swirl2{stroke:var(--frg-mag)}" +
    ".frg-drop,.frg-drip{opacity:.9}" +
    "}",
  /* chromatic ghosts: opacity crossfades keep the ink alive */
  "@keyframes frg-chromaA{0%,100%{opacity:.08}38%{opacity:.55}62%{opacity:.18}}",
  "@keyframes frg-chromaB{0%,100%{opacity:.4}38%{opacity:.05}62%{opacity:.5}}",
  /* mostly still, then a quick anxious shiver near the end of each cycle */
  "@keyframes frg-shiver{0%,84%,100%{transform:translate(0,0) rotate(0)}" +
    "86%{transform:translate(.35px,-.2px) rotate(.4deg)}" +
    "88%{transform:translate(-.3px,.2px) rotate(-.35deg)}" +
    "90%{transform:translate(.3px,.15px) rotate(.3deg)}" +
    "92%{transform:translate(-.25px,-.12px) rotate(-.25deg)}" +
    "94%{transform:translate(.18px,.1px) rotate(.18deg)}}",
  "@keyframes frg-breathe{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}",
  "@keyframes frg-breatheB{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.55;transform:scale(1.1)}}",
  "@keyframes frg-spin{to{transform:rotate(360deg)}}",
  /* acid-trip stroke cycle for the hypnotic pupils */
  "@keyframes frg-acid{0%{stroke:var(--frg-acid)}33%{stroke:var(--frg-cyan)}66%{stroke:var(--frg-mag)}100%{stroke:var(--frg-acid)}}",
  /* sweat forms, swells, slides down a little, fades */
  "@keyframes frg-drip{0%{opacity:0;transform:translateY(-.6px) scale(.55)}" +
    "14%{opacity:1;transform:translateY(0) scale(1)}" +
    "62%{opacity:.85;transform:translateY(2.4px) scale(.92)}" +
    "100%{opacity:0;transform:translateY(4.4px) scale(.5)}}",
].join("");
