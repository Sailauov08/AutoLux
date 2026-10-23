"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "autolux-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const t = useTranslations("nav");

  const toggle = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      return;
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("theme")}
      title={t("theme")}
      className={`inline-flex size-9 items-center justify-center text-white/70 transition-colors duration-500 hover:text-champagne ${className}`}
    >
      <Sun className="size-[17px] dark:hidden" aria-hidden />
      <Moon className="hidden size-[17px] dark:block" aria-hidden />
    </button>
  );
}
