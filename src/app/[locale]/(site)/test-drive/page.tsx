import type { Metadata } from "next";
import { CalendarCheck, Car, UserRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TestDriveForm } from "@/components/forms/test-drive-form";
import { PageHero } from "@/components/ui/page-hero";
import { DemoNotice } from "@/components/forms/form-status";
import { getDealership } from "@/lib/data/dealership";
import { getVehicles } from "@/lib/data/vehicles";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/test-drive">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("testDrive") };
}

const PERKS = [
  { icon: Car, key: "perk1" },
  { icon: CalendarCheck, key: "perk2" },
  { icon: UserRound, key: "perk3" },
] as const;

export default async function TestDrivePage({ params, searchParams }: PageProps<"/[locale]/test-drive">) {
  setRequestLocale((await params).locale);
  const { car } = await searchParams;
  const vehicles = (await getVehicles())
    .filter((item) => item.status !== "sold")
    .map((item) => ({ id: item.id, label: `${item.year} ${item.brand} ${item.model}` }));
  const defaultCarId = typeof car === "string" && vehicles.some((item) => item.id === car) ? car : undefined;
  const [t, dealership] = await Promise.all([getTranslations("testDrive"), getDealership()]);

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        image="https://images.unsplash.com/photo-1758788047072-db1936ca3722?auto=format&fit=crop&w=2000&q=70"
      />

      <section className="mx-auto grid grid-cols-1 max-w-[1600px] gap-20 px-6 py-24 md:px-12 md:py-40 lg:grid-cols-[1fr_1.4fr] lg:gap-28">
        <ul className="space-y-12 self-start lg:sticky lg:top-32">
          {PERKS.map((perk, index) => (
            <li key={perk.key} className="flex gap-8 border-t border-line pt-10">
              <span className="flex size-12 shrink-0 items-center justify-center border border-line">
                <perk.icon className="size-5 text-accent" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] tabular-nums text-muted">0{index + 1}</p>
                <h2 className="mt-2 text-2xl font-display font-normal tracking-normal">{t(`${perk.key}.title`)}</h2>
                <p className="mt-3 leading-[1.8] text-muted">{t(`${perk.key}.text`)}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="border border-line bg-card p-8 md:p-14">
          {!isSupabaseConfigured() && <DemoNotice />}
          {dealership.testDriveEnabled ? (
            <TestDriveForm vehicles={vehicles} defaultCarId={defaultCarId} slots={dealership.bookingSlots} />
          ) : (
            <p className="text-muted">{t("disabled")}</p>
          )}
        </div>
      </section>
    </>
  );
}
