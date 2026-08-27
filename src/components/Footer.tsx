import { getDict, type Locale } from "@/lib/i18n";
import Magnetic from "./Magnetic";
import LogoType from "./LogoType";
import ZinePanel from "./ZinePanel";

export default function Footer({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  return (
    <footer className="relative z-10 mt-20 border-t border-line sm:mt-28">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Inverted "edition" colophon — brand masthead + call to action */}
        <ZinePanel
          className="px-5 py-12 sm:px-10"
          kicker={t.contactLabel}
        >
          <div className="flex flex-col items-center gap-10 text-center">
            <LogoType
              variant="full"
              activate
              className="footer-masthead text-[clamp(2rem,9vw,6rem)] leading-none"
            />
            <p className="max-w-md text-sm leading-relaxed text-muted">
              {locale === "fa"
                ? "هم‌توانی ترجمه و برنامه‌نویسی را در یک ویژگی ترکیب می‌کنم — هر رابط، استدلال است و هر کلمه جای خود را دارد."
                : "Translation precision meets engineering — every interface is an argument, and every word earns its place. Click the mark above seven times to open the console."}
            </p>
            <Magnetic strength={0.15} maxShift={8}>
              <a
                href="mailto:ghadamgahi.omid@gmail.com"
                className="group font-display inline-block break-words text-[clamp(1.75rem,9vw,5.5rem)] font-bold leading-none tracking-tight sm:text-[clamp(2rem,7vw,5.5rem)]"
              >
                <span className="fill-hover">{t.letsTalk}</span>
              </a>
            </Magnetic>
          </div>
        </ZinePanel>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 font-mono text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {t.rights}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 uppercase tracking-widest">
            <a href="mailto:ghadamgahi.omid@gmail.com" className="transition-colors hover:text-accent">
              Email
            </a>
            <a
              href="https://t.me/simplyeffedup"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-accent"
            >
              Telegram
            </a>
            <a
              href="https://github.com/omidzzz"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-accent"
            >
              GitHub
            </a>
            <span>+98 936 747 1992</span>
          </div>
        </div>
      </div>
    </footer>
  );
}


