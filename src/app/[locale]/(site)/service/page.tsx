import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoNotice } from "@/components/forms/form-status";
import { ServiceForm } from "@/components/forms/service-form";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDealership } from "@/lib/data/dealership";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[locale]/service">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("service") };
}

export default async function ServicePage({ params }: PageProps<"/[locale]/service">) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("service");
  const dealership = await getDealership();

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        image="https://images.unsplash.com/photo-1680451553374-09d8d6a1ca58?auto=format&fit=crop&w=2000&q=70"
      />
      <section className="mx-auto grid grid-cols-1 max-w-[1600px] gap-20 px-6 py-24 md:px-12 md:py-40 lg:grid-cols-[1fr_1.4fr] lg:gap-28">
        <SectionHeading index="01" eyebrow={t("eyebrow")} title={t("formTitle")} />
        <div className="border border-line bg-card p-8 md:p-14">
          {!isSupabaseConfigured() && <DemoNotice />}
          {dealership.serviceEnabled && dealership.services.length > 0 ? (
            <ServiceForm slots={dealership.bookingSlots} services={dealership.services} />
          ) : (
            <p className="text-muted">{t("disabled")}</p>
          )}
        </div>
      </section>
    </>
  );
}
