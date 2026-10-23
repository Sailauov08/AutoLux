import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Badge } from "@/components/admin/admin-ui";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getCalendar, getStaffDirectory, param } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { REQUEST_KINDS } from "@/lib/domain";
import { formatDate, formatTime, fromDateTimeLocal, localDateKey } from "@/lib/format";

const addDays = (day: string, days: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const mondayOf = (day: string) => {
  const weekday = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
};

export default async function CalendarPage({ params, searchParams }: PageProps<"/[locale]/admin/calendar">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, "bookings.read");
  const dealership = await getDealership();
  const tz = dealership.timezone;
  const requested = param((await searchParams).week);
  const today = localDateKey(new Date().toISOString(), tz);
  const monday = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today);
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const [t, tNav, tStatus, tTypes, entries, directory] = await Promise.all([
    getTranslations("admin.calendar"),
    getTranslations("admin.nav"),
    getTranslations("statuses.request"),
    getTranslations("admin.requests.serviceTypes"),
    getCalendar(staff.dealershipId, new Date(fromDateTimeLocal(`${monday}T00:00`, tz)), new Date(fromDateTimeLocal(`${addDays(monday, 7)}T00:00`, tz))),
    getStaffDirectory(staff.dealershipId),
  ]);
  const names = new Map(directory.map((member) => [member.user_id, member.full_name]));
  const weekday = (index: number) => t(`days.${index}`);
  const nav = "inline-flex h-10 items-center gap-2 border border-line px-3 text-[11px] tracking-[0.16em] uppercase hover:border-accent";

  return (
    <div className="space-y-6">
      <AdminHeader title={t("title")} description={t("timezone", { zone: tz })}>
        <Link href={{ pathname: "/admin/calendar", query: { week: addDays(monday, -7) } }} className={nav} aria-label={t("previous")}>
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
        <Link href="/admin/calendar" className={nav}>
          {t("today")}
        </Link>
        <Link href={{ pathname: "/admin/calendar", query: { week: addDays(monday, 7) } }} className={nav} aria-label={t("next")}>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </AdminHeader>
      <p className="text-sm text-muted">{t("week", { from: formatDate(monday, "UTC"), to: formatDate(addDays(monday, 6), "UTC") })}</p>

      <div className="grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-7">
        {days.map((day, index) => {
          const items = entries.filter((entry) => localDateKey(entry.starts_at, tz) === day);
          return (
            <section key={day} aria-label={`${weekday(index)} ${formatDate(day, "UTC")}`} className={`min-h-40 bg-card p-3 ${day === today ? "ring-1 ring-champagne ring-inset" : ""}`}>
              <h2 className="flex items-baseline justify-between text-[10px] tracking-[0.2em] uppercase text-muted">
                <span>{weekday(index)}</span>
                <span className="tabular-nums">{formatDate(day, "UTC").slice(0, 5)}</span>
              </h2>
              {items.length === 0 ? (
                <p className="mt-6 text-center text-xs text-muted/60">—</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {items.map((entry) => (
                    <li key={`${entry.kind}-${entry.id}`}>
                      <Link
                        href={`/admin/requests/${REQUEST_KINDS[entry.kind].slug}/${entry.id}`}
                        className={`block border-l-2 bg-page px-2 py-1.5 text-xs hover:bg-mist ${entry.kind === "test_drive" ? "border-champagne" : "border-sky-500"}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-medium tabular-nums">{formatTime(entry.starts_at, tz)}</span>
                          <Badge tone={entry.status}>{tStatus(entry.status)}</Badge>
                        </span>
                        <span className="mt-1 block truncate">{entry.contact?.name ?? entry.reference}</span>
                        <span className="block truncate text-muted">
                          {tNav(entry.kind)} · {entry.kind === "service" ? tTypes(entry.label) : entry.label}
                        </span>
                        {entry.assigned_to && <span className="block truncate text-muted">{names.get(entry.assigned_to)}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {entries.length === 0 && <p className="text-sm text-muted">{t("empty")}</p>}
    </div>
  );
}
