"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";

const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2200&q=75`;

const SLIDES = [
  { key: "s1", src: unsplash("photo-1688624381743-8cb5bfb4cc47"), position: "object-[60%_center]" },
  { key: "s2", src: unsplash("photo-1711546858062-c43fae2a07d3"), position: "object-center" },
  { key: "s3", src: unsplash("photo-1758743460496-54bb89dbee8a"), position: "object-center" },
] as const;

const INTERVAL = 7000;

export function Hero() {
  const t = useTranslations("home.hero");
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const playing = !paused && !reduced;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % SLIDES.length), INTERVAL);
    return () => window.clearTimeout(timer);
  }, [active, playing]);

  const slide = SLIDES[active];

  return (
    <section aria-roledescription="carousel" aria-label={t("tagline")} className="relative flex h-svh min-h-[640px] items-end overflow-hidden bg-obsidian text-white">
      <AnimatePresence initial={false}>
        <motion.div
          key={slide.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <motion.div initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 12, ease: "easeOut" }} className="absolute inset-0">
            <Image src={slide.src} alt={t(`slides.${slide.key}.alt`)} fill priority={active === 0} sizes="100vw" className={`object-cover ${slide.position}`} />
          </motion.div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-obsidian/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-obsidian/90 via-obsidian/40 to-transparent" />
      <div aria-hidden className="absolute inset-y-0 left-6 w-px bg-gradient-to-b from-transparent via-silver/15 to-transparent md:left-12" />

      <div className="relative mx-auto w-full max-w-[1600px] px-6 pt-28 pb-24 md:px-12 md:pb-28">
        <p className="eyebrow animate-fade text-champagne">{t("eyebrow")}</p>
        <h1 className="display mt-6 md:max-w-[15ch] text-[clamp(1.65rem,min(5.6vw,9svh),6.25rem)] leading-[0.98] tracking-[0.01em] uppercase">
          <span className="block overflow-hidden pb-2">
            <span className="text-metal block animate-rise">{t("title")}</span>
          </span>
        </h1>
        <div className="mt-6 flex items-center gap-5 animate-fade">
          <span aria-hidden className="hairline h-px w-16" />
          <p className="font-display text-lg text-silver italic md:text-2xl">{t("tagline")}</p>
        </div>
        <p className="mt-6 max-w-md animate-fade text-sm leading-[1.8] text-silver/80 md:text-base">{t("subtitle")}</p>
        <div className="mt-8 flex flex-wrap gap-4 animate-fade">
          <ButtonLink href="/inventory" variant="champagne" arrow>
            {t("explore")}
          </ButtonLink>
          <span className="hidden sm:block">
            <ButtonLink href="/test-drive" variant="outline-white">
              {t("bookTest")}
            </ButtonLink>
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-silver/10">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-6 md:px-12">
          <div className="flex items-center">
            {SLIDES.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActive(index)}
                aria-label={t("slide", { n: index + 1 })}
                aria-current={index === active ? "true" : undefined}
                className="group relative flex items-baseline gap-3 py-5 pr-6 text-left md:pr-10"
              >
                <span className={`text-[11px] tabular-nums tracking-[0.2em] transition-colors ${index === active ? "text-champagne" : "text-white/40 group-hover:text-white"}`}>0{index + 1}</span>
                <span className={`hidden text-[10px] tracking-[0.24em] uppercase transition-colors lg:inline ${index === active ? "text-white" : "text-white/35 group-hover:text-white/70"}`}>
                  {t(`slides.${item.key}.label`)}
                </span>
                <span aria-hidden className="absolute top-0 left-0 h-px w-[calc(100%-1.5rem)] bg-silver/15 md:w-[calc(100%-2.5rem)]">
                  {index === active && (
                    <motion.span
                      key={`${active}-${playing}`}
                      className="block h-full origin-left bg-champagne"
                      initial={{ scaleX: playing ? 0 : 1 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: playing ? INTERVAL / 1000 : 0, ease: "linear" }}
                    />
                  )}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? t("play") : t("pause")}
              title={paused ? t("play") : t("pause")}
              className="inline-flex size-9 items-center justify-center text-white/50 transition-colors hover:text-champagne"
            >
              {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
            </button>
          </div>
          <div aria-hidden className="hidden items-center gap-4 md:flex">
            <span className="text-[10px] tracking-[0.32em] uppercase text-white/45">{t("scroll")}</span>
            <span className="block h-px w-12 bg-gradient-to-r from-champagne to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
