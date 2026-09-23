import Link from "next/link";
import LatestPostsLive from "./LatestPostsLive";
import Spotlight from "@/components/ui/Spotlight";
import { Rail } from "@/components/ui/Section";
import SysRule from "./SysRule";
import { ArrowIcon, SignalIcon } from "@/components/ui/icons";
import { getDict, loc, type Locale } from "@/lib/i18n";
import type { Post } from "@/lib/blog/types";

/** HOME ACT IV — INCOMING TRANSMISSIONS. Grid of latest writings
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
        <div className="sig-grid relative min-w-0">
          <div className="mb-5 flex justify-end">
            <Link
              href={loc(locale, "/blog")}
              prefetch={false}
              className="group font-mono text-xs text-muted transition-colors hover:text-acid"
            >
              {t.allPosts}
              <ArrowIcon className="ms-1.5 inline align-[-2px] transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>
          <Spotlight className="min-w-0">
            <LatestPostsLive locale={locale} initial={initial} />
          </Spotlight>
        </div>
      </section>

      <SysRule num="05" label={fa ? "نوشته‌ها" : "Writing"} />
    </>
  );
}