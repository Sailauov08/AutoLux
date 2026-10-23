import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Badge, Empty, FilterBar, filterButton, filterInput, filterLabel, Pagination, Panel, Table, td, th } from "@/components/admin/admin-ui";
import { LeadCreateForm } from "@/components/admin/crm-controls";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getStaffDirectory, listLeads, param, toPage, vehicleOptions } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { LEAD_SOURCES, LEAD_STAGES } from "@/lib/domain";
import { formatDate, formatDateTime, isPast } from "@/lib/format";

export default async function LeadsPage({ params, searchParams }: PageProps<"/[locale]/admin/leads">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["leads.read_all", "leads.read_own"]);
  const query = await searchParams;
  const filters = {
    q: param(query.q),
    stage: (LEAD_STAGES as readonly string[]).includes(param(query.stage)) ? param(query.stage) : "",
    source: (LEAD_SOURCES as readonly string[]).includes(param(query.source)) ? param(query.source) : "",
    assignee: /^([0-9a-f-]{36}|none)$/.test(param(query.assignee)) ? param(query.assignee) : "",
  };
  const showAll = staff.can("leads.read_all");
  const [t, tc, tStage, dealership, directory, list, vehicles] = await Promise.all([
    getTranslations("admin.leads"),
    getTranslations("admin.common"),
    getTranslations("statuses.stage"),
    getDealership(),
    getStaffDirectory(staff.dealershipId),
    listLeads(staff.dealershipId, { ...filters, page: toPage(query.page), open: !filters.stage }),
    staff.can("leads.create") ? vehicleOptions(staff.dealershipId, ["available", "reserved"]) : Promise.resolve([]),
  ]);
  const names = new Map(directory.map((member) => [member.user_id, member.full_name]));

  return (
    <div className="space-y-6">
      <AdminHeader title={t("title")} description={showAll ? undefined : t("ownOnly")} />

      {staff.can("leads.create") && (
        <details className="border border-line bg-card">
          <summary className="cursor-pointer px-5 py-4 text-[11px] tracking-[0.2em] uppercase hover:text-accent">{t("newLead")}</summary>
          <div className="border-t border-line p-5">
            <LeadCreateForm
              vehicles={vehicles.map((v) => ({ id: v.id, label: `${v.year} ${v.make} ${v.model}` }))}
              staff={directory.map((member) => ({ id: member.user_id, label: member.full_name }))}
              canAssign={staff.can("leads.assign")}
            />
          </div>
        </details>
      )}

      <FilterBar>
        <label className={filterLabel}>
          {tc("search")}
          <input name="q" defaultValue={filters.q} placeholder={t("search")} className={`${filterInput} w-56`} />
        </label>
        <label className={filterLabel}>
          {t("stage")}
          <select name="stage" defaultValue={filters.stage} className={filterInput}>
            <option value="">{t("openStages")}</option>
            {LEAD_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {tStage(stage)}
              </option>
            ))}
          </select>
        </label>
        <label className={filterLabel}>
          {t("source")}
          <select name="source" defaultValue={filters.source} className={filterInput}>
            <option value="">{tc("all")}</option>
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {t(`sources.${source}`)}
              </option>
            ))}
          </select>
        </label>
        {showAll && (
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
        )}
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
                <th className={th}>{tc("customer")}</th>
                <th className={th}>{t("stage")}</th>
                <th className={th}>{tc("vehicle")}</th>
                <th className={th}>{t("source")}</th>
                <th className={th}>{tc("assignee")}</th>
                <th className={th}>{t("followUp")}</th>
                <th className={th}>{tc("created")}</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((lead) => {
                const overdue = isPast(lead.follow_up_at);
                return (
                  <tr key={lead.id}>
                    <td className={td}>
                      <Link href={`/admin/leads/${lead.id}`} className="font-medium hover:text-accent">
                        {lead.customer?.full_name}
                      </Link>
                      <span className="block text-xs text-muted">{lead.customer?.phone ?? lead.customer?.email}</span>
                    </td>
                    <td className={td}>
                      <Badge tone={lead.stage}>{tStage(lead.stage)}</Badge>
                    </td>
                    <td className={td}>{lead.vehicle ? `${lead.vehicle.make} ${lead.vehicle.model}` : "—"}</td>
                    <td className={td}>{t(`sources.${lead.source}`)}</td>
                    <td className={td}>{lead.assigned_to ? names.get(lead.assigned_to) ?? "—" : <span className="text-accent">{tc("unassigned")}</span>}</td>
                    <td className={`${td} tabular-nums ${overdue ? "text-red-600 dark:text-red-400" : ""}`}>{lead.follow_up_at ? formatDateTime(lead.follow_up_at, dealership.timezone) : "—"}</td>
                    <td className={`${td} tabular-nums text-muted`}>{formatDate(lead.created_at, dealership.timezone)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination page={list.page} pages={list.pages} total={list.total} pathname="/admin/leads" query={Object.fromEntries(Object.entries(filters).filter(([, value]) => value))} />
      </Panel>
    </div>
  );
}
