"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";

export function SiteSearch() {
  const t = useTranslations("nav");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    setOpen(false);
    router.push(q ? { pathname: "/inventory", query: { q } } : "/inventory");
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("search")}
        title={t("search")}
        aria-haspopup="dialog"
        className="inline-flex size-9 items-center justify-center text-white/70 transition-colors duration-500 hover:text-champagne"
      >
        <Search className="size-[17px]" aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("searchLabel")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[70] bg-obsidian/95 backdrop-blur-xl"
          >
            <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-end px-6 md:px-12">
              <button type="button" onClick={close} aria-label={t("closeSearch")} className="inline-flex size-10 items-center justify-center text-white/70 hover:text-champagne">
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <motion.form
              onSubmit={submit}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-[12vh] max-w-4xl px-6"
            >
              <label htmlFor="site-search" className="eyebrow text-champagne">
                {t("searchLabel")}
              </label>
              <div className="mt-6 flex items-center gap-4 border-b border-silver/30 pb-4 focus-within:border-champagne">
                <input
                  id="site-search"
                  type="search"
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="display min-w-0 flex-1 bg-transparent text-[clamp(1.8rem,5vw,3.6rem)] text-white outline-none placeholder:text-white/25"
                />
                <button type="submit" aria-label={t("searchSubmit")} className="inline-flex size-12 shrink-0 items-center justify-center border border-champagne/60 text-champagne transition-colors hover:bg-champagne hover:text-obsidian">
                  <ArrowRight className="size-5" aria-hidden />
                </button>
              </div>
              <p className="mt-5 text-[11px] tracking-[0.24em] uppercase text-white/40">{t("searchHint")}</p>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
