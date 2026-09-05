import Link from "next/link";
import LatestPostsLive from "./LatestPostsLive";
import RainStrip from "./RainStrip";
import { Rail, Seam } from "@/components/ui/Section";
import { ArrowIcon, SignalIcon } from "@/components/ui/icons";
import { getDict, loc, type Locale } from "@/lib/i18n";
import type { Post } from "@/lib/blog/types";

/** HOME ACT IV — INCOMING TRANSMISSIONS. Rain strip + latest writings
 * (prerendered, then refreshable from MySQL via /api/get_posts.php). */
export default function SignalsSection({
  locale,
  initial,
}: {
  locale: Locale;
  initial: Post[];
}) {
  const t = getDict(locale);
  const fa = locale === "fa";
  const sig = fa ? "فرکانس ورودی · نوشته‌ها" : "Incoming frequency · writing";

  return (
    <>
      <section className="shell-grid relative mx-auto mt-6 max-w-[86rem] px-5 sm:px-8">
        <Rail label={sig} icon={<SignalIcon />} />
        <div className="sig-zone relative min-w-0">
          <div className="rain-bay">
            <RainStrip />
          </div>
          <span aria-hidden dir="ltr" className="scrub-word bottom-0">
            SIGNALS
          </span>
          <div className="mb-6 flex justify-end">
            <Link
              href={loc(locale, "/blog")}
              className="group brk font-mono text-xs text-muted transition-colors hover:text-acid"
            >
              {t.allPosts}
              <ArrowIcon className="ms-2 inline align-[-2px] transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>
          <LatestPostsLive locale={locale} initial={initial} />
        </div>
      </section>

      <Seam />
    </>
  );
}