"use client";

import { GitCompareArrows, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { syncFavorite } from "@/lib/actions/account";
import { MAX_COMPARE, toggleCompare, toggleFavorite, useGarage } from "@/lib/garage";

const chip =
  "inline-flex h-9 items-center gap-2 text-[11px] tracking-[0.18em] uppercase transition-colors duration-500 disabled:cursor-not-allowed disabled:opacity-35";

export function FavoriteButton({ id, showLabel = false }: { id: string; showLabel?: boolean }) {
  const t = useTranslations("card");
  const { favorites } = useGarage();
  const active = favorites.includes(id);

  return (
    <button
      type="button"
      onClick={() => {
        toggleFavorite(id);
        void syncFavorite(id, !active);
      }}
      aria-pressed={active}
      aria-label={active ? t("remove") : t("save")}
      className={`${chip} ${active ? "text-accent" : "text-muted hover:text-ink"}`}
    >
      <Heart className={`size-4 transition-transform duration-500 active:scale-75 ${active ? "fill-current" : ""}`} aria-hidden />
      {showLabel && (active ? t("saved") : t("save"))}
    </button>
  );
}

export function CompareButton({ id, showLabel = false }: { id: string; showLabel?: boolean }) {
  const t = useTranslations("card");
  const { compare } = useGarage();
  const active = compare.includes(id);
  const full = !active && compare.length >= MAX_COMPARE;

  return (
    <button
      type="button"
      onClick={() => toggleCompare(id)}
      disabled={full}
      aria-pressed={active}
      aria-label={active ? t("unadd") : t("add")}
      title={full ? t("limit", { max: MAX_COMPARE }) : undefined}
      className={`${chip} ${active ? "text-accent" : "text-muted hover:text-ink"}`}
    >
      <GitCompareArrows className="size-4" aria-hidden />
      {showLabel && (active ? t("comparing") : t("compare"))}
    </button>
  );
}
