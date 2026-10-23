import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Badge, Empty, FilterBar, filterButton, filterInput, filterLabel, Pagination, Panel, Table, td, th } from "@/components/admin/admin-ui";
import { Link } from "@/i18n/navigation";
import type { Permission } from "@/lib/auth/permissions";
import { requireStaff } from "@/lib/auth/session";
import { getStaffDirectory, listRequests, param, toPage } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { REQUEST_KINDS, REQUEST_STATUSES, requestKindFromSlug } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";

export default async function RequestsPage({ params, searchParams }: PageProps<"/[locale]/admin/requests/[kind]">) {
  const { locale, kind: slug } = await params;
  setRequestLocale(locale);
  const kind = requestKindFromSlug(slug);
  if (!kind) notFound();
  const config = REQUEST_KINDS[kind];
  const staff = await requireStaff(locale, `${config.permission}.read` as Permission);
  const query = await searchParams;
  const filters = {
    status: (REQUEST_STATUSES as readonly string[]).includes(param(query.status)) ? param(query.status) : "",
    assignee: /^([0-9a-f-]{36}|none)$/.test(param(query.assignee)) ? param(query.assignee) : "",
  };
  const [t, tc, tNav, tStatus, dealership, directory, list] = await Promise.all([
    getTranslations("admin.requests"),
    getTranslations("admin.common"),
    getTranslations("admin.nav"),
    getTranslations("statuses.request"),
    getDealership(),
    getStaffDirectory(staff.dealershipId),
    listRequests(staff.dealershipId, kind, { ...filters, page: toPage(query.page) }),
  ]);
  const names = new Map(directory.map((member) => [member.user_id, member.full_name]));
  const tz = dealership.timezone;
  const subject = (row: (typeof list.rows)[number]) => {
    if (row.vehicle) return `${row.vehicle.year} ${row.vehicle.make} ${row.vehicle.model}`;
    if (kind === "trade_in") return `${row.year} ${row.make} ${row.model}`;
    if (kind === "service") return `${row.vehicle_description} · ${t(`serviceTypes.${row.service_type}`)}`;
    if (kind === "inquiry") return t(`topics.${row.topic}`);
    return "—";
  };

  return (
    <div className="space-y-6">
      <AdminHeader eyebrow={tNav("requests")} title={tNav(kind)} description={config.appointment ? t("appointmentHint", { zone: tz }) : undefined} />
      <FilterBar>
        <label className={filterLabel}>
          {tc("status")}
          <select name="status" defaultValue={filters.status} className={filterInput}>
            <option value="">{t("allOpen")}</option>
            {REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {tStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <label className={filterLabel}>
          {tc("assignee")}
          <select name="assignee" defaultValue={filters.assignee} className={filterInput}>
            <option value="">{tc("all")}</option>
            <option value="none">{tc("unassigned")}</option>
            {directory.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.full_name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={filterButton}>
          {tc("apply")}
        </button>
      </FilterBar>
      <Panel>
        {list.rows.length === 0 ? (
          <Empty>{t("empty")}</Empty>
        ) : (
          <Table minWidth={760}>
            <thead>
              <tr>
                <th className={th}>{config.appointment ? t("when") : t("received")}</th>
                <th className={th}>{tc("customer")}</th>
                <th className={th}>{t("subject")}</th>
                <th className={th}>{tc("status")}</th>
                <th className={th}>{tc("assignee")}</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((row) => (
                <tr key={row.id}>
                  <td className={`${td} tabular-nums`}>
                    <Link href={`/admin/requests/${slug}/${row.id}`} className="hover:text-accent">
                      {formatDateTime(row.starts_at ?? row.created_at, tz)}
                    </Link>
                    <span className="block text-xs text-muted">{row.reference}</span>
                  </td>
                  <td className={td}>
                    {row.contact?.name ?? "—"}
                    <span className="block text-xs text-muted">{row.contact?.phone ?? row.contact?.email}</span>
                  </td>
                  <td className={td}>{subject(row)}</td>
                  <td className={td}>
                    <Badge tone={row.status}>{tStatus(row.status)}</Badge>
                  </td>
                  <td className={td}>{row.assigned_to ? names.get(row.assigned_to) ?? "—" : <span className="text-accent">{tc("unassigned")}</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={list.page} pages={list.pages} total={list.total} pathname={`/admin/requests/${slug}`} query={Object.fromEntries(Object.entries(filters).filter(([, value]) => value))} />
      </Panel>
    </div>
  );
}
