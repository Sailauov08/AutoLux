import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CancelRequestButton, ProfileForm } from "@/components/account/account-controls";
import { CarCard } from "@/components/cars/car-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { signOut } from "@/lib/actions/account";
import { getStaff, requireUser } from "@/lib/auth/session";
import { getMyFavorites, getMyRequests } from "@/lib/data/account";
import { getDealership } from "@/lib/data/dealership";
import { formatDate, formatDateTime } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "meta" });
  return { title: t("account"), robots: { index: false } };
}

const CANCELLABLE_STATUS = new Set(["new", "confirmed", "in_progress"]);
const CANCELLABLE_KIND = new Set(["test_drive", "reservation", "service"]);

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, "/account");
  const [t, tStatus, tCommon, tRoles, favorites, requests, staff, dealership] = await Promise.all([
    getTranslations("account"),
    getTranslations("statuses.request"),
    getTranslations("common"),
    getTranslations("roles"),
    getMyFavorites(user.id),
    getMyRequests(user.id),
    getStaff(),
    getDealership(),
  ]);
  const tz = dealership.timezone;

  return (
    <div className="mx-auto max-w-[1600px] px-6 pt-36 pb-28 md:px-12">
      <div className="flex flex-col justify-between gap-10 border-b border-line pb-14 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="display mt-6 text-[clamp(3rem,7vw,6.5rem)]">{t("title")}</h1>
          <p className="mt-6 max-w-lg text-muted">{t("description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {staff && (
            <ButtonLink href="/admin" variant="solid" arrow>
              {t("admin")}
            </ButtonLink>
          )}
          <form action={signOut.bind(null, locale)}>
            <Button type="submit" variant="outline">
              {tCommon("signOut")}
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-20 py-20 lg:grid-cols-[1fr_1.6fr] lg:gap-28">
        <section>
          <SectionHeading index="01" eyebrow={t("profile")} title={user.fullName ?? user.email} />
          <dl className="mt-10 grid grid-cols-2 gap-px bg-line text-sm">
            <div className="bg-page p-5">
              <dt className="text-[10px] tracking-[0.22em] uppercase text-muted">{t("email")}</dt>
              <dd className="mt-2 break-all">{user.email}</dd>
            </div>
            <div className="bg-page p-5">
              <dt className="text-[10px] tracking-[0.22em] uppercase text-muted">{tCommon("status")}</dt>
              <dd className="mt-2">{tRoles(staff?.role ?? "customer")}</dd>
            </div>
          </dl>
          <div className="mt-12">
            <ProfileForm initial={{ fullName: user.fullName ?? "", phone: user.phone ?? "", locale: user.locale }} />
          </div>
        </section>

        <section>
          <SectionHeading index="02" eyebrow={t("requestsTitle")} title={t("requestsTitle")} />
          {requests.length === 0 ? (
            <p className="mt-10 border border-dashed border-line px-6 py-12 text-muted">{t("requestsEmpty")}</p>
          ) : (
            <ul className="mt-10 border-t border-line">
              {requests.map((request) => (
                <li key={`${request.kind}-${request.id}`} className="grid grid-cols-1 gap-4 border-b border-line py-6 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-[11px] tracking-[0.22em] uppercase text-accent">{t(`kinds.${request.kind}`)}</p>
                    <p className="mt-2 text-lg font-medium tabular-nums">{request.reference}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(request.created_at, tz)}
                      {request.vehicle && ` · ${request.vehicle.make} ${request.vehicle.model}`}
                    </p>
                    {request.starts_at && <p className="mt-1 text-sm">{t("appointment", { time: formatDateTime(request.starts_at, tz) })}</p>}
                    {request.kind === "reservation" && request.status === "confirmed" && request.hold_until && (
                      <p className="mt-1 text-sm">{t("heldUntil", { time: formatDateTime(request.hold_until, tz) })}</p>
                    )}
                    {request.status === "new" && (request.kind === "test_drive" || request.kind === "service" || request.kind === "reservation") && (
                      <p className="mt-1 text-xs text-muted">{t("awaitingConfirmation")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 sm:justify-end">
                    <span className="border border-line px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase">{tStatus(request.status)}</span>
                    {CANCELLABLE_KIND.has(request.kind) && CANCELLABLE_STATUS.has(request.status) && <CancelRequestButton kind={request.kind} id={request.id} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="border-t border-line pt-20">
        <SectionHeading index="03" eyebrow={t("savedTitle")} title={t("savedTitle")} />
        {favorites.length === 0 ? (
          <div className="mt-10 flex flex-col items-start gap-6 border border-dashed border-line px-6 py-12">
            <p className="text-muted">{t("savedEmpty")}</p>
            <ButtonLink href="/inventory" variant="outline" arrow>
              {t("browse")}
            </ButtonLink>
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
