import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CarCard } from "@/components/cars/car-card";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Link } from "@/i18n/navigation";
import { getVehicles } from "@/lib/data/vehicles";
import { BODY_TYPES } from "@/lib/domain";

export async function BodyTypes() {
  const [t, tBody, cars] = await Promise.all([getTranslations("home.byType"), getTranslations("enums.bodyType"), getVehicles()]);
  const groups = BODY_TYPES.map((type) => ({ type, cars: cars.filter((car) => car.bodyType === type && car.status !== "sold") })).filter(
    (group) => group.cars.length > 0,
  );

  return groups.map((group, index) => (
    <section key={group.type} id={group.type.toLowerCase()} className="mx-auto max-w-[1600px] border-t border-line px-6 py-20 md:px-12 md:py-28">
      <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <SectionHeading index={String(index + 2).padStart(2, "0")} eyebrow={t("count", { count: group.cars.length })} title={tBody(group.type)} />
        <Link
          href={{ pathname: "/inventory", query: { bodyType: group.type } }}
          className="group inline-flex items-center gap-3 self-start border-b border-ink pb-1 text-[11px] tracking-[0.24em] uppercase md:self-auto"
        >
          {t("viewAll", { type: tBody(group.type) })}
          <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {group.cars.map((car, position) => (
          <Reveal key={car.id} delay={(position % 3) * 0.08}>
            <CarCard car={car} />
          </Reveal>
        ))}
      </div>
    </section>
  ));
}
