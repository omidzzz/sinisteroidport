import type { FaqItem } from "@/lib/blog/types";

/** Home-page FAQ — machine-readable (FAQPage JSON-LD). GEO/SEO payload
 * rendered only on the index route. Kept out of the page component so the
 * page stays a pure composition of section components. */
export function homeFaq(fa: boolean): FaqItem[] {
  return fa
    ? [
        {
          question: "امید کیست و چه می‌سازد؟",
          answer:
            "امید توسعه‌دهنده فرانت‌اندی است که از سال ۲۰۱۲ در ری‌اکت، جاوااسکریپت، وردپرس و استراتژی محتوا کار می‌کند و از سابقه ترجمه برای تولید وب‌سایت‌های دقیق و کاربرپسند بهره می‌برد.",
        },
        {
          question: "چه خدماتی ارائه می‌شود؟",
          answer:
            "توسعه فرانت‌اند (ری‌اکت/جاوااسکریپت)، توسعه وردپرس، استراتژی محتوا و ترجمه تخصصی انگلیسی–فارسی.",
        },
        {
          question: "آیا همکاری دورکار ممکن است؟",
          answer:
            "بله، امید برای همکاری دورکاری در سراسر جهان در دسترس است.",
        },
      ]
    : [
        {
          question: "Who is Omid and what does Omid build?",
          answer:
            "Omid is an adaptive frontend developer working since 2012 in React, JavaScript, WordPress and content strategy, applying a translation-studies background to build precise, user-friendly websites.",
        },
        {
          question: "What services does Omid offer?",
          answer:
            "Frontend development (React/JavaScript), WordPress development, content strategy, and professional English–Persian translation.",
        },
        {
          question: "Is remote collaboration available?",
          answer:
            "Yes — Omid is available for remote work worldwide.",
        },
      ];
}