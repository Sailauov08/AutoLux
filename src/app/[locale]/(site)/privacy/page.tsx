import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDealership } from "@/lib/data/dealership";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "privacy" });
  return { title: t("title") };
}

const SECTIONS = ["collect", "use", "access", "retention", "rights"] as const;

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  setRequestLocale((await params).locale);
  const [t, dealership] = await Promise.all([getTranslations("privacy"), getDealership()]);
  return (
    <article className="mx-auto max-w-3xl px-6 pt-36 pb-28 md:px-12">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="display mt-6 text-[clamp(2.6rem,6vw,4.5rem)]">{t("title")}</h1>
      <p className="mt-8 leading-[1.8] text-muted">{t("intro", { name: dealership.name })}</p>
      {SECTIONS.map((section) => (
        <section key={section} className="mt-12 border-t border-line pt-8">
          <h2 className="font-display text-2xl">{t(`${section}.title`)}</h2>
          <p className="mt-4 leading-[1.8] text-muted">{t(`${section}.text`)}</p>
        </section>
      ))}
      <p className="mt-12 border-t border-line pt-8 text-sm leading-[1.8] text-muted">
        {t("contact", { email: dealership.email || "—", phone: dealership.phone || "—" })}
      </p>
      <p className="mt-6 text-xs text-muted">{t("disclaimer")}</p>
    </article>
  );
}
