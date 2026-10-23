import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Configurator, type ConfigCar } from "@/components/configurator/configurator";
import { galleryImages, photoNoteKey } from "@/lib/cars";
import { getVehicles } from "@/lib/data/vehicles";

export async function generateMetadata({ params }: PageProps<"/[locale]/configurator">): Promise<Metadata> {
  const { locale } = await params;
  const [meta, t] = await Promise.all([getTranslations({ locale, namespace: "meta" }), getTranslations({ locale, namespace: "configurator" })]);
  return { title: meta("configurator"), description: t("description") };
}

export default async function ConfiguratorPage({ params, searchParams }: PageProps<"/[locale]/configurator">) {
  setRequestLocale((await params).locale);
  const { car } = await searchParams;
  const t = await getTranslations("configurator");
  const cars: ConfigCar[] = (await getVehicles())
    .filter((item) => item.status !== "sold")
    .map((item) => ({ id: item.id, brand: item.brand, model: item.model, year: item.year, price: item.price, images: galleryImages(item), photoNote: photoNoteKey(item) }));
  const initialCar = cars.find((item) => item.id === car)?.id ?? cars[0]?.id;

  return (
    <>
      <section className="mx-auto max-w-[1600px] px-6 pt-36 pb-14 md:px-12 md:pt-44 md:pb-20">
        <p className="eyebrow animate-fade">{t("eyebrow")}</p>
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <h1 className="display max-w-4xl overflow-hidden pb-2 text-[clamp(2.8rem,7vw,6.5rem)]">
            <span className="block animate-rise">{t("title")}</span>
          </h1>
          <p className="max-w-sm text-base leading-[1.75] text-muted animate-fade">{t("description")}</p>
        </div>
      </section>
      {initialCar && <Configurator cars={cars} initialCar={initialCar} />}
    </>
  );
}
