import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Empty, FilterBar, filterButton, filterInput, filterLabel, Pagination, Panel, Table, td, th } from "@/components/admin/admin-ui";
import { requireStaff } from "@/lib/auth/session";
import { listAudit, param, staffNames, toPage } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { formatDateTime } from "@/lib/format";

const ENTITIES = ["vehicles", "vehicle_media", "vehicle_private", "price_change_requests", "sales", "reservations", "memberships", "role_permissions", "staff_invitations", "dealerships", "customers"];
const ACTIONS = ["insert", "update", "delete", "denied", "anonymize"];
const HIDDEN = new Set(["description", "vin"]);

function summarize(changes: Record<string, unknown>, action: string) {
  if (action === "denied") return String((changes as { detail?: string }).detail ?? "");
  if (action !== "update") return "";
  return Object.entries(changes)
    .filter(([key]) => !HIDDEN.has(key))
    .slice(0, 6)
    .map(([key, value]) => {
      const change = value as { from?: unknown; to?: unknown };
      const show = (raw: unknown) => (typeof raw === "object" && raw !== null ? "…" : String(raw ?? "∅"));
      return `${key}: ${show(change.from)} → ${show(change.to)}`;
    })
    .join("; ");
}

export default async function AuditPage({ params, searchParams }: PageProps<"/[locale]/admin/audit">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, "audit.read");
  const query = await searchParams;
  const filters = {
    entity: ENTITIES.includes(param(query.entity)) ? param(query.entity) : "",
    action: ACTIONS.includes(param(query.action)) ? param(query.action) : "",
  };
  const [t, tc, dealership, names, list] = await Promise.all([
    getTranslations("admin.audit"),
    getTranslations("admin.common"),
    getDealership(),
    staffNames(staff.dealershipId),
    listAudit(staff.dealershipId, { ...filters, page: toPage(query.page) }),
  ]);

  return (
    <div className="space-y-6">
      <AdminHeader title={t("title")} description={t("description")} />
      <FilterBar>
        <label className={filterLabel}>
          {t("entity")}
          <select name="entity" defaultValue={filters.entity} className={filterInput}>
            <option value="">{tc("all")}</option>
            {ENTITIES.map((entity) => (
              <option key={entity} value={entity}>
                {t(`entities.${entity}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={filterLabel}>
          {t("action")}
          <select name="action" defaultValue={filters.action} className={filterInput}>
            <option value="">{tc("all")}</option>
            {ACTIONS.map((action) => (
              <option key={action} value={action}>
                {t(`actions.${action}`)}
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
          <Table minWidth={820}>
            <thead>
              <tr>
                <th className={th}>{t("when")}</th>
                <th className={th}>{t("actor")}</th>
                <th className={th}>{t("action")}</th>
                <th className={th}>{t("entity")}</th>
                <th className={th}>{t("changes")}</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((row) => (
                <tr key={row.id}>
                  <td className={`${td} whitespace-nowrap tabular-nums`}>{formatDateTime(row.created_at, dealership.timezone)}</td>
                  <td className={td}>{row.actor_id ? names.get(row.actor_id) ?? t("formerStaff") : t("system")}</td>
                  <td className={`${td} ${row.action === "denied" ? "text-red-600 dark:text-red-400" : ""}`}>{t.has(`actions.${row.action}`) ? t(`actions.${row.action}`) : row.action}</td>
                  <td className={td}>{t.has(`entities.${row.entity}`) ? t(`entities.${row.entity}`) : row.entity}</td>
                  <td className={`${td} max-w-md break-words text-xs text-muted`}>{summarize(row.changes, row.action)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={list.page} pages={list.pages} total={list.total} pathname="/admin/audit" query={Object.fromEntries(Object.entries(filters).filter(([, value]) => value))} />
      </Panel>
    </div>
  );
}
