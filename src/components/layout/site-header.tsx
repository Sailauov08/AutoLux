"use client";

import { AnimatePresence, motion } from "motion/react";
import { Menu, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_LINKS } from "@/lib/site";
import { LocaleSwitcher } from "./locale-switcher";
import { SiteSearch } from "./site-search";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const transparent = pathname === "/" && !scrolled && !menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-700 ${
          transparent ? "border-b border-silver/10 bg-gradient-to-b from-obsidian/70 to-transparent" : "border-b border-silver/10 bg-obsidian/90 backdrop-blur-xl"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 md:px-12">
          <Link href="/" className="group flex items-baseline gap-2 text-white" onClick={() => setMenuOpen(false)}>
            <span className="font-display text-[1.6rem] leading-none tracking-[0.02em]">
              Auto<span className="italic text-champagne transition-colors duration-500 group-hover:text-white">Lux</span>
            </span>
          </Link>

          <nav aria-label={t("primary")} className="hidden items-center gap-7 border-x border-silver/15 px-8 xl:flex 2xl:gap-10 2xl:px-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`group relative py-2 text-[11px] font-medium tracking-[0.2em] uppercase transition-colors duration-500 ${
                  isActive(link.href) ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {t(link.key)}
                <span
                  className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-champagne transition-transform duration-700 ease-out ${
                    isActive(link.href) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <SiteSearch />
            <Link href="/account" aria-label={t("account")} title={t("account")} className="inline-flex size-9 items-center justify-center text-white/70 transition-colors duration-500 hover:text-champagne">
              <UserRound className="size-[17px]" aria-hidden />
            </Link>
            <ThemeToggle />
            <span aria-hidden className="hidden h-5 w-px bg-silver/20 md:block" />
            <LocaleSwitcher className="hidden md:flex" />
            <span className="hidden 2xl:block">
              <ButtonLink href="/contact" variant="champagne" className="ml-3 h-10 px-5 text-[10px]">
                {t("consultation")}
              </ButtonLink>
            </span>
            <button
              type="button"
              aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex size-10 items-center justify-center text-white xl:hidden"
            >
              {menuOpen ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            aria-label={t("mobile")}
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[45] flex flex-col overflow-y-auto bg-obsidian px-6 pt-28 pb-10 xl:hidden"
          >
            <nav aria-label={t("mobile")} className="flex flex-col">
              {NAV_LINKS.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="border-t border-silver/10 last:border-b"
                >
                  <Link href={link.href} onClick={() => setMenuOpen(false)} className="group flex items-baseline justify-between py-6">
                    <span className="display text-[clamp(2rem,8vw,3.2rem)] text-white transition-colors group-hover:text-champagne">{t(link.key)}</span>
                    <span className="text-xs tabular-nums text-champagne/60">0{index + 1}</span>
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="mt-auto space-y-6 pt-12">
              <div className="flex items-center justify-between">
                <LocaleSwitcher className="flex" />
                <ThemeToggle />
              </div>
              <ButtonLink href="/test-drive" variant="white" onClick={() => setMenuOpen(false)} className="w-full" arrow>
                {t("bookPrivate")}
              </ButtonLink>
              <ButtonLink href="/contact" variant="champagne" onClick={() => setMenuOpen(false)} className="w-full">
                {t("consultation")}
              </ButtonLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
