"use client";

import { useTranslations } from "next-intl";
import type { CarBadge as Badge } from "@/lib/cars";

const tones: Record<Badge, string> = {
  Certified: "bg-ivory text-obsidian",
  "Low Mileage": "bg-obsidian/70 text-white backdrop-blur-md",
  "New Arrival": "bg-champagne text-obsidian",
  Rare: "bg-obsidian text-champagne ring-1 ring-inset ring-champagne/60",
};

export function BadgeTag({ badge }: { badge: Badge }) {
  const t = useTranslations("badges");

  return (
    <span className={`inline-flex items-center px-2.5 py-1.5 text-[9px] font-semibold tracking-[0.2em] uppercase ${tones[badge]}`}>
      {t(badge)}
    </span>
  );
}
