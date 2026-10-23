import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeTag } from "@/components/cars/car-badge";
import { CarCard } from "@/components/cars/car-card";
import { CarGallery } from "@/components/cars/car-gallery";
import { PaymentCalculator } from "@/components/finance/payment-calculator";
import { FinancingRequestForm } from "@/components/forms/financing-request-form";
import { CompareButton, FavoriteButton } from "@/components/cars/garage-actions";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Link } from "@/i18n/navigation";
import { ReservationPanel } from "@/components/forms/reservation-panel";
import { galleryImages, photoNoteKey } from "@/lib/cars";
import { getSimilarVehicles, getVehicle, getVehicleCopy, getVehicles } from "@/lib/data/vehicles";
import { calculateLoan } from "@/lib/finance";
import { formatMileage, formatPrice } from "@/lib/format";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getVehicles()).map((car) => ({ id: car.id }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/inventory/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const car = await getVehicle(id);
  const t = await getTranslations({ locale, namespace: "car" });
  if (!car) return { title: t("notFoundTitle") };

  const description = (await getTranslations({ locale, namespace: "meta" }))("vehicleDescription", {
    year: car.year,
    brand: car.brand,
    model: car.model,
    color: car.color,
    horsepower: car.horsepower,
    transmission: car.transmission,
    fuel: car.fuel,
  });

  return { title: `${car.year} ${car.brand} ${car.model}`, description };
}

export default async function CarDetailPage({ params }: PageProps<"/[locale]/inventory/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const car = await getVehicle(id);
  if (!car) notFound();

  const t = await getTranslations("car");
  const tEnum = await getTranslations("enums");
  const tUnits = await getTranslations("units");
  const tNav = await getTranslations("nav");
  const tStatus = await getTranslations("statuses.vehicle");
  const tFinance = await getTranslations("financing");
  const tFinanceForm = await getTranslations("financingForm");
  const copy = await getVehicleCopy(car.id, locale);
  const similar = await getSimilarVehicles(car);
  const payment = calculateLoan({ price: car.price, downPayment: Math.round(car.price * 0.2), apr: 5.9, termMonths: 60 });
  const features = copy.features;
  const metrics: [string, string, string][] = [
    [t("specs.horsepower"), String(car.horsepower), t("hp")],
    [t("specs.year"), String(car.year), ""],
    [t("specs.mileage"), formatMileage(car.mileage, "").trim(), t("km")],
    [t("specs.drivetrain"), car.drivetrain, ""],
  ];
  const specs: [string, string][] = [
    [t("specs.year"), String(car.year)],
    [t("specs.mileage"), formatMileage(car.mileage, tUnits("km"))],
    [t("specs.fuel"), tEnum(`fuel.${car.fuel}`)],
    [t("specs.transmission"), tEnum(`transmission.${car.transmission}`)],
    [t("specs.engine"), car.engine],
    [t("specs.horsepower"), `${car.horsepower} ${t("hp")}`],
    [t("specs.drivetrain"), tEnum(`drivetrain.${car.drivetrain}`)],
    [t("specs.bodyType"), tEnum(`bodyType.${car.bodyType}`)],
    [t("specs.color"), car.color],
  ];

  return (
    <>
      <div className="mx-auto max-w-[1600px] px-6 pt-32 md:px-12">
        <nav aria-label={t("breadcrumb")}>
          <ol className="flex flex-wrap items-center gap-3 text-[11px] tracking-[0.22em] uppercase text-muted">
            <li>
              <Link href="/inventory" className="transition-colors hover:text-ink">
                {tNav("inventory")}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">
              {car.brand} {car.model}
            </li>
          </ol>
        </nav>
      </div>

      <section className="mx-auto grid grid-cols-1 max-w-[1600px] gap-14 px-6 pt-10 pb-40 md:px-12 lg:grid-cols-12 lg:gap-16 lg:pb-32">
        <div className="min-w-0 lg:col-span-8">
          <CarGallery images={galleryImages(car)} alt={`${car.year} ${car.brand} ${car.model}`} photoNote={photoNoteKey(car)} />

          <dl aria-label={t("metrics")} className="mt-10 grid grid-cols-2 border-y border-line md:grid-cols-4">
            {metrics.map(([label, value, unit], index) => (
              <div key={label} className={`py-7 md:px-8 md:first:pl-0 ${index % 2 === 1 ? "pl-6" : ""} ${index > 0 ? "md:border-l md:border-line" : ""} ${index < 2 ? "border-b border-line md:border-b-0" : ""}`}>
                <dt className="text-[10px] tracking-[0.24em] uppercase text-muted">{label}</dt>
                <dd className="font-display mt-3 text-[clamp(1.8rem,3.4vw,3rem)] leading-none tabular-nums">
                  {value}
                  {unit && <span className="ml-2 font-sans text-xs tracking-[0.18em] uppercase text-muted">{unit}</span>}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-28 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.4fr]">
            <SectionHeading index="01" eyebrow={t("overview")} title={t("overviewTitle")} />
            <p className="self-end text-lg leading-[1.85] text-ink/80 md:text-xl">{copy.description}</p>
          </div>

          <div className="mt-28">
            <SectionHeading index="02" eyebrow={t("specifications")} title={t("specificationsTitle")} />
            <dl className="mt-14 grid grid-cols-1 border-t border-line md:grid-cols-2 md:gap-x-16">
              {specs.map(([label, value]) => (
                <Reveal key={label}>
                  <div className="flex items-baseline justify-between gap-6 border-b border-line py-5">
                    <dt className="text-[11px] tracking-[0.22em] uppercase text-muted">{label}</dt>
                    <dd className="text-right text-base tabular-nums">{value}</dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>

          <div className="mt-28">
            <SectionHeading index="03" eyebrow={t("highlights")} title={t("highlightsTitle")} />
            <ol className="mt-14 grid grid-cols-1 border-t border-line md:grid-cols-2 md:gap-x-16">
              {features.map((feature, index) => (
                <Reveal key={feature} delay={index * 0.05}>
                  <li className="flex items-baseline gap-6 border-b border-line py-6">
                    <span className="text-xs tabular-nums text-accent">0{index + 1}</span>
                    <span className="text-lg tracking-[-0.01em]">{feature}</span>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>

        <aside className="lg:col-span-4">
          <div className="border border-line bg-card p-6 md:p-8 lg:sticky lg:top-28">
            <div className="flex flex-wrap gap-2">
              {car.badges.map((badge) => (
                <BadgeTag key={badge} badge={badge} />
              ))}
            </div>
            <p className="mt-8 text-[11px] tracking-[0.26em] uppercase text-muted">
              {car.brand} · {car.year}
            </p>
            <h1 className="display mt-3 text-[clamp(2.6rem,4.4vw,4rem)]">{car.model}</h1>
            <p className="mt-6 text-3xl font-medium text-accent tabular-nums md:text-4xl">{formatPrice(car.price)}</p>
            {car.status && car.status !== "available" && (
              <p className="mt-3 text-[11px] tracking-[0.24em] uppercase text-accent">{tStatus(car.status)}</p>
            )}

            <div className="mt-10 border-y border-line py-7">
              <p className="text-[11px] tracking-[0.24em] uppercase text-muted">{t("estimated")}</p>
              <p className="mt-3 text-2xl font-medium tabular-nums">
                {formatPrice(Math.round(payment.monthly))}
                <span className="text-sm text-muted"> {t("perMonth")}</span>
              </p>
              <p className="mt-2 text-xs text-muted">{t("estimatedTerms")}</p>
            </div>

            <dl className="grid grid-cols-2 gap-px bg-line text-sm">
              {[
                [t("power"), `${car.horsepower} ${t("hp")}`],
                [t("drive"), tEnum(`drivetrain.${car.drivetrain}`)],
                [t("fuel"), tEnum(`fuel.${car.fuel}`)],
                [t("gearbox"), tEnum(`transmission.${car.transmission}`)],
              ].map(([label, value]) => (
                <div key={label} className="bg-card p-5">
                  <dt className="text-[10px] tracking-[0.22em] uppercase text-muted">{label}</dt>
                  <dd className="mt-2 text-base">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex flex-col gap-3">
              <ButtonLink href={`/test-drive?car=${car.id}`} variant="white" className="w-full" arrow>
                {t("bookTest")}
              </ButtonLink>
              <ButtonLink href={{ pathname: "/configurator", query: { car: car.id } }} variant="champagne" className="w-full">
                {t("configure")}
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline" className="w-full">
                {t("contactDealer")}
              </ButtonLink>
              <ReservationPanel vehicleId={car.id} available={car.status === "available"} />
            </div>
            <div className="mt-6 flex gap-6">
              <FavoriteButton id={car.id} showLabel />
              <CompareButton id={car.id} showLabel />
            </div>
            <p className="mt-10 text-xs leading-[1.7] text-muted">{t("disclaimer")}</p>
          </div>
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-white/10 bg-obsidian/95 px-6 py-4 text-white backdrop-blur-xl lg:hidden">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-white/50">{car.model}</p>
          <p className="text-base font-medium whitespace-nowrap tabular-nums">{formatPrice(car.price)}</p>
        </div>
        <ButtonLink href={`/test-drive?car=${car.id}`} variant="white" className="h-11 shrink-0 px-5 text-[10px] whitespace-nowrap">
          {tNav("bookTestDrive")}
        </ButtonLink>
      </div>

      <section id="financing" className="mx-auto max-w-[1600px] scroll-mt-24 px-6 py-24 md:px-12 md:py-32">
        <SectionHeading index="04" eyebrow={tFinance("eyebrow")} title={tFinance("calcTitle")} description={tFinance("calcDescription")} />
        <div className="mt-14">
          <PaymentCalculator defaultPrice={car.price} applyHref={`/inventory/${car.id}#apply`} />
        </div>
        <div id="apply" className="mt-14 scroll-mt-24 border border-line bg-card p-8 md:p-14">
          <h3 className="display text-3xl md:text-4xl">{tFinanceForm("title")}</h3>
          <div className="mt-10">
            <FinancingRequestForm vehicles={[{ id: car.id, label: `${car.year} ${car.brand} ${car.model}`, price: car.price }]} initialVehicleId={car.id} />
          </div>
        </div>
      </section>

      <section className="bg-card py-24 md:py-40">
        <div className="mx-auto max-w-[1600px] px-6 md:px-12">
          <SectionHeading index="05" eyebrow={t("similar")} title={t("similarTitle")} />
          <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3">
            {similar.map((item) => (
              <CarCard key={item.id} car={item} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
