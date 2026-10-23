import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InventoryBrowser } from "@/components/cars/inventory-browser";
import { PageHero } from "@/components/ui/page-hero";
import { getVehicles } from "@/lib/data/vehicles";
import type { Filters } from "@/lib/inventory";

export async function generateMetadata({ params }: PageProps<"/[locale]/inventory">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "inventory" });
  const meta = await getTranslations({ locale, namespace: "meta" });
  return { title: meta("inventory"), description: t("description") };
}

const pick = (value: unknown, options: string[]) => (typeof value === "string" && options.includes(value) ? value : undefined);

export default async function InventoryPage({ params, searchParams }: PageProps<"/[locale]/inventory">) {
  setRequestLocale((await params).locale);
  const query = await searchParams;
  const cars = await getVehicles();
  const t = await getTranslations("inventory");

  const bodyType = pick(query.bodyType, [...new Set(cars.map((car) => car.bodyType))]);
  const brand = pick(query.brand, [...new Set(cars.map((car) => car.brand))]);
  const fuel = pick(query.fuel, [...new Set(cars.map((car) => car.fuel))]);
  const q = typeof query.q === "string" ? query.q.slice(0, 80) : "";
  const initial: Partial<Filters> = { ...(bodyType && { bodyType }), ...(brand && { brand }), ...(fuel && { fuel }), ...(q && { query: q }) };

  return (
    <>
      <PageHero
        eyebrow={t("collectionEyebrow")}
        title={t("title")}
        description={t("description")}
        meta={t("demoNotice")}
        image="https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=2000&q=70"
      />
      <InventoryBrowser key={JSON.stringify(initial)} cars={cars} initial={initial} />
    </>
  );
}
