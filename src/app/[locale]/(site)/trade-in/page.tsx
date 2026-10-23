import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoNotice } from "@/components/forms/form-status";
import { TradeInForm } from "@/components/forms/trade-in-form";
import { PageHero } from "@/components/ui/page-hero";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/trade-in">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("tradeIn") };
}

const BENEFITS = ["benefit1", "benefit2", "benefit3"] as const;

export default async function TradeInPage({ params }: PageProps<"/[locale]/trade-in">) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("tradeInPage");

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        image="https://images.unsplash.com/photo-1609521233053-345bfa8b6f17?auto=format&fit=crop&w=2000&q=70"
      />

      <section className="mx-auto grid grid-cols-1 max-w-[1600px] gap-20 px-6 py-24 md:px-12 md:py-40 lg:grid-cols-[1fr_1.4fr] lg:gap-28">
        <ol className="self-start border-t border-line lg:sticky lg:top-32">
          {BENEFITS.map((key, index) => (
            <li key={key} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-line py-10">
              <span className="text-xs tabular-nums text-accent">0{index + 1}</span>
              <div>
                <h2 className="text-2xl font-display font-normal tracking-normal">{t(`${key}.title`)}</h2>
                <p className="mt-4 leading-[1.8] text-muted">{t(`${key}.text`)}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="border border-line bg-card p-8 md:p-14">
          {!isSupabaseConfigured() && <DemoNotice />}
          <TradeInForm />
        </div>
      </section>
    </>
  );
}
