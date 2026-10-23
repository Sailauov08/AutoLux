import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CarCard } from "@/components/cars/car-card";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getFeaturedVehicles } from "@/lib/data/vehicles";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

export async function FeaturedCars() {
  const t = await getTranslations("home.featured");
  const [lead, ...rest] = await getFeaturedVehicles();
  if (!lead) return null;

  return (
    <section className="mx-auto max-w-[1600px] px-6 py-24 md:px-12 md:py-40">
      <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
        <SectionHeading index="01" eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
        <Link href="/inventory" className="group inline-flex items-center gap-3 border-b border-ink pb-1 text-[11px] tracking-[0.24em] uppercase">
          {t("viewAll")}
          <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[lead, ...rest].map((car, index) => (
          <Reveal key={car.id} delay={index * 0.08}>
            <CarCard car={car} priority={index === 0} />
          </Reveal>
        ))}
      </div>

      <div className="mt-24 flex justify-center">
        <ButtonLink href="/inventory" variant="outline" arrow>
          {t("browseAll")}
        </ButtonLink>
      </div>
    </section>
  );
}
