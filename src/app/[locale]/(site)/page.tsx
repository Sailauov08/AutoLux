import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BodyTypes } from "@/components/home/body-types";
import { FeaturedCars } from "@/components/home/featured-cars";
import { Hero } from "@/components/home/hero";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("home"), description: t("siteDescription") };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  setRequestLocale((await params).locale);

  return (
    <>
      <Hero />
      <FeaturedCars />
      <BodyTypes />
    </>
  );
}
