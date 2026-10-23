import type { Metadata } from "next";
import Image from "next/image";
import { MonitorSmartphone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { SHOWROOM_HERO, SHOWROOM_ZONES } from "@/lib/showroom";

export async function generateMetadata({ params }: PageProps<"/[locale]/showroom">): Promise<Metadata> {
  const { locale } = await params;
  const [meta, t] = await Promise.all([getTranslations({ locale, namespace: "meta" }), getTranslations({ locale, namespace: "showroom" })]);
  return { title: meta("showroom"), description: t("description") };
}

export default async function ShowroomPage({ params }: PageProps<"/[locale]/showroom">) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("showroom");

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} meta={t("concept")} image={SHOWROOM_HERO} />

      <section className="mx-auto max-w-[1600px] px-6 pt-16 md:px-12">
        <p className="border-l-2 border-champagne pl-5 text-sm leading-[1.7] text-muted">{t("disclaimer")}</p>
      </section>

      <section className="mx-auto max-w-[1600px] space-y-24 px-6 py-20 md:px-12 md:py-32 lg:space-y-36">
        {SHOWROOM_ZONES.map((zone, index) => (
          <Reveal key={zone.key} className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
            <figure className={`relative aspect-[4/3] overflow-hidden bg-mist lg:col-span-7 ${index % 2 === 1 ? "lg:order-2 lg:col-start-6" : ""}`}>
              <Image src={zone.src} alt={t(`zones.${zone.key}.title`)} fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
              <figcaption className="absolute top-4 left-4 bg-obsidian/70 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase text-champagne backdrop-blur">{t("concept")}</figcaption>
            </figure>
            <div className={`lg:col-span-4 ${index % 2 === 1 ? "lg:order-1 lg:col-start-1" : "lg:col-start-9"}`}>
              <p className="text-xs tracking-[0.3em] text-accent tabular-nums">0{index + 1}</p>
              <h2 className="display mt-5 text-[clamp(2rem,4vw,3.4rem)]">{t(`zones.${zone.key}.title`)}</h2>
              <p className="mt-6 text-base leading-[1.8] text-muted md:text-lg">{t(`zones.${zone.key}.text`)}</p>
            </div>
          </Reveal>
        ))}

        <Reveal className="grid grid-cols-1 items-center gap-10 border border-line bg-card p-8 md:p-14 lg:grid-cols-12 lg:gap-16">
          <div aria-hidden className="relative mx-auto flex aspect-[3/4] w-full max-w-[260px] flex-col border border-silver/30 bg-obsidian p-5 text-white shadow-[0_40px_80px_-40px_rgb(0_0_0/0.8)] lg:col-span-4">
            <span className="font-display text-lg">
              Auto<span className="italic text-champagne">Lux</span>
            </span>
            <span className="hairline mt-4 h-px w-full" />
            <span className="mt-6 grid flex-1 grid-cols-2 gap-2">
              {["#20252c", "#283a4b", "#20252c", "#283a4b"].map((color, cell) => (
                <span key={cell} className="border border-silver/10" style={{ background: color }} />
              ))}
            </span>
            <span className="mt-4 h-8 border border-champagne/60" />
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <MonitorSmartphone className="size-6 text-accent" aria-hidden />
            <p className="mt-6 text-xs tracking-[0.3em] text-accent tabular-nums">05</p>
            <h2 className="display mt-5 text-[clamp(2rem,4vw,3.4rem)]">{t("zones.kiosk.title")}</h2>
            <p className="mt-6 max-w-lg text-base leading-[1.8] text-muted md:text-lg">{t("zones.kiosk.text")}</p>
            <ButtonLink href="/configurator" variant="outline" className="mt-10" arrow>
              {t("kioskCta")}
            </ButtonLink>
          </div>
        </Reveal>
      </section>

      <section className="bg-obsidian py-24 text-white md:py-36">
        <Reveal className="mx-auto max-w-[1600px] px-6 md:px-12">
          <span aria-hidden className="hairline block h-px w-24" />
          <h2 className="display mt-10 max-w-3xl text-[clamp(2.4rem,5.5vw,5rem)]">{t("cta")}</h2>
          <p className="mt-8 max-w-lg text-base leading-[1.75] text-silver md:text-lg">{t("ctaText")}</p>
          <ButtonLink href="/contact" variant="champagne" className="mt-12" arrow>
            {t("cta")}
          </ButtonLink>
        </Reveal>
      </section>
    </>
  );
}
