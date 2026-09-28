/** English dictionary — the canonical shape for Dictionary. */
const en = {
  nav: [
    { index: "01", label: "Index" },
    { index: "02", label: "Work" },
    { index: "03", label: "Skills" },
    { index: "04", label: "Education" },
    { index: "05", label: "Showcase" },
    { index: "06", label: "Lab" },
    { index: "07", label: "Writing" },
    { index: "08", label: "Contact" },
  ] as { index: string; label: string }[],
  site: "/ sinisteroid.ir",
  city: "Tehran, Iran",
  heroTitle: "SINISTEROID",
  heroKicker: "(Portfolio) Frontend Developer — career est. 2012",
  heroIntro:
    "I'm Omid — a frontend developer in Tehran. I build fast, accessible interfaces and AI-agent experiences, from interface architecture to production performance.",
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
  lab: {
    kicker: "(06) Graphics lab — canvas, SVG & CSS studies",
    title: "GRAPHICS LAB",
    intro:
      "Every prop, canvas and illustration this site ships, archived in one place.",
  },
  blog: {
    kicker: "(07) Notes & essays",
    title: "WRITING",
    intro:
      "Frontend development, design, local AI tooling, and the shifting landscape of search.",
  },
  contact: {
    kicker: "(08) Open channel",
    title: "CONTACT",
    intro:
      "Four direct routes to one inbox — no forms, no bots, no waiting rooms.",
    /* PageHero's two readouts */
    channels: "channels",
    response: "response",
    /* The uplink — the email is the primary route, not a fourth tile */
    uplinkTag: "(Primary uplink)",
    uplinkLabel: "Direct line — one inbox, read by a human",
    write: "Write to Omid",
    copy: "Copy address",
    copied: "Copied ✓",
    /* The ledger — the other three routes, one ruled row each */
    ledgerLabel: "(Other channels)",
    /* The terms strip — the facts you would otherwise have to ask for */
    termsLabel: "(Terms of engagement)",
    /* The closing console */
    status: "Open for remote work worldwide — Tehran, Iran (UTC+3:30)",
    ask: "Ask SINISTER to draft your first message",
    askPrompt:
      "Draft my first message to Omid — short, sharp, human. I need frontend help.",
    /* Per-channel voice. The destinations themselves live in lib/site.ts —
       this is only what each channel is CALLED and what it is FOR. */
    voice: {
      email: {
        name: "Email",
        note: "Fastest route — usually a reply within 24 h.",
      },
      github: {
        name: "GitHub",
        note: "Code, experiments and open-source work.",
      },
      telegram: {
        name: "Telegram",
        note: "Direct messages — usually same day.",
      },
      tel: {
        name: "Telephone",
        note: "Calls & voice — Tehran, UTC+3:30.",
      },
    },
    facts: [
      { k: "Response", v: "Usually within 24 hours" },
      { k: "Languages", v: "English · Persian" },
      { k: "Zone", v: "UTC+3:30 · Tehran" },
      { k: "Engagements", v: "Remote · contract · full-time" },
    ],
  },
  console: {
    label: "Primary navigation",
    rail: "Section shortcuts",
    openMenu: "Menu",
    hint: "Type to filter · Ctrl+K",
    placeholder: "search routes & posts…",
    askPrompt: "What should I ask the agent?",
    copied: "copied",
    empty: "No match — try /work, /lab, ask",
    verbs: {
      ask: "Ask the agent",
      mail: "Copy the email address",
      lang: "Switch language",
      rss: "Open the RSS feed",
      donate: "Support the work",
      sudo: "Nice try",
    },
  },
  notFound: {
    kicker: "(Error) — route not resolved",
    intro:
      "The page you're looking for doesn't exist or has been moved.",
    back: "Return to index",
  },
  fallbackNote: "— published in English",
  donate: "Donate",
  follow: "New posts · no inbox noise",
  rss: "RSS",
  jsonFeed: "JSON feed",
};

export type Dictionary = typeof en;
export default en;