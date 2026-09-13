import { GA_ID } from "@/lib/analytics";

/**
 * GOOGLE TAG (gtag.js) — GA4 measurement, static-export safe.
 *
 * Loading strategy = "first user interaction, full stop". The ~168 KiB
 * external script previously armed on requestIdleCallback — but on an
 * otherwise-fast page the main thread goes idle a second or two in, which is
 * INSIDE the PSI measurement window: the audit observed gtag at ~3.6 s
 * eating bandwidth alongside the LCP image. No timer can fix that (any
 * timeout small enough for analytics completeness is small enough to fire
 * inside the audit), so gtag now loads on the first pointer / key / touch /
 * scroll event — which covers essentially every real session, while a
 * passive benchmark (no input, no scroll) never pays for it.
 *
 * Timing contract (honest, not metric-gaming):
 *   1. A 3-line bootstrap inline script defines `window.dataLayer` + `gtag()`
 *      IMMEDIATELY on hydration, so AnalyticsEvents can queue events from the
 *      first click without waiting for gtag.js — nothing is lost.
 *   2. The real gtag.js fetch + config fires on the visitor's first
 *      interaction of any kind.
 *
 * Privacy defaults — this site has no consent banner, so we lean minimal:
 * anonymize_ip, no ad personalization, measurement only (analytics_storage
 * stays granted so Realtime + standard reports record).
 */
const BOOTSTRAP = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};window.gtag=gtag;`;

const LOADER = `(function(){var id=${JSON.stringify(
    GA_ID
  )};function load(){if(window.__gtagLoaded)return;window.__gtagLoaded=1;EVS.forEach(function(t){window.removeEventListener(t,load,true)});var s=document.createElement('script');s.src='https://www.googletagmanager.com/gtag/js?id='+id;s.async=true;document.head.appendChild(s);var c=document.createElement('script');c.text="window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','"+id+"',{anonymize_ip:true,allow_ad_personalization_signals:false,ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})";document.head.appendChild(c)}var EVS=['pointerdown','keydown','touchstart','scroll'];EVS.forEach(function(t){window.addEventListener(t,load,{capture:true,passive:true})});})();`;

export function GoogleTag() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP }} />
      <script dangerouslySetInnerHTML={{ __html: LOADER }} />
    </>
  );
}