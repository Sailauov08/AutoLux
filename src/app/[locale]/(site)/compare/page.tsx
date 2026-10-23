import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompareTable } from "@/components/cars/compare-table";
import { PageHero } from "@/components/ui/page-hero";
import { getVehicles } from "@/lib/data/vehicles";

export async function generateMetadata({ params }: PageProps<"/[locale]/compare">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("compare") };
}

export default async function ComparePage({ params }: PageProps<"/[locale]/compare">) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("compare");

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <section className="mx-auto max-w-[1600px] px-6 py-24 md:px-12 md:py-32">
        <CompareTable vehicles={await getVehicles()} />
      </section>
    </>
  );
}
