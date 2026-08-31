import Script from "next/script";
import { GA_ID } from "@/lib/analytics";

/**
 * GOOGLE TAG (gtag.js) — GA4 measurement, static-export safe.
 *
 * Both scripts use strategy="afterInteractive", i.e. they load AFTER React
 * hydration, so the ~25 KB external script never delays first paint or LCP
 * (the Lighthouse work on this site stays intact). beforeInteractive is the
 * only alternative but is unavailable under output: "export".
 *
 * Privacy defaults — this site has no consent banner, so we lean minimal:
 *   • anonymize_ip                      → IPs masked in GA reporting
 *   • allow_ad_personalization_signals: false
 *   • ad_storage / ad_user_data / ad_personalization: "denied" → no
 *     advertising features; pure measurement only
 *   • analytics_storage stays granted so Realtime + standard reports record.
 *     If a cookie banner is ever added, flip that line to "denied" until the
 *     visitor opts in (Consent Mode re-grants it via gtag('consent','update')).
 *
 * The config is a single string (not dangerouslySetInnerHTML) — the exact
 * inline script the GTM "set up a Google tag" screen distributes, minus the
 * comment header.
 */
const GA_INLINE = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true,allow_ad_personalization_signals:false,ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});`;

export function GoogleTag() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-config" strategy="afterInteractive">
        {GA_INLINE}
      </Script>
    </>
  );
}