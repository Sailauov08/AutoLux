import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Empty, Panel, Stat, StatGrid } from "@/components/admin/admin-ui";
import { TaskList } from "@/components/admin/task-controls";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getOverview, getRecentActivity, getUpcomingAppointments, listTasks } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { REQUEST_KINDS, type RequestKind } from "@/lib/domain";
import { formatDateTime, formatMoney } from "@/lib/format";

export default async function OverviewPage({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale);
  const dealership = await getDealership();
  const [t, tNav, tActivity, overview, tasks] = await Promise.all([
    getTranslations("admin.overview"),
    getTranslations("admin.nav"),
    getTranslations("admin.leads.activityKinds"),
    getOverview(staff.dealershipId),
    listTasks(staff.dealershipId, { scope: "mine", userId: staff.user.id, done: false }),
  ]);
  const canLeads = staff.can("leads.read_all") || staff.can("leads.read_own");
  const [activity, upcoming] = await Promise.all([
    canLeads ? getRecentActivity(staff.dealershipId, 10) : Promise.resolve([]),
    staff.can("bookings.read") ? getUpcomingAppointments(staff.dealershipId) : Promise.resolve(null),
  ]);
  const tz = dealership.timezone;
  const requestKinds = Object.keys(overview.requests) as RequestKind[];

  return (
    <div className="space-y-10">
      <AdminHeader eyebrow={dealership.name} title={t("title")} />

      {overview.inventory && (
        <section aria-labelledby="ov-stock">
          <h2 id="ov-stock" className="eyebrow mb-4">{t("inventory")}</h2>
          <StatGrid>
            <Stat label={t("available")} value={overview.inventory.available} href="/admin/inventory?status=available" />
            <Stat label={t("reserved")} value={overview.inventory.reserved} href="/admin/inventory?status=reserved" />
            <Stat label={t("sold")} value={overview.inventory.sold} href="/admin/inventory?status=sold" />
            <Stat label={t("draft")} value={overview.inventory.draft} href="/admin/inventory?status=draft" />
            <Stat label={t("unpublished")} value={overview.inventory.unpublishedAvailable} href="/admin/inventory?status=available&published=no" />
            {overview.pendingPrices !== undefined && <Stat label={t("pendingPrices")} value={overview.pendingPrices} href="/admin/prices" />}
          </StatGrid>
        </section>
      )}

      <section aria-labelledby="ov-work">
        <h2 id="ov-work" className="eyebrow mb-4">{t("today")}</h2>
        <StatGrid>
          {requestKinds.map((kind) => (
            <Stat key={kind} label={t("newRequests", { kind: tNav(kind) })} value={overview.requests[kind] ?? 0} href={`/admin/requests/${REQUEST_KINDS[kind].slug}?status=new`} />
          ))}
          {overview.upcomingTestDrives !== undefined && <Stat label={t("upcomingTestDrives")} value={overview.upcomingTestDrives} href="/admin/calendar" />}
          {overview.overdueFollowUps !== undefined && <Stat label={t("overdueFollowUps")} value={overview.overdueFollowUps} href="/admin/leads" />}
          {overview.unassignedLeads != null && <Stat label={t("unassignedLeads")} value={overview.unassignedLeads} href="/admin/leads?assignee=none" />}
          <Stat label={t("myTasks")} value={overview.myTasks.open} hint={overview.myTasks.overdue ? t("overdueTasks", { count: overview.myTasks.overdue }) : undefined} href="/admin/tasks" />
          {overview.salesThisMonth && (
            <Stat
              label={t("salesThisMonth")}
              value={overview.salesThisMonth.count}
              hint={[
                overview.salesThisMonth.pending ? t("pendingSales", { count: overview.salesThisMonth.pending }) : "",
                overview.salesThisMonth.value != null ? formatMoney(overview.salesThisMonth.value, dealership.currency) : "",
              ].filter(Boolean).join(" · ") || undefined}
              href="/admin/sales"
            />
          )}
        </StatGrid>
      </section>

      {overview.pipeline && (
        <Panel title={t("pipeline")}>
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {(["new", "contacted", "qualified", "negotiation"] as const).map((stage) => (
              <Link key={stage} href={`/admin/leads?stage=${stage}`} className="bg-card p-4 hover:bg-mist">
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted">{t(`stages.${stage}`)}</p>
                <p className="font-display mt-2 text-2xl tabular-nums">{overview.pipeline?.[stage] ?? 0}</p>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title={t("myTasksTitle")}>
          <TaskList tasks={tasks.slice(0, 8)} timeZone={tz} names={{}} compact />
        </Panel>

        {upcoming && (
          <Panel title={t("upcoming")}>
            {upcoming.testDrives.length + upcoming.service.length === 0 ? (
              <Empty>{t("noUpcoming")}</Empty>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {[
                  ...upcoming.testDrives.map((row) => ({ ...row, kind: "test_drive" as const, label: row.vehicle ? `${row.vehicle.make} ${row.vehicle.model}` : "" })),
                  ...upcoming.service.map((row) => ({ ...row, kind: "service" as const, label: row.service_type })),
                ]
                  .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                  .slice(0, 10)
                  .map((row) => (
                    <li key={row.id}>
                      <Link href={`/admin/requests/${REQUEST_KINDS[row.kind].slug}/${row.id}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3 hover:text-accent">
                        <span>
                          <span className="tabular-nums">{formatDateTime(row.starts_at, tz)}</span> · {row.contact?.name ?? row.reference}
                        </span>
                        <span className="text-xs text-muted">
                          {tNav(row.kind)} · {row.label}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      {canLeads && (
        <Panel title={t("recent")}>
          {activity.length === 0 ? (
            <Empty>{t("noActivity")}</Empty>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {activity.map((item) => (
                <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <span>
                    <span className="text-accent">{tActivity(item.kind)}</span>
                    {item.lead && (
                      <>
                        {" · "}
                        <Link href={`/admin/leads/${item.lead.id}`} className="hover:underline">
                          {item.lead.customer?.full_name}
                        </Link>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-muted tabular-nums">{formatDateTime(item.created_at, tz)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
