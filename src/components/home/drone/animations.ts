/**
 * PSYCHEDELIC ALIEN UFO — keyframes + `<style>` payload.
 * Transform/opacity/filter only; `.au-paused` freezes everything while the
 * asset is scrolled out of view; prefers-reduced-motion falls back to a
 * static frame (chase lights dim to a steady glow instead of animating).
 */
export const STYLE = [
  ".au-root{display:block}",
  ".au-bob{animation:au-bob 4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 70%}",
  ".au-hue{animation:au-hue 10s linear infinite;transform-box:fill-box;transform-origin:center}",
  ".au-hue-slow{animation:au-hue 17s linear infinite reverse;transform-box:fill-box;transform-origin:center}",
  ".au-aura{animation:au-aura 5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}",
  ".au-sway{animation:au-sway 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}",
  ".au-blink{animation:au-blink 4.5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}",
  ".au-glare{animation:au-glare 3.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}",
  ".au-port{animation:au-port 1.4s steps(2) infinite;animation-delay:var(--au-dl,0s);transform-box:fill-box;transform-origin:center}",
  ".au-beam{animation:au-beam 2.8s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 0%}",
  ".au-streak{animation:au-streak var(--au-du,2.6s) ease-in infinite;animation-delay:var(--au-dl,0s);transform-box:fill-box;transform-origin:center}",
  ".au-ring{animation:au-spin 7s linear infinite;transform-box:fill-box;transform-origin:center}",
  ".au-twinkle{animation:au-twinkle var(--au-du,2.8s) ease-in-out infinite;animation-delay:var(--au-dl,0s);transform-box:fill-box;transform-origin:center}",
  ".au-spark{animation:au-spark var(--au-du,3s) linear infinite;animation-delay:var(--au-dl,0s);transform-box:fill-box;transform-origin:center}",
  ".au-paused *{animation-play-state:paused!important}",
  "@media (prefers-reduced-motion: reduce){" +
    ".au-bob,.au-hue,.au-hue-slow,.au-aura,.au-sway,.au-blink,.au-glare,.au-beam,.au-streak,.au-ring,.au-twinkle,.au-spark{animation:none!important}" +
    ".au-port{animation:none!important;opacity:.85}" +
    "}",
  "@keyframes au-bob{0%,100%{transform:translateY(3px) rotate(-1.1deg)}50%{transform:translateY(-6px) rotate(1.1deg)}}",
  "@keyframes au-hue{from{filter:hue-rotate(0deg) saturate(1.35)}to{filter:hue-rotate(360deg) saturate(1.35)}}",
  "@keyframes au-aura{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.85;transform:scale(1.07)}}",
  "@keyframes au-sway{0%,100%{transform:rotate(-3.5deg)}50%{transform:rotate(3.5deg)}}",
  "@keyframes au-blink{0%,88%,100%{transform:scaleY(1)}92%{transform:scaleY(0.12)}96%{transform:scaleY(1)}}",
  "@keyframes au-glare{0%,100%{opacity:.35}50%{opacity:.75}}",
  "@keyframes au-port{0%,100%{opacity:.35}50%{opacity:1}}",
  "@keyframes au-beam{0%,100%{opacity:.75;transform:scaleY(1)}50%{opacity:1;transform:scaleY(1.05)}}",
  "@keyframes au-streak{0%{opacity:0;transform:translateY(-4px) scale(.7)}20%{opacity:.9}85%{opacity:.4}100%{opacity:0;transform:translateY(64px) scale(1.1)}}",
  "@keyframes au-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}",
  "@keyframes au-twinkle{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.15)}}",
  "@keyframes au-spark{0%{opacity:0;transform:translateY(0) rotate(0deg) scale(.6)}15%{opacity:1}80%{opacity:.5}100%{opacity:0;transform:translateY(-22px) rotate(70deg) scale(1)}}",
].join("");
