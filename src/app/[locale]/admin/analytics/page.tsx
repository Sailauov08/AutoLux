import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Empty, FilterBar, filterButton, filterInput, filterLabel, Panel, Stat, StatGrid, Table, td, th } from "@/components/admin/admin-ui";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getMetrics, param } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { LEAD_STAGES } from "@/lib/domain";
import { dayKeyAgo, formatMoney, fromDateTimeLocal } from "@/lib/format";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[minmax(6rem,10rem)_1fr_3rem] items-center gap-3 text-sm">
          <span className="truncate text-muted">{row.label}</span>
          <span className="h-2 bg-mist" aria-hidden>
            <span className="block h-full bg-champagne" style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function AnalyticsPage({ params, searchParams }: PageProps<"/[locale]/admin/analytics">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, "analytics.read");
  const dealership = await getDealership();
  const tz = dealership.timezone;
  const query = await searchParams;
  const today = dayKeyAgo(0, tz);
  const defaultFrom = dayKeyAgo(29, tz);
  const from = DATE.test(param(query.from)) ? param(query.from) : defaultFrom;
  const to = DATE.test(param(query.to)) && param(query.to) >= from ? param(query.to) : today;
  const [t, tc, tStage, tStatus, tSources, tRoles, metrics] = await Promise.all([
    getTranslations("admin.analytics"),
    getTranslations("admin.common"),
    getTranslations("statuses.stage"),
    getTranslations("statuses.request"),
    getTranslations("admin.leads.sources"),
    getTranslations("roles"),
    getMetrics(staff.dealershipId, new Date(fromDateTimeLocal(`${from}T00:00`, tz)), new Date(fromDateTimeLocal(`${to}T23:59`, tz))),
  ]);
  const money = (value: number | null) => (value == null ? "—" : formatMoney(value, dealership.currency));
  const conversion = metrics.leads.total ? `${Math.round((metrics.leads.won / metrics.leads.total) * 1000) / 10}%` : "—";
  const statusRows = (record: Record<string, number>) => Object.entries(record).map(([status, value]) => ({ label: tStatus(status), value }));

  return (
    <div className="space-y-8">
      <AdminHeader title={t("title")} description={t("note")} />
      <FilterBar>
        <label className={filterLabel}>
          {tc("from")}
          <input type="date" name="from" defaultValue={from} max={today} className={filterInput} />
        </label>
        <label className={filterLabel}>
          {tc("to")}
          <input type="date" name="to" defaultValue={to} max={today} className={filterInput} />
        </label>
        <button type="submit" className={filterButton}>
          {tc("apply")}
        </button>
        <span className="flex gap-3 pb-2 text-xs">
          {[30, 90, 365].map((days) => (
            <Link
              key={days}
              href={{ pathname: "/admin/analytics", query: { from: dayKeyAgo(days - 1, tz), to: today } }}
              className="underline underline-offset-4 hover:text-accent"
            >
              {t("lastDays", { days })}
            </Link>
          ))}
        </span>
      </FilterBar>
      {!metrics.financial && <p className="text-xs text-muted">{t("financialHidden")}</p>}

      <section className="space-y-4">
        <h2 className="eyebrow">{t("inventory")}</h2>
        <StatGrid>
          <Stat label={t("active")} value={metrics.inventory.active} />
          <Stat label={t("draft")} value={metrics.inventory.draft} />
          <Stat label={t("turnover")} value={metrics.turnoverDays ?? "—"} hint={t("turnoverHint")} />
          {metrics.financial && <Stat label={t("stockValue")} value={money(metrics.inventory.value)} hint={t("stockValueHint")} />}
        </StatGrid>
        <Panel title={t("aging")}>
          <Bars rows={(["d0_30", "d31_60", "d61_90", "d90_plus"] as const).map((key) => ({ label: t(`agingBuckets.${key}`), value: metrics.inventory.aging[key] }))} />
        </Panel>
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow">{t("salesSection")}</h2>
        <StatGrid>
          <Stat label={t("salesCompleted")} value={metrics.sales.completed} />
          <Stat label={t("salesPending")} value={metrics.sales.pending} />
          <Stat label={t("salesCancelled")} value={metrics.sales.cancelled} />
          {metrics.financial && <Stat label={t("salesValue")} value={money(metrics.sales.value)} hint={t("salesValueHint")} />}
          {metrics.financial && <Stat label={t("averageSale")} value={money(metrics.sales.average)} />}
          <Stat label={t("conversion")} value={conversion} hint={t("conversionHint")} />
        </StatGrid>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title={t("funnel")}>
          {metrics.leads.total === 0 ? (
            <Empty>{t("noData")}</Empty>
          ) : (
            <Bars rows={LEAD_STAGES.map((stage) => ({ label: tStage(stage), value: metrics.leads.byStage[stage] ?? 0 }))} />
          )}
        </Panel>
        <Panel title={t("leadsBySource")}>
          {metrics.leads.total === 0 ? (
            <Empty>{t("noData")}</Empty>
          ) : (
            <Bars rows={Object.entries(metrics.leads.bySource).sort((a, b) => b[1] - a[1]).map(([source, value]) => ({ label: tSources(source), value }))} />
          )}
        </Panel>
        <Panel title={t("testDrives")}>
          {Object.keys(metrics.appointments.testDrives).length === 0 ? <Empty>{t("noData")}</Empty> : <Bars rows={statusRows(metrics.appointments.testDrives)} />}
        </Panel>
        <Panel title={t("reservations")}>
          {Object.keys(metrics.reservations).length === 0 ? <Empty>{t("noData")}</Empty> : <Bars rows={statusRows(metrics.reservations)} />}
        </Panel>
        <Panel title={t("service")}>
          {Object.keys(metrics.appointments.service).length === 0 ? <Empty>{t("noData")}</Empty> : <Bars rows={statusRows(metrics.appointments.service)} />}
        </Panel>
        <Panel title={t("requests")}>
          <Bars
            rows={[
              { label: t("requestKinds.inquiry"), value: metrics.requests.inquiry },
              { label: t("requestKinds.financing"), value: metrics.requests.financing },
              { label: t("requestKinds.trade_in"), value: metrics.requests.trade_in },
            ]}
          />
        </Panel>
      </div>

      <Panel title={t("popular")} description={t("popularHint")}>
        {metrics.popularVehicles.length === 0 ? (
          <Empty>{t("noData")}</Empty>
        ) : (
          <Bars rows={metrics.popularVehicles.map((vehicle) => ({ label: `${vehicle.year} ${vehicle.name}`, value: vehicle.interest }))} />
        )}
      </Panel>

      <Panel title={t("team")}>
        {metrics.team.length === 0 ? (
          <Empty>{t("noData")}</Empty>
        ) : (
          <Table minWidth={620}>
            <thead>
              <tr>
                <th className={th}>{t("teamMember")}</th>
                <th className={`${th} text-right`}>{t("teamLeads")}</th>
                <th className={`${th} text-right`}>{t("teamWon")}</th>
                <th className={`${th} text-right`}>{t("teamSales")}</th>
                {metrics.financial && <th className={`${th} text-right`}>{t("teamValue")}</th>}
              </tr>
            </thead>
            <tbody>
              {metrics.team.map((member) => (
                <tr key={member.userId}>
                  <td className={td}>
                    {member.name}
                    <span className="block text-xs text-muted">{tRoles(member.role)}</span>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{member.leads}</td>
                  <td className={`${td} text-right tabular-nums`}>{member.won}</td>
                  <td className={`${td} text-right tabular-nums`}>{member.sales}</td>
                  {metrics.financial && <td className={`${td} text-right tabular-nums`}>{money(member.value)}</td>}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
