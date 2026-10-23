import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaymentCalculator } from "@/components/finance/payment-calculator";
import { FinancingRequestForm } from "@/components/forms/financing-request-form";
import { DemoNotice } from "@/components/forms/form-status";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { getVehicles } from "@/lib/data/vehicles";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/financing">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "financing" });
  const meta = await getTranslations({ locale, namespace: "meta" });
  return { title: meta("financing"), description: t("description") };
}

const STEPS = ["step1", "step2", "step3"] as const;
const BENEFITS = ["benefit1", "benefit2", "benefit3", "benefit4", "benefit5", "benefit6"] as const;

export default async function FinancingPage({ params }: PageProps<"/[locale]/financing">) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("financing");
  const tf = await getTranslations("financingForm");
  const vehicles = (await getVehicles())
    .filter((item) => item.status !== "sold")
    .map((item) => ({ id: item.id, label: `${item.year} ${item.brand} ${item.model}`, price: item.price }));

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        image="https://images.unsplash.com/photo-1613921568536-555645be4032?auto=format&fit=crop&w=2000&q=70"
      />

      <section className="mx-auto max-w-[1600px] px-6 py-24 md:px-12 md:py-40">
        <SectionHeading index="01" eyebrow={t("howEyebrow")} title={t("howTitle")} />
        <ol className="mt-20 grid grid-cols-1 gap-12 border-t border-line pt-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, index) => (
            <Reveal key={step} delay={index * 0.1}>
              <li>
                <p className="display text-[clamp(3.5rem,7vw,6rem)] text-accent tabular-nums">0{index + 1}</p>
                <h3 className="mt-8 text-2xl font-display font-normal tracking-normal">{t(`${step}.title`)}</h3>
                <p className="mt-4 max-w-sm leading-[1.8] text-muted">{t(`${step}.text`)}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="bg-card py-24 md:py-40">
        <div className="mx-auto grid grid-cols-1 max-w-[1600px] gap-20 px-6 md:px-12 lg:grid-cols-[1fr_1.5fr] lg:gap-24">
          <div>
            <SectionHeading index="02" eyebrow={t("calcEyebrow")} title={t("calcTitle")} description={t("calcDescription")} />
            <ul className="mt-14 border-t border-line">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-baseline gap-5 border-b border-line py-5 text-base text-ink/80">
                  <span aria-hidden className="size-1.5 shrink-0 translate-y-[-3px] bg-champagne" />
                  {t(benefit)}
                </li>
              ))}
            </ul>
          </div>
          <Reveal>
            <PaymentCalculator />
          </Reveal>
        </div>
      </section>

      <section id="apply" className="mx-auto grid grid-cols-1 max-w-[1600px] gap-20 px-6 py-24 md:px-12 md:py-40 lg:grid-cols-[1fr_1.4fr] lg:gap-28">
        <SectionHeading index="03" eyebrow={tf("eyebrow")} title={tf("title")} description={tf("text")} />
        <div className="border border-line bg-card p-8 md:p-14">
          {!isSupabaseConfigured() && <DemoNotice />}
          <FinancingRequestForm vehicles={vehicles} />
        </div>
      </section>

      <section className="bg-obsidian py-28 text-white md:py-44">
        <div className="mx-auto max-w-[1600px] px-6 md:px-12">
          <h2 className="display max-w-4xl text-[clamp(2.6rem,6.5vw,6rem)]">{t("ctaTitle")}</h2>
          <div className="mt-12 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <p className="max-w-lg text-base leading-[1.8] text-silver md:text-lg">{t("ctaText")}</p>
            <ButtonLink href="/financing#apply" variant="white" arrow>
              {t("ctaButton")}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
