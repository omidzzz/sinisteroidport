/** English dictionary — the canonical shape for Dictionary. */
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
  donate: "Donate",
};

export type Dictionary = typeof en;
export default en;