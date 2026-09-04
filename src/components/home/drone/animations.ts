/**
 * HOVER DRONE — generated keyframes + `<style>` payload for the fully
 * dressed saucer. Pure string generation; the component injects STYLE once.
 *
 * Motion rules mirror the deck: transform/opacity only, animated nodes sit on
 * transform-attribute-free nested `<g>`s, `.drn-paused` freezes the asset
 * while scrolled out of view, prefers-reduced-motion falls back to static.
 */
export const STYLE = [
  "/* Drone — hover saucer v2 */",
  ".drn-root{--drn-acid:var(--color-acid,#b8ff00);--drn-cyan:var(--color-accent,#00e5ff);--drn-mag:#ff2bd6}",
  ".drn-bob{animation:drn-bob 4.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 75%}",
  ".drn-rotor{animation:drn-spin .5s linear infinite;transform-box:fill-box;transform-origin:center}",
  ".drn-led{animation:drn-led .9s steps(2) infinite;animation-delay:var(--drn-dl,0s);transform-box:fill-box;transform-origin:center}",
  ".drn-beacon{animation:drn-beacon .7s steps(2) infinite;transform-box:fill-box;transform-origin:center}",
  ".drn-flicker{animation:drn-flick .14s steps(3) infinite;transform-box:fill-box;transform-origin:center}",
  ".drn-sweep{animation:drn-sweep 6.5s linear infinite;transform-box:fill-box;transform-origin:center}",
  ".drn-scan{animation:drn-scan 3.2s cubic-bezier(.4,0,.2,1) infinite;transform-box:fill-box;transform-origin:center}",
  ".drn-mote{animation:drn-mote 4.2s cubic-bezier(.4,0,.2,1) infinite;animation-delay:var(--drn-dl,0s);transform-box:fill-box;transform-origin:center}",
  ".drn-core{animation:drn-core 2.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}",
  ".drn-breathe{animation:drn-breathe 3.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}",
  /* freeze while scrolled out of view (toggled by IntersectionObserver) */
  ".drn-paused *{animation-play-state:paused!important}",
  "@media (prefers-reduced-motion: reduce){" +
    ".drn-bob,.drn-rotor,.drn-beacon,.drn-flicker,.drn-sweep,.drn-scan,.drn-mote,.drn-core,.drn-breathe{animation:none!important}" +
    ".drn-led{animation:none!important;opacity:.85}" +
    "}",
  "@keyframes drn-bob{0%,100%{transform:translateY(3px) rotate(-.9deg)}50%{transform:translateY(-7px) rotate(.9deg)}}",
  "@keyframes drn-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}",
  "@keyframes drn-led{0%,100%{opacity:.18}50%{opacity:1}}",
  "@keyframes drn-beacon{0%,100%{opacity:.12}50%{opacity:1}}",
  "@keyframes drn-flick{0%{opacity:.15}48%{opacity:1}100%{opacity:.5}}",
  "@keyframes drn-sweep{from{transform:rotate(0)}to{transform:rotate(360deg)}}",
  "@keyframes drn-scan{0%{opacity:.55;transform:scale(.92)}62%{opacity:.08;transform:scale(1.32)}100%{opacity:0;transform:scale(1.5)}}",
  "@keyframes drn-mote{0%{opacity:0;transform:translateY(7px) scale(.5)}14%{opacity:.95;transform:translateY(0) scale(1)}70%{opacity:.5;transform:translateY(-26px) scale(.85)}100%{opacity:0;transform:translateY(-40px) scale(.45)}}",
  "@keyframes drn-core{0%,100%{opacity:.65;transform:scale(1)}50%{opacity:1;transform:scale(1.16)}}",
  "@keyframes drn-breathe{0%,100%{opacity:.42;transform:scale(1)}50%{opacity:.85;transform:scale(1.06)}}",
].join("");