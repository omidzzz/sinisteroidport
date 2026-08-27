import type { ReactNode } from "react";
import type { Metadata } from "next";

// Bare-URL variants are 301-redirected to their locale-prefixed canonicals
// (see scripts/prepare-cpanel.mjs); keep them out of the index regardless.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Root layout for the "/" redirect page only. */
export default function RedirectLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#0a0a0b",
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
        }}
      >
        {children}
      </body>
    </html>
  );
}
