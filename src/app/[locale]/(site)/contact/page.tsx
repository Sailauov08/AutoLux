import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/forms/contact-form";
import { DemoNotice } from "@/components/forms/form-status";
import { PageHero } from "@/components/ui/page-hero";
import { getDealership } from "@/lib/data/dealership";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("contact") };
}

export default async function ContactPage({ params, searchParams }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { topic } = await searchParams;
  const [t, d, dealership] = await Promise.all([getTranslations("contact"), getTranslations("dealership"), getDealership()]);
  const address = dealership.address?.[locale as "kk"];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <section className="mx-auto grid grid-cols-1 max-w-[1600px] gap-20 px-6 py-24 md:px-12 md:py-40 lg:grid-cols-[1.4fr_1fr] lg:gap-28">
        <div className="border border-line bg-card p-8 md:p-14">
          <h2 className="display text-4xl md:text-5xl">{t("formTitle")}</h2>
          <p className="mt-4 mb-14 text-muted">{t("formDescription")}</p>
          {!isSupabaseConfigured() && <DemoNotice />}
          <ContactForm defaultTopic={typeof topic === "string" ? topic : undefined} />
        </div>

        <div className="flex flex-col gap-14 lg:pt-6">
          <div>
            <p className="eyebrow">{d("showroom")}</p>
            <address className="mt-6 text-2xl not-italic leading-[1.5] tracking-[-0.02em]">
              <span className="block">{address?.line1 || d("address1")}</span>
              <span className="block">{address?.line2 || d("address2")}</span>
            </address>
            {dealership.phone && (
              <a href={`tel:${dealership.phoneHref}`} className="mt-8 block text-xl tabular-nums hover:text-accent">
                {dealership.phone}
              </a>
            )}
            {dealership.email && (
              <a href={`mailto:${dealership.email}`} className="mt-3 block text-base text-muted hover:text-accent">
                {dealership.email}
              </a>
            )}
            {dealership.whatsapp && (
              <a href={`https://wa.me/${dealership.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="mt-3 block text-base text-muted hover:text-accent">
                WhatsApp · {dealership.whatsapp}
              </a>
            )}
          </div>

          <div className="border-t border-line pt-10">
            <p className="eyebrow">{d("hoursLabel")}</p>
            <dl className="mt-6 divide-y divide-line text-base">
              {dealership.hours.map((slot) => (
                <div key={slot.key} className="flex justify-between gap-6 py-4">
                  <dt className="text-muted">{d(slot.key)}</dt>
                  <dd className="tabular-nums">{slot.time}</dd>
                </div>
              ))}
            </dl>
          </div>

          <a
            href={dealership.mapsUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex aspect-[4/3] flex-col justify-between overflow-hidden bg-obsidian p-8 text-white"
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:48px_48px] transition-transform duration-[1600ms] group-hover:scale-105"
            />
            <span className="relative eyebrow text-champagne">{t("mapCaption")}</span>
            <div className="relative flex items-end justify-between gap-6">
              <div>
                <p className="display text-3xl">{d("mapTitle")}</p>
                <p className="mt-2 text-sm text-silver">{d("mapSubtitle")}</p>
              </div>
              <ArrowUpRight className="size-7 transition-transform duration-700 group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden />
            </div>
          </a>
        </div>
      </section>
    </>
  );
}
