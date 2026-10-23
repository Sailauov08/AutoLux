"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { type Car, coverImage } from "@/lib/cars";
import { clearCompare, toggleCompare, useGarage } from "@/lib/garage";
import { formatMileage, formatPrice } from "@/lib/format";

const ROWS = ["price", "year", "mileage", "engine", "horsepower", "drivetrain", "transmission", "fuel", "bodyType", "color"] as const;

export function CompareTable({ vehicles }: { vehicles: Car[] }) {
  const t = useTranslations("compare");
  const tEnum = useTranslations("enums");
  const tUnits = useTranslations("units");
  const { compare } = useGarage();
  const cars = compare.map((id) => vehicles.find((car) => car.id === id)).filter((car): car is Car => Boolean(car));

  const value = (row: (typeof ROWS)[number], car: Car) => {
    switch (row) {
      case "price":
        return formatPrice(car.price);
      case "year":
        return String(car.year);
      case "mileage":
        return formatMileage(car.mileage, tUnits("km"));
      case "engine":
        return car.engine;
      case "horsepower":
        return `${car.horsepower} hp`;
      case "drivetrain":
        return tEnum(`drivetrain.${car.drivetrain}`);
      case "transmission":
        return tEnum(`transmission.${car.transmission}`);
      case "fuel":
        return tEnum(`fuel.${car.fuel}`);
      case "bodyType":
        return tEnum(`bodyType.${car.bodyType}`);
      case "color":
        return car.color;
    }
  };

  if (cars.length === 0) {
    return (
      <div className="border border-dashed border-line px-8 py-28 text-center">
        <h2 className="display text-4xl md:text-5xl">{t("emptyTitle")}</h2>
        <p className="mx-auto mt-6 max-w-md leading-[1.75] text-muted">{t("emptyText")}</p>
        <ButtonLink href="/inventory" variant="solid" className="mt-12" arrow>
          {t("browse")}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div>
      <div className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 w-48 bg-page pb-8 align-bottom">
                <span className="sr-only">{t("specification")}</span>
              </th>
              {cars.map((car) => (
                <th key={car.id} scope="col" className="px-5 pb-8 align-bottom font-normal">
                  <div className="relative aspect-[4/3] overflow-hidden bg-mist">
                    <Image src={coverImage(car)} alt={`${car.brand} ${car.model}`} fill sizes="360px" className="object-cover" />
                  </div>
                  <p className="mt-6 text-[11px] tracking-[0.24em] uppercase text-muted">{car.brand}</p>
                  <p className="display mt-2 text-2xl md:text-3xl">{car.model}</p>
                  <div className="mt-4 flex gap-6 text-[11px] tracking-[0.2em] uppercase">
                    <Link href={`/inventory/${car.id}`} className="border-b border-ink pb-0.5 hover:text-accent">
                      {t("viewCar")}
                    </Link>
                    <button type="button" onClick={() => toggleCompare(car.id)} className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-ink">
                      <X className="size-3" aria-hidden />
                      {t("remove")}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row} className="border-t border-line">
                <th scope="row" className="sticky left-0 bg-page py-6 pr-6 text-[11px] font-medium tracking-[0.22em] uppercase text-muted">
                  {t(`rows.${row}`)}
                </th>
                {cars.map((car) => (
                  <td key={car.id} className="px-5 py-6 text-base tabular-nums">
                    {value(row, car)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-10 flex justify-end border-t border-line pt-8">
        <button type="button" onClick={clearCompare} className="text-[11px] tracking-[0.22em] uppercase text-muted underline underline-offset-8 transition-colors hover:text-ink">
          {t("clear")}
        </button>
      </div>
    </div>
  );
}
