import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { ParallaxMedia } from "@/components/ui/parallax-media";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("about") };
}

const VALUES = ["precision", "transparency", "service"] as const;
const MILESTONES = ["m2011", "m2016", "m2020", "m2025"] as const;
const TEAM = ["team1", "team2", "team3", "team4"] as const;

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("about");

  return (
    <>
      <PageHero
        eyebrow={t("heroEyebrow")}
        title={t("heroTitle")}
        description={t("heroDescription")}
        image="https://images.unsplash.com/photo-1740775525864-d8cc2ec1983e?auto=format&fit=crop&w=2000&q=70"
      />

      <section className="mx-auto grid grid-cols-1 max-w-[1600px] items-center gap-20 px-6 py-24 md:px-12 md:py-40 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading index="01" eyebrow={t("storyEyebrow")} title={t("storyTitle")} />
          <div className="mt-12 space-y-6 text-lg leading-[1.85] text-ink/75">
            <p>{t("storyP1")}</p>
            <p>{t("storyP2")}</p>
          </div>
        </div>
        <ParallaxMedia
          src="https://images.unsplash.com/photo-1609521247503-8de40462e427?auto=format&fit=crop&w=1400&q=75"
          alt={t("storyImageAlt")}
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="aspect-[4/5] lg:col-span-6 lg:col-start-7"
        />
      </section>

      <section className="bg-obsidian py-24 text-white md:py-40">
        <div className="mx-auto max-w-[1600px] px-6 md:px-12">
          <SectionHeading tone="dark" index="02" eyebrow={t("valuesEyebrow")} title={t("valuesTitle")} />
          <ol className="mt-20 grid grid-cols-1 border-t border-white/15 md:grid-cols-3">
            {VALUES.map((value, index) => (
              <li key={value} className="border-b border-white/15 py-12 md:border-b-0 md:border-r md:px-10 md:py-16 md:first:pl-0 md:last:border-r-0">
                <Reveal delay={index * 0.1}>
                  <p className="text-xs tabular-nums text-champagne">0{index + 1}</p>
                  <h3 className="mt-16 text-3xl font-display font-normal tracking-normal">{t(`${value}.title`)}</h3>
                  <p className="mt-5 leading-[1.8] text-silver">{t(`${value}.text`)}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid grid-cols-1 max-w-[1600px] gap-20 px-6 py-24 md:px-12 md:py-40 lg:grid-cols-[1fr_1.3fr] lg:gap-28">
        <SectionHeading index="03" eyebrow={t("milestonesEyebrow")} title={t("milestonesTitle")} />
        <ol className="relative border-l border-line pl-10 md:pl-16">
          {MILESTONES.map((key, index) => (
            <li key={key} className="relative pb-16 last:pb-0">
              <Reveal delay={index * 0.08}>
                <span className="absolute top-2 -left-[5px] size-2.5 rotate-45 bg-champagne md:-left-[5px]" aria-hidden />
                <p className="text-[11px] tracking-[0.26em] uppercase text-accent tabular-nums">{key.slice(1)}</p>
                <h3 className="mt-4 text-2xl font-display font-normal tracking-normal md:text-3xl">{t(`${key}.title`)}</h3>
                <p className="mt-4 max-w-md leading-[1.8] text-muted">{t(`${key}.text`)}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-card py-24 md:py-40">
        <div className="mx-auto max-w-[1600px] px-6 md:px-12">
          <SectionHeading index="04" eyebrow={t("teamEyebrow")} title={t("teamTitle")} />
          <ul className="mt-20 grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((key) => {
              const name = t(`${key}.name`);
              return (
                <li key={key} className="flex min-h-72 flex-col justify-between bg-card p-8 md:p-10">
                  <span className="display flex size-16 items-center justify-center border border-line text-lg">
                    {name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <div className="mt-16">
                    <p className="text-xl font-display font-normal tracking-normal">{name}</p>
                    <p className="mt-2 text-sm leading-[1.6] text-muted">{t(`${key}.role`)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-20 flex justify-center">
            <ButtonLink href="/test-drive" variant="solid" arrow>
              {t("cta")}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
