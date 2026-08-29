"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Post } from "@/lib/posts";
import { postTitle } from "@/lib/post-helpers";
import { loc, type Locale } from "@/lib/i18n";

export interface CmdEntry {
  id: string;
  label: string;
  sub?: string;
  group: string;
  href?: string;
  external?: boolean;
  action?: "theme";
}

/**
 * Command palette — a dependency-free fuzzy "Ctrl+K" / "/" launcher.
 * Navigates pages / blog posts / skills, or runs actions (theme toggle,
 * language switch). Rendered once in the root layout and shown over the
 * top of any page. Keyboard-first: ↑/↓ choose, Enter runs, Esc closes.
 */
export default function CommandPalette({
  locale,
  entries,
  autoOpen = false,
}: {
  locale: Locale;
  entries: CmdEntry[];
  /** Mount already-open — used by the lazy wrapper when a keyboard shortcut
   * or the dock chip is the very first interaction (the chunk loads on
   * demand, so the open state must survive into the first render). */
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // current route without the locale prefix — so the language switch keeps
  // the same page instead of jumping to the homepage
  const pathname = usePathname() ?? "";
  const clean = pathname.replace(/^\/(en|fa)(?=\/|$)/, "") || "/";

  // DB-only posts: the static entry list is compiled at build time from the
  // content snapshot, so posts published through the host (MySQL, surfaced
  // by /api/get_posts.php) never show up until the next deploy. Merge them
  // in client-side, skipping slugs the snapshot already covers.
  const [dbEntries, setDbEntries] = useState<CmdEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      fetch("/api/get_posts.php")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not ok"))))
        .then((rows: Post[]) => {
          if (cancelled || !Array.isArray(rows)) return;
          const known = new Set(
            entries
              .filter((e) => e.id.startsWith("post-"))
              .map((e) => e.id.slice("post-".length))
          );
          const group = locale === "fa" ? "نوشته" : "Posts";
          setDbEntries(
            rows
              .filter((r) => r?.slug && !known.has(r.slug))
              .map((r) => ({
                id: `post-${r.slug}`,
                label: postTitle(r, locale),
                sub: r.date?.slice(0, 10),
                group,
                href: loc(locale, `/blog/${r.slug}`),
              }))
          );
        })
        .catch(() => {
          /* palette keeps the build-time index */
        });
    };
    // The prerendered index is already usable — keep the API call off the
    // hydration/LCP path until the main thread is idle (2.5s hard cap),
    // mirroring BlogListLive/LatestPostsLive.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(start, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [locale, entries]);

  // action rows, appended ahead of the content entries
  const actions = useMemo<CmdEntry[]>(() => {
    const toggleTheme: CmdEntry = {
      id: "a-theme",
      label:
        locale === "fa" ? "تغییر حالت روشن / تیره" : "Toggle light / dark theme",
      group: locale === "fa" ? "عملیات" : "Action",
      action: "theme",
    };
    const switchLang: CmdEntry = {
      id: "a-lang",
      label: locale === "fa" ? "English version" : "نسخهٔ فارسی",
      sub: locale === "fa" ? "en" : "fa",
      group: locale === "fa" ? "عملیات" : "Action",
      href: `${locale === "fa" ? "/en" : "/fa"}${clean}`,
    };
    const donate: CmdEntry = {
      id: "a-donate",
      label: locale === "fa" ? "حمایت مالی — دونیت" : "Donate — support the work",
      sub: "donatr.ee/sinisteroid",
      group: locale === "fa" ? "عملیات" : "Action",
      href: "https://donatr.ee/sinisteroid/",
      external: true,
    };
    return [toggleTheme, switchLang, donate];
  }, [locale, clean]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const haystack = (e: CmdEntry) =>
      [e.label, e.sub ?? "", e.group].join(" ").toLowerCase();
    const all = [...actions, ...entries, ...dbEntries];
    if (!q) return all;
    return all.filter((e) => haystack(e).includes(q));
  }, [query, actions, entries]);

  // global shortcut: Cmd/Ctrl+K, or "/" (unless typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      const matchK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const matchSlash = e.key === "/" && !typing;
      if (matchK || matchSlash) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Dock chip / any external affordance can open the palette by dispatching
  // this event — keeps the open state private to this component.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-command-palette", onOpen);
    return () => window.removeEventListener("open-command-palette", onOpen);
  }, []);

  useEffect(() => setActive(0), [query, open]);

  // focus the input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const run = (e: CmdEntry) => {
    if (e.action === "theme") {
      const next =
        document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* session-only */
      }
      window.dispatchEvent(new Event("themechange"));
      setOpen(false);
      return;
    }
    if (e.href) {
      if (e.external) window.open(e.href, "_blank", "noopener,noreferrer");
      else window.location.assign(e.href);
      setOpen(false);
    }
  };

  if (!open) return null;

  let cursor = 0;
  return (
    <div
      role="presentation"
      className="overlay-fade fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-4 pt-[14vh] backdrop-blur-sm"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={locale === "fa" ? "فرمان‌ها" : "Command palette"}
        className="palette-pop w-full max-w-lg overflow-hidden border border-line bg-panel shadow-2xl shadow-black/50"
      >
        {/* search row */}
        <div className="flex items-center gap-3 border-b border-line px-4">
          <span className="font-mono text-[0.65rem] text-accent">&gt;</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const pick = results[active];
                if (pick) run(pick);
              }
            }}
            placeholder={
              locale === "fa"
                ? "تایپ کنید — جستجو…"
                : "Type to search — index, posts, skills…"
            }
            aria-label={locale === "fa" ? "جستجو" : "Search"}
            className="w-full bg-transparent py-4 font-mono text-sm text-ink placeholder:text-muted focus:outline-none"
            dir="ltr"
          />
        </div>

        {/* results */}
        <ul
          role="listbox"
          aria-label={locale === "fa" ? "نتایج" : "Results"}
          className="max-h-[46vh] overflow-y-auto py-2"
        >
          {results.length === 0 && (
            <li className="label px-4 py-6">
              {locale === "fa" ? "موردی پیدا نشد." : "No matches."}
            </li>
          )}
          {results.map((e) => {
            const isActive = cursor === active;
            const group = e.group;
            const showGroup =
              cursor === 0 || results[cursor - 1]?.group !== group;
            const idx = cursor++;
            return (
              <li
                key={e.id}
                role="option"
                aria-selected={isActive}
                id={`cmd-${idx}`}
              >
                {showGroup && <p className="label px-4 pb-1 pt-3">{group}</p>}
                {e.href ? (
                  <a
                    href={e.href}
                    {...(e.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    onClick={() => setOpen(false)}
                    className={`flex items-baseline gap-3 px-4 py-2 transition-colors ${
                      isActive ? "bg-accent text-bg" : "text-ink"
                    }`}
                    tabIndex={-1}
                  >
                    <span className="flex-1 truncate text-sm">{e.label}</span>
                    {e.sub && (
                      <span
                        className={
                          "font-mono text-[0.62rem] " +
                          (isActive ? "text-bg/70" : "text-muted")
                        }
                      >
                        {e.sub}
                      </span>
                    )}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => run(e)}
                    className={`flex w-full items-baseline gap-3 px-4 py-2 text-left transition-colors ${
                      isActive ? "bg-accent text-bg" : "text-ink"
                    }`}
                    style={locale === "fa" ? { textAlign: "right" } : undefined}
                  >
                    <span className="flex-1 truncate text-sm">{e.label}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/* footer hint */}
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">
          <span>ctrl+k · /</span>
          <span>↑↓ pick</span>
          <span>↵ run</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}