"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { clearCompare, MAX_COMPARE, useGarage } from "@/lib/garage";

export function CompareBar() {
  const t = useTranslations("compare.bar");
  const { compare } = useGarage();
  const pathname = usePathname();
  const visible = compare.length > 0 && pathname !== "/compare";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-4 bottom-5 z-40 mx-auto flex max-w-lg items-center justify-between gap-4 border border-white/10 bg-obsidian/95 py-3 pr-3 pl-6 text-white shadow-2xl shadow-black/40 backdrop-blur-xl"
        >
          <p className="text-[11px] tracking-[0.22em] uppercase">
            {t("compare")} <span className="text-champagne">{compare.length}</span>
            <span className="text-white/40"> {t("of", { max: MAX_COMPARE })}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearCompare}
              aria-label={t("clear")}
              className="inline-flex size-9 items-center justify-center text-white/50 transition-colors hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
            <Link
              href="/compare"
              className="inline-flex h-10 items-center bg-ivory px-5 text-[11px] font-medium tracking-[0.2em] uppercase text-obsidian transition-colors hover:bg-white"
            >
              {t("view")}
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
