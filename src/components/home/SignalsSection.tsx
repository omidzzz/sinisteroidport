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
          <div className="sig-heading">
            <Link
              href={loc(locale, "/blog")}
              prefetch={false}
              className="sig-all-posts group"
            >
              <span>{t.allPosts}</span>
              <ArrowIcon className="rtl:-scale-x-100" />
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