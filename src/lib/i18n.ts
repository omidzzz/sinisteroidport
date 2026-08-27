export const locales = ["en", "fa"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

const en = {
  nav: [
    { index: "01", label: "Index" },
    { index: "02", label: "Work" },
    { index: "03", label: "Skills" },
    { index: "04", label: "Education" },
    { index: "05", label: "Showcase" },
    { index: "06", label: "Writing" },
  ] as { index: string; label: string }[],
  site: "/ sinisteroid.ir",
  coords: "35.6892°N / 51.3890°E",
  city: "Tehran, Iran",
  heroName: "OMID",
  heroKicker: "(Portfolio) Frontend Developer — career est. 2012",
  heroDesc:
    "Adaptive frontend developer — React, JavaScript, and modern web. A Translation Studies background brings linguistic precision to clean, user-friendly engineering.",
  ctaWork: "Selected work",
  ctaWriting: "Read the writing",
  servicesLabel: "(Services) /04",
  services: [
    {
      title: "Frontend Development",
      description:
        "React.js applications with modern UI/UX — custom components, animation systems, responsive layouts.",
    },
    {
      title: "WordPress Development",
      description:
        "Custom WordPress solutions with Elementor — themes, page building, performance tuning.",
    },
    {
      title: "Content Strategy",
      description:
        "Technical writing and SEO-optimized content — editorial planning, keyword research.",
    },
    {
      title: "Translation",
      description:
        "English ↔ Persian with technical accuracy — marketing, documentation, localization.",
    },
  ],
  latestLabel: "(Latest writing)",
  allPosts: "All posts",
  quote:
    "“Linguistic precision meets engineering — every interface is an argument, and every word earns its place.”",
  quoteLabel: "— The working philosophy",
  contactLabel: "(Contact) — available for remote work worldwide",
  letsTalk: "LET'S TALK",
  rights: "Omid — Tehran, Iran",
  work: {
    kicker: "(02) Career index",
    title: "WORK",
    intro: "A decade-plus of translation, support, and development work.",
  },
  education: {
    kicker: "(04) Academic record",
    title: "EDUCATION",
    intro: "University degrees and continuous online learning.",
  },
  skills: {
    kicker: "(03) Capability matrix",
    title: "SKILLS",
    intro: "Rated on the same five-point scale as everything I ship.",
    skillsCount: "skills",
  },
  showcase: {
    kicker: "(05) Selected projects & clients",
    title: "SHOWCASE",
  },
  blog: {
    kicker: "(06) Notes & essays",
    title: "WRITING",
    intro:
      "Frontend development, design, local AI tooling, and the shifting landscape of search.",
  },
  notFound: {
    kicker: "(Error) — route not resolved",
    intro:
      "The page you're looking for doesn't exist or has been moved.",
    back: "Return to index",
  },
  fallbackNote: "— published in English",
};

export type Dictionary = typeof en;

const fa: Dictionary = {
  nav: [
    { index: "01", label: "شروع" },
    { index: "02", label: "سوابق" },
    { index: "03", label: "مهارت‌ها" },
    { index: "04", label: "تحصیلات" },
    { index: "05", label: "نمونه‌کارها" },
    { index: "06", label: "نوشته‌ها" },
  ],
  site: "/ sinisteroid.ir",
  coords: "۳۵٫۶۸۹۲ شمالی / ۵۱٫۳۸۹۰ شرقی",
  city: "تهران، ایران",
  heroName: "امید",
  heroKicker: "(نمونه‌کار) توسعه‌دهنده فرانت‌اند — از ۲۰۱۲",
  heroDesc:
    "توسعه‌دهنده چابک فرانت‌اند — ری‌اکت، جاوااسکریپت و وب مدرن. پیشینه مطالعات ترجمه دقتی زبانی به مهندسی تمیز و کاربرپسند اضافه می‌کند.",
  ctaWork: "نمونه‌کارهای منتخب",
  ctaWriting: "خواندن نوشته‌ها",
  servicesLabel: "(خدمات) /۰۴",
  services: [
    {
      title: "توسعه فرانت‌اند",
      description:
        "اپلیکیشن‌های React.js با رابط کاربری مدرن — کامپوننت‌های سفارشی، سیستم انیمیشن، چیدمان ریسپانسیو.",
    },
    {
      title: "توسعه وردپرس",
      description:
        "راهکارهای اختصاصی وردپرس با المنتور — قالب، صفحه‌سازی، بهینه‌سازی عملکرد.",
    },
    {
      title: "استراتژی محتوا",
      description:
        "نگارش فنی و محتوای سئوشده — برنامه‌ریزی تحریریه، تحقیق کلمات کلیدی.",
    },
    {
      title: "ترجمه",
      description:
        "ترجمه تخصصی انگلیسی ↔ فارسی — بازاریابی، مستندات، بومی‌سازی.",
    },
  ],
  latestLabel: "(آخرین نوشته‌ها)",
  allPosts: "همه نوشته‌ها",
  quote:
    "«دقت زبانی با مهندسی گره خورده است — هر رابط کاربری یک استدلال است و هر کلمه باید جای خود را داشته باشد.»",
  quoteLabel: "— فلسفه کاری",
  contactLabel: "(تماس) — آماده همکاری دورکاری در سراسر جهان",
  letsTalk: "تماس بگیرید",
  rights: "امید — تهران، ایران",
  work: {
    kicker: "(۰۲) فهرست سوابق",
    title: "سوابق",
    intro: "بیش از یک دهه ترجمه، پشتیبانی و توسعه.",
  },
  education: {
    kicker: "(۰۴) سوابق تحصیلی",
    title: "تحصیلات",
    intro: "مدارک دانشگاهی و یادگیری مداوم آنلاین.",
  },
  skills: {
    kicker: "(۰۳) ماتریس توانمندی",
    title: "مهارت‌ها",
    intro: "بر اساس همان مقیاس پنج‌درجه‌ای که کارهایم را می‌سنجم.",
    skillsCount: "مهارت",
  },
  showcase: {
    kicker: "(۰۵) پروژه‌ها و کارفرمایان منتخب",
    title: "نمونه‌کارها",
  },
  blog: {
    kicker: "(۰۶) یادداشت‌ها و مقالات",
    title: "نوشته‌ها",
    intro: "توسعه فرانت‌اند، طراحی، ابزارهای هوش مصنوعی محلی و آینده جست‌وجو.",
  },
  notFound: {
    kicker: "(خطا) — مسیر پیدا نشد",
    intro: "صفحه‌ای که دنبالش هستید وجود ندارد یا جابه‌جا شده است.",
    back: "بازگشت به صفحه اصلی",
  },
  fallbackNote: "— به انگلیسی منتشر شده",
};

export const dictionaries: Record<Locale, Dictionary> = { en, fa };

export function getDict(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Prefix an internal href with the active locale */
export function loc(locale: Locale, path: string): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
