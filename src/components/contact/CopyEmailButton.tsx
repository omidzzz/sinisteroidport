"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Copy-to-clipboard chip for the contact page's email card. Uses the async
 * Clipboard API when available and falls back to a hidden textarea +
 * execCommand elsewhere. Self-resets after 2 s; failures are silent because
 * the mailto link sits right next to it.
 */
export default function CopyEmailButton({
  email,
  copyLabel,
  copiedLabel,
}: {
  email: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard refused — the mailto link beside it still works
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${copyLabel}: ${email}`}
      className="contact-copy"
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}
