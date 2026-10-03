/**
 * scripts/lib/brand.mjs — the Node half of the brand contract.
 *
 * src/lib/brand.json is the single source of identity for BOTH halves of the
 * build: the TypeScript app imports it (src/lib/brand.ts) and every generator
 * — RSS/JSON feeds, sitemap, llms.txt, OG cards, manifest, IndexNow, the
 * guards — imports it through this module. Plain JSON was chosen precisely so
 * no transpile step is needed on this side.
 *
 * Everything here is DERIVED from those values; nothing re-declares a fact.
 * The display helpers mirror lib/contact.ts one-for-one (scheme stripped,
 * trailing slash gone, t.me → @name) so a link and the handle printed beside
 * it can never disagree, in either language of the build.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root — resolved from this file, so callers need no path juggling. */
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

/** The identity facts. Read once per process; every surface below is a
 *  function of these, so one edit re-brands the whole build. */
export const BRAND = JSON.parse(
  fs.readFileSync(path.join(root, "src", "lib", "brand.json"), "utf8")
);

/** Canonical origin, e.g. https://sinisteroid.ir */
export const SITE = BRAND.domain;

/** "github.com/omidzzz" — scheme and trailing slash stripped. */
export const githubHandle = () =>
  BRAND.contact.github.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** "@simplyeffedup" — the t.me handle in the form a visitor reads. */
export const telegramHandle = (url = BRAND.contact.telegram) =>
  String(url ?? "")
    .replace(/^https?:\/\/(www\.)?t(elegram)?\.me\//, "@")
    .replace(/\/$/, "");

/** "donatr.ee/sinisteroid" — the donate link as it reads in copy. */
export const donateLabel = () =>
  BRAND.contact.donate.replace(/^https?:\/\//, "").replace(/\/$/, "");