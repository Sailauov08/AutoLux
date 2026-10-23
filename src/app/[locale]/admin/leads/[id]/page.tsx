import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActivityForm, AssignSelect, LeadEditor, SaleForm } from "@/components/admin/crm-controls";
import { AdminHeader, Badge, KeyValues, Panel } from "@/components/admin/admin-ui";
import { TaskForm, TaskList } from "@/components/admin/task-controls";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getLead, getStaffDirectory, vehicleOptions } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { isRequestKind, REQUEST_KINDS } from "@/lib/domain";
import { formatDateTime, formatPrice, localDateKey, toDateTimeLocal } from "@/lib/format";

export default async function LeadPage({ params }: PageProps<"/[locale]/admin/leads/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["leads.read_all", "leads.read_own"]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getLead(id);
  if (!data) notFound();
  const { lead, activities, tasks, sale } = data;
  const [t, tc, tStage, tNav, dealership, directory, vehicles] = await Promise.all([
    getTranslations("admin.leads"),
    getTranslations("admin.common"),
    getTranslations("statuses.stage"),
    getTranslations("admin.nav"),
    getDealership(),
    getStaffDirectory(staff.dealershipId),
    vehicleOptions(staff.dealershipId, ["available", "reserved"]),
  ]);
  const tz = dealership.timezone;
  const names = Object.fromEntries(directory.map((member) => [member.user_id, member.full_name]));
  const staffOptions = directory.map((member) => ({ id: member.user_id, label: member.full_name }));
  const vehicleList = vehicles.map((v) => ({ id: v.id, label: `${v.year} ${v.make} ${v.model}` }));
  if (lead.vehicle && !vehicleList.some((v) => v.id === lead.vehicle?.id)) {
    vehicleList.unshift({ id: lead.vehicle.id, label: `${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` });
  }
  const closed = lead.stage === "won" || lead.stage === "lost";

  const describe = (activity: (typeof activities)[number]) => {
    const meta = activity.meta as Record<string, string | null>;
    if (activity.kind === "stage_change") return `${tStage(meta.from ?? "new")} → ${tStage(meta.to ?? "new")}`;
    if (activity.kind === "assignment") return meta.to ? names[meta.to] ?? "—" : tc("unassigned");
    if (activity.kind === "follow_up" && meta.at) return formatDateTime(meta.at, tz);
    if (activity.kind === "request" && meta.kind && isRequestKind(meta.kind)) return `${tNav(meta.kind)} · ${meta.reference ?? ""}`;
    if (activity.kind === "sale" && meta.price) return formatPrice(Number(meta.price));
    return null;
  };

  return (
    <div className="space-y-8">
      <AdminHeader eyebrow={t("title")} title={lead.customer?.full_name ?? "—"}>
        <Badge tone={lead.stage}>{tStage(lead.stage)}</Badge>
        {lead.customer && (staff.can("customers.read") || lead.assigned_to === staff.user.id) && (
          <Link href={`/admin/customers/${lead.customer.id}`} className="text-[11px] tracking-[0.18em] uppercase underline underline-offset-4">
            {t("openCustomer")}
          </Link>
        )}
      </AdminHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel title={t("details")}>
            <KeyValues
              items={[
                [tc("phone"), lead.customer?.phone ? <a href={`tel:${lead.customer.phone}`}>{lead.customer.phone}</a> : null],
                [tc("email"), lead.customer?.email ? <a href={`mailto:${lead.customer.email}`}>{lead.customer.email}</a> : null],
                [t("source"), t(`sources.${lead.source}`)],
                [tc("created"), formatDateTime(lead.created_at, tz)],
                [tc("vehicle"), lead.vehicle ? `${lead.vehicle.year} ${lead.vehicle.make} ${lead.vehicle.model}` : null],
                [t("closedAt"), lead.closed_at ? formatDateTime(lead.closed_at, tz) : null],
              ]}
            />
            {lead.request_kind && lead.request_id && isRequestKind(lead.request_kind) && (
              <Link href={`/admin/requests/${REQUEST_KINDS[lead.request_kind].slug}/${lead.request_id}`} className="mt-4 inline-block text-xs underline underline-offset-4">
                {t("originalRequest", { kind: tNav(lead.request_kind) })}
              </Link>
            )}
          </Panel>

          {staff.can("leads.update") && (
            <Panel title={t("pipelineTitle")}>
              <LeadEditor
                lead={{ id: lead.id, version: lead.version, stage: lead.stage, vehicleId: lead.vehicle?.id ?? null, negotiationPrice: lead.negotiation_price, lostReason: lead.lost_reason }}
                vehicles={vehicleList}
                followUpLocal={toDateTimeLocal(lead.follow_up_at, tz)}
              />
            </Panel>
          )}

          {sale ? (
            <Panel title={t("saleLinked")}>
              <Link href={`/admin/sales/${sale.id}`} className="text-sm hover:text-accent">
                {sale.reference} · {formatPrice(sale.agreed_price)} · {sale.sale_date}
              </Link>
            </Panel>
          ) : (
            staff.can("sales.create") &&
            !closed &&
            lead.customer && (
              <Panel title={t("recordSale")}>
                <SaleForm
                  vehicles={vehicleList.filter((v) => vehicles.some((item) => item.id === v.id))}
                  customers={[]}
                  staff={staffOptions}
                  defaults={{ vehicleId: lead.vehicle?.id, customerId: lead.customer.id, leadId: lead.id, salespersonId: lead.assigned_to ?? staff.user.id, price: lead.negotiation_price }}
                  today={localDateKey(new Date().toISOString(), tz)}
                />
              </Panel>
            )
          )}

          <Panel title={t("activity")}>
            {staff.can("leads.update") && (
              <div className="mb-6 border-b border-line pb-6">
                <ActivityForm leadId={lead.id} />
              </div>
            )}
            <ol className="space-y-4">
              {activities.map((activity) => {
                const detail = describe(activity);
                return (
                  <li key={activity.id} className="border-l-2 border-line pl-4 text-sm">
                    <p className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-accent">{t(`activityKinds.${activity.kind}`)}</span>
                      <span className="text-xs text-muted tabular-nums">
                        {formatDateTime(activity.created_at, tz)}
                        {activity.actor_id && names[activity.actor_id] ? ` · ${names[activity.actor_id]}` : ""}
                      </span>
                    </p>
                    {detail && <p className="mt-1 text-muted">{detail}</p>}
                    {activity.body && <p className="mt-1 whitespace-pre-line">{activity.body}</p>}
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={tc("assignee")}>
            {staff.can("leads.assign") ? (
              <AssignSelect id={lead.id} assignee={lead.assigned_to} staff={staffOptions} />
            ) : (
              <p className="text-sm">{lead.assigned_to ? names[lead.assigned_to] ?? "—" : tc("unassigned")}</p>
            )}
          </Panel>
          <Panel title={t("tasks")}>
            <TaskList tasks={tasks} timeZone={tz} names={names} />
            <div className="mt-5 border-t border-line pt-5">
              <TaskForm staff={staffOptions.map((member) => ({ id: member.id, name: member.label }))} leadId={lead.id} canAssign={staff.can("tasks.manage")} selfId={staff.user.id} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
