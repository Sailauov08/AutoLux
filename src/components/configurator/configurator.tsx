"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Check, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { CONFIG_GROUPS, DEFAULT_SELECTION, GROUP_KEYS, optionsTotal, parseSelection, type ConfigGroup, type Selection } from "@/lib/configurator";
import { formatPrice } from "@/lib/format";

export type ConfigCar = { id: string; brand: string; model: string; year: number; price: number; images: string[]; photoNote: "photoRepresentative" | "photoPending" | null };

const STORAGE_KEY = "autolux-configurations";
const CHANGE_EVENT = "autolux-configurations";

const LABEL_KEYS: Record<ConfigGroup, string> = { exterior: "colors", wheels: "wheelOptions", interior: "interiorOptions", trim: "trimOptions" };

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
};

const readStore = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const parseStore = (raw: string | null): Record<string, unknown> => {
  try {
    const value = raw ? JSON.parse(raw) : {};
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
};

export function Configurator({ cars, initialCar }: { cars: ConfigCar[]; initialCar: string }) {
  const t = useTranslations("configurator");
  const tCard = useTranslations("card");
  const [carId, setCarId] = useState(initialCar);
  const [view, setView] = useState(0);
  const [draft, setDraft] = useState<Selection | null>(null);
  const store = parseStore(useSyncExternalStore(subscribe, readStore, () => null));

  const car = cars.find((item) => item.id === carId) ?? cars[0];
  const saved = store[car.id] ? parseSelection(store[car.id]) : null;
  const selection = draft ?? saved ?? DEFAULT_SELECTION;
  const extras = optionsTotal(selection);
  const isSaved = saved !== null && GROUP_KEYS.every((group) => saved[group] === selection[group]);

  const changeCar = (id: string) => {
    setCarId(id);
    setView(0);
    setDraft(null);
    window.history.replaceState(null, "", `?car=${encodeURIComponent(id)}`);
  };

  const choose = (group: ConfigGroup, id: string) => setDraft({ ...selection, [group]: id });

  const save = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...store, [car.id]: selection }));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      return;
    }
  };

  const optionLabel = (group: ConfigGroup, id: string) => t(`${LABEL_KEYS[group]}.${id}`);
  const delta = (price: number) => (price === 0 ? t("included") : `+ ${formatPrice(price)}`);

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-6 pb-28 md:px-12 lg:grid-cols-12 lg:gap-16">
      <div className="min-w-0 lg:col-span-8">
        <div className="relative overflow-hidden border border-line bg-[radial-gradient(ellipse_at_50%_120%,rgb(40_58_75/0.6),transparent_65%)] bg-obsidian">
          <div className="relative aspect-[4/3] md:aspect-[16/9]">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={`${car.id}-${view}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0"
              >
                <Image src={car.images[view]} alt={`${car.year} ${car.brand} ${car.model}, ${t("view", { n: view + 1 })}`} fill priority sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-obsidian/30" />
            <div aria-hidden className="absolute inset-x-[12%] bottom-[6%] h-10 rounded-[50%] bg-champagne/15 blur-2xl" />
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              <span className="bg-obsidian/70 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase text-white/85 backdrop-blur">{t("view", { n: view + 1 })}</span>
              {car.photoNote && <span className="bg-obsidian/70 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase text-champagne backdrop-blur">{tCard(car.photoNote)}</span>}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 text-white md:p-8">
              <div>
                <p className="text-[11px] tracking-[0.24em] uppercase text-silver/80">
                  {car.brand} · {car.year}
                </p>
                <p className="display mt-2 text-[clamp(1.8rem,4vw,3.4rem)]">{car.model}</p>
              </div>
              <div className="flex items-center gap-2" aria-hidden>
                {GROUP_KEYS.map((group) => (
                  <span key={group} className="size-5 rounded-full border border-white/40" style={{ background: CONFIG_GROUPS[group].find((option) => option.id === selection[group])?.swatch }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {car.images.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={t("view", { n: index + 1 })}
              aria-pressed={index === view}
              onClick={() => setView(index)}
              className={`relative aspect-[16/10] overflow-hidden border bg-mist transition-colors ${index === view ? "border-champagne" : "border-transparent opacity-55 hover:opacity-100"}`}
            >
              <Image src={src} alt="" fill sizes="20vw" className="object-cover" />
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs leading-[1.7] text-muted">{t("noSpin")}</p>
        <p className="mt-1 text-xs leading-[1.7] text-muted">{t("photoNote")}</p>

        <div className="mt-14 space-y-12">
          {GROUP_KEYS.map((group) => (
            <fieldset key={group}>
              <legend className="flex w-full items-baseline justify-between gap-4 border-b border-line pb-4">
                <span className="eyebrow">{t(group)}</span>
              </legend>
              <div className={`mt-6 grid gap-3 ${group === "exterior" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
                {CONFIG_GROUPS[group].map((option) => {
                  const checked = selection[group] === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-4 border p-4 transition-colors duration-500 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-champagne ${
                        checked ? "border-champagne bg-card" : "border-line hover:border-accent/60"
                      }`}
                    >
                      <input type="radio" name={group} value={option.id} checked={checked} onChange={() => choose(group, option.id)} className="sr-only" />
                      <span aria-hidden className={`relative size-9 shrink-0 rounded-full border ${checked ? "border-champagne" : "border-line"} p-1`}>
                        <span className="block size-full rounded-full shadow-[inset_0_1px_2px_rgb(255_255_255/0.3)]" style={{ background: option.swatch }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug">{optionLabel(group, option.id)}</span>
                        <span className="mt-1 block text-[11px] text-muted tabular-nums">{delta(option.price)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <aside className="lg:col-span-4">
        <div className="border border-line bg-card p-6 md:p-8 lg:sticky lg:top-28">
          <label className="block">
            <span className="eyebrow">{t("vehicle")}</span>
            <select
              value={car.id}
              onChange={(event) => changeCar(event.target.value)}
              className="mt-4 w-full cursor-pointer border border-line bg-page px-4 py-3 text-sm text-ink outline-none focus:border-champagne"
            >
              {cars.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.year} {item.brand} {item.model}
                </option>
              ))}
            </select>
          </label>

          <p className="eyebrow mt-10">{t("summary")}</p>
          <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">{t("basePrice")}</dt>
              <dd className="tabular-nums">{formatPrice(car.price)}</dd>
            </div>
            {GROUP_KEYS.map((group) => {
              const option = CONFIG_GROUPS[group].find((item) => item.id === selection[group]) ?? CONFIG_GROUPS[group][0];
              return (
                <div key={group} className="flex justify-between gap-4 py-3">
                  <dt className="min-w-0 text-muted">{optionLabel(group, option.id)}</dt>
                  <dd className="shrink-0 tabular-nums">{delta(option.price)}</dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-8 text-[11px] tracking-[0.24em] uppercase text-muted">{t("total")}</p>
          <p className="display mt-2 text-[clamp(2rem,3vw,2.8rem)] text-accent tabular-nums" aria-live="polite">
            {formatPrice(car.price + extras)}
          </p>
          <p className="mt-4 text-xs leading-[1.7] text-muted">{t("illustrative")}</p>

          <div className="mt-8 flex flex-col gap-3">
            <Button variant="white" onClick={save} className="w-full">
              {isSaved && <Check className="size-4" aria-hidden />}
              {isSaved ? t("saved") : t("save")}
            </Button>
            <ButtonLink href={`/test-drive?car=${car.id}`} variant="champagne" className="w-full">
              {t("request")}
            </ButtonLink>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <button type="button" onClick={() => setDraft(DEFAULT_SELECTION)} className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-muted hover:text-ink">
                <RotateCcw className="size-3.5" aria-hidden />
                {t("reset")}
              </button>
              <ButtonLink href={`/inventory/${car.id}`} variant="outline" className="h-10 px-4 text-[10px]">
                {t("details")}
              </ButtonLink>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
