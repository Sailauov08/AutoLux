"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { type Car, coverImage, photoNoteKey } from "@/lib/cars";
import { formatMileage, formatPrice } from "@/lib/format";
import { BadgeTag } from "./car-badge";
import { CompareButton, FavoriteButton } from "./garage-actions";

export function CarCard({ car, priority = false }: { car: Car; priority?: boolean }) {
  const t = useTranslations("card");
  const tUnits = useTranslations("units");
  const tEnum = useTranslations("enums");
  const tStatus = useTranslations("statuses.vehicle");
  const href = `/inventory/${car.id}`;
  const photoNote = photoNoteKey(car);

  return (
    <article className="group flex h-full flex-col border border-line bg-card transition-[border-color,box-shadow] duration-700 hover:border-champagne/45 hover:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)]">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-mist">
        <Image
          src={coverImage(car)}
          alt={`${car.year} ${car.brand} ${car.model}`}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/50 via-transparent to-transparent opacity-60 transition-opacity duration-700 group-hover:opacity-100" />
        {car.badges.length > 0 && (
          <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
            {car.badges.map((badge) => (
              <BadgeTag key={badge} badge={badge} />
            ))}
          </div>
        )}
        {car.status && car.status !== "available" && (
          <span className="absolute top-4 right-4 bg-obsidian px-2.5 py-1.5 text-[9px] font-semibold tracking-[0.2em] uppercase text-champagne">
            {tStatus(car.status)}
          </span>
        )}
        {photoNote && <p className="absolute bottom-3 left-4 max-w-[70%] text-[10px] tracking-[0.2em] uppercase text-white/75">{t(photoNote)}</p>}
        <span className="metal absolute right-4 bottom-4 flex size-11 translate-y-3 items-center justify-center text-obsidian opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-[11px] tracking-[0.24em] uppercase text-muted">
          {car.brand} · {car.year}
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h3 className="font-display min-w-0 text-2xl md:text-[1.7rem]">
            <Link href={href} className="transition-colors duration-500 hover:text-accent">
              {car.model}
            </Link>
          </h3>
          <p className="shrink-0 text-sm font-medium text-accent tabular-nums md:text-base">{formatPrice(car.price)}</p>
        </div>

        <ul className="mt-5 mb-6 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          <li>{formatMileage(car.mileage, tUnits("km"))}</li>
          <li aria-hidden className="text-line">/</li>
          <li>{tEnum(`fuel.${car.fuel}`)}</li>
          <li aria-hidden className="text-line">/</li>
          <li>{tEnum(`transmission.${car.transmission}`)}</li>
        </ul>

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-line pt-5">
          <div className="flex items-center gap-5">
            <FavoriteButton id={car.id} />
            <CompareButton id={car.id} />
          </div>
          <Link href={href} className="text-[11px] tracking-[0.2em] uppercase text-ink hover:text-accent">
            {t("details")}
          </Link>
        </div>
      </div>
    </article>
  );
}
