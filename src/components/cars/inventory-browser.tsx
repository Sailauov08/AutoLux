"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Car } from "@/lib/cars";
import { EMPTY_FILTERS, filterCars, type Filters, SORT_OPTIONS, sortCars, type SortKey } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { CarCard } from "./car-card";
import { FiltersPanel } from "./filters-panel";

const PAGE_SIZE = 6;
const TABS = [
  { key: "all", bodyType: "", fuel: "" },
  { key: "Sedan", bodyType: "Sedan", fuel: "" },
  { key: "SUV", bodyType: "SUV", fuel: "" },
  { key: "Coupe", bodyType: "Coupe", fuel: "" },
  { key: "electric", bodyType: "", fuel: "Electric" },
] as const;
const SORT_KEYS: Record<SortKey, string> = {
  featured: "featured",
  "price-asc": "priceAsc",
  "price-desc": "priceDesc",
  "year-desc": "yearDesc",
  "mileage-asc": "mileageAsc",
};

export function InventoryBrowser({ cars, initial = {} }: { cars: Car[]; initial?: Partial<Filters> }) {
  const t = useTranslations("inventory");
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, ...initial });
  const [sort, setSort] = useState<SortKey>("featured");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const results = useMemo(() => sortCars(filterCars(cars, filters), sort), [cars, filters, sort]);
  const shown = results.slice(0, visible);
  const activeCount = Object.values(filters).filter((value) => value !== "").length;

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => (key === "brand" ? { ...current, brand: value, model: "" } : { ...current, [key]: value }));
    setVisible(PAGE_SIZE);
  };

  const selectTab = (tab: (typeof TABS)[number]) => {
    setFilters((current) => ({ ...current, bodyType: tab.bodyType, fuel: tab.fuel }));
    setVisible(PAGE_SIZE);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setVisible(PAGE_SIZE);
  };

  return (
    <section className="mx-auto grid grid-cols-1 max-w-[1600px] gap-14 px-6 py-20 md:px-12 md:py-28 lg:grid-cols-[250px_1fr] lg:gap-20">
      <aside className="hidden lg:block">
        <div className="sticky top-28">
          <p className="mb-8 text-[11px] tracking-[0.28em] uppercase text-muted">{t("filters")}</p>
          <FiltersPanel cars={cars} filters={filters} onChange={updateFilter} onReset={resetFilters} />
        </div>
      </aside>

      <div className="min-w-0">
        <div role="group" aria-label={t("tabsLabel")} className="-mx-6 mb-10 flex gap-2 overflow-x-auto px-6 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {TABS.map((tab) => {
            const active = filters.bodyType === tab.bodyType && filters.fuel === tab.fuel;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={active}
                onClick={() => selectTab(tab)}
                className={`h-10 shrink-0 border px-5 text-[11px] font-medium tracking-[0.2em] uppercase transition-colors duration-500 ${
                  active ? "border-champagne bg-champagne text-obsidian" : "border-line text-muted hover:border-accent hover:text-ink"
                }`}
              >
                {t(`tabs.${tab.key}`)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-6 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
          <label className="relative flex-1">
            <span className="sr-only">{t("search")}</span>
            <Search className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full border-0 bg-transparent py-3 pl-8 text-xl text-ink outline-none placeholder:text-muted/50 md:text-2xl"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6">
            <Button variant="outline" onClick={() => setDrawerOpen(true)} className="h-11 px-5 lg:hidden">
              <SlidersHorizontal className="size-4" aria-hidden />
              {activeCount > 0 ? t("filtersCount", { count: activeCount }) : t("filters")}
            </Button>
            <label className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase text-muted">
              <span className="hidden md:inline">{t("sortBy")}</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="cursor-pointer appearance-none bg-transparent pr-2 text-[11px] tracking-[0.18em] text-ink outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`sort.${SORT_KEYS[option]}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <p className="mt-6 text-[11px] tracking-[0.22em] uppercase text-muted" aria-live="polite">
          {t("showing", { shown: shown.length, total: results.length })}
        </p>

        {results.length === 0 ? (
          <div className="mt-12 flex flex-col items-center border border-dashed border-line px-8 py-24 text-center">
            <SearchX className="size-8 text-muted" aria-hidden />
            <h2 className="mt-8 text-3xl font-display font-normal tracking-normal">{t("emptyTitle")}</h2>
            <p className="mt-4 max-w-md leading-[1.75] text-muted">{t("emptyText")}</p>
            <Button variant="solid" onClick={resetFilters} className="mt-10">
              {t("clearFilters")}
            </Button>
          </div>
        ) : (
          <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((car, index) => (
              <li key={car.id}>
                <CarCard car={car} priority={index < 2} />
              </li>
            ))}
          </ul>
        )}

        {visible < results.length && (
          <div className="mt-20 flex justify-center">
            <button
              type="button"
              onClick={() => setVisible((count) => count + PAGE_SIZE)}
              className="group flex flex-col items-center gap-4 text-[11px] tracking-[0.24em] uppercase text-ink"
            >
              {t("showMore")}
              <span className="block h-12 w-px origin-top bg-ink transition-transform duration-700 group-hover:scale-y-75" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div className="fixed inset-0 z-[60] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label={t("closeFilters")} onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-obsidian/70 backdrop-blur-sm" />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("filterDialog")}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col bg-page"
            >
              <div className="flex items-center justify-between border-b border-line px-6 py-5">
                <p className="text-[11px] tracking-[0.28em] uppercase">{t("filters")}</p>
                <button type="button" onClick={() => setDrawerOpen(false)} aria-label={t("close")} className="inline-flex size-10 items-center justify-center">
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-8">
                <FiltersPanel cars={cars} filters={filters} onChange={updateFilter} onReset={resetFilters} />
              </div>
              <div className="border-t border-line p-6">
                <Button variant="solid" onClick={() => setDrawerOpen(false)} className="w-full">
                  {t("showResults", { count: results.length })}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
