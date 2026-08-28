"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Detects browser language preference and redirects to the
 * locale-prefixed version of the given path.
 * Shows fallback links while redirecting.
 */
export default function LocaleRedirect({
  path,
  children,
}: {
  /** Path WITHOUT locale prefix, e.g. "/blog/my-post" */
  path: string;
  children?: ReactNode;
}) {
  useEffect(() => {
    const langs = (
      navigator.languages ?? [navigator.language ?? "en"]
    ).join(",");
    const locale = /(^|,)\s*fa/.test(langs) ? "fa" : "en";
    window.location.replace(`/${locale}${path}`);
  }, [path]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        color: "#7d7d74",
        fontFamily: "monospace",
      }}
    >
      <p>
        <a href={`/en${path}`} style={{ color: "#ff2b55" }}>
          English
        </a>{" "}
        ·{" "}
        <a href={`/fa${path}`} style={{ color: "#ff2b55" }}>
          فارسی
        </a>
      </p>
      {children}
    </div>
  );
}
