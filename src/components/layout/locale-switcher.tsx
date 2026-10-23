"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/routing";

const LABELS: Record<Locale, string> = { kk: "KK", ru: "RU", en: "EN" };

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");

  return (
    <div role="group" aria-label={t("language")} className={`items-center gap-1 ${className}`}>
      {LOCALES.map((item, index) => (
        <span key={item} className="flex items-center">
          {index > 0 && <span aria-hidden className="mx-0.5 h-3 w-px bg-silver/25" />}
          <button
            type="button"
            lang={item}
            aria-pressed={item === locale}
            onClick={() => router.replace(pathname, { locale: item })}
            className={`px-1.5 py-1 text-[11px] font-semibold tracking-[0.2em] transition-colors duration-500 ${
              item === locale ? "text-champagne" : "text-white/50 hover:text-white"
            }`}
          >
            {LABELS[item]}
          </button>
        </span>
      ))}
    </div>
  );
}
