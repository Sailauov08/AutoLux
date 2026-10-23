import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Badge, KeyValues, Panel } from "@/components/admin/admin-ui";
import { RequestAssign, RequestNote, RescheduleForm, StatusControl } from "@/components/admin/request-controls";
import { Link } from "@/i18n/navigation";
import type { Permission } from "@/lib/auth/permissions";
import { requireStaff } from "@/lib/auth/session";
import { getRequest, getRolePermissions, getStaffDirectory } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { REQUEST_KINDS, requestKindFromSlug } from "@/lib/domain";
import { formatDateTime, formatPrice, localDateKey } from "@/lib/format";

export default async function RequestPage({ params }: PageProps<"/[locale]/admin/requests/[kind]/[id]">) {
  const { locale, kind: slug, id } = await params;
  setRequestLocale(locale);
  const kind = requestKindFromSlug(slug);
  if (!kind || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const config = REQUEST_KINDS[kind];
  const staff = await requireStaff(locale, `${config.permission}.read` as Permission);
  const data = await getRequest(kind, id);
  if (!data) notFound();
  const { request, events, lead } = data;
  const [t, tc, tNav, tStatus, tConditions, dealership, directory, rolePermissions] = await Promise.all([
    getTranslations("admin.requests"),
    getTranslations("admin.common"),
    getTranslations("admin.nav"),
    getTranslations("statuses.request"),
    getTranslations("forms.tradeInFields.conditions"),
    getDealership(),
    getStaffDirectory(staff.dealershipId),
    getRolePermissions(staff.dealershipId),
  ]);
  const tz = dealership.timezone;
  const names = Object.fromEntries(directory.map((member) => [member.user_id, member.full_name]));
  const canUpdate = staff.can(`${config.permission}.update` as Permission);
  const readPermission = `${config.permission}.read` as Permission;
  const assignable = directory
    .filter((member) => rolePermissions.get(member.role)?.has(readPermission))
    .map((member) => ({ id: member.user_id, label: member.full_name }));
  const r = request as Record<string, unknown>;

  const details: [string, React.ReactNode][] = [
    [tc("name"), request.contact?.name],
    [tc("phone"), request.contact?.phone ? <a href={`tel:${request.contact.phone}`}>{request.contact.phone}</a> : null],
    [tc("email"), request.contact?.email ? <a href={`mailto:${request.contact.email}`}>{request.contact.email}</a> : null],
    [t("received"), formatDateTime(request.created_at, tz)],
  ];
  if (request.starts_at) details.push([t("when"), formatDateTime(request.starts_at, tz)]);
  if (request.vehicle) details.push([tc("vehicle"), `${request.vehicle.year} ${request.vehicle.make} ${request.vehicle.model}`]);
  if (kind === "inquiry") details.push([t("topic"), t(`topics.${r.topic}`)], [t("message"), <span key="m" className="whitespace-pre-line">{String(r.message)}</span>]);
  if (kind === "financing")
    details.push([t("financing.price"), formatPrice(Number(r.vehicle_price))], [t("financing.down"), formatPrice(Number(r.down_payment))], [t("financing.term"), t("financing.months", { count: Number(r.term_months) })]);
  if (kind === "trade_in")
    details.push(
      [t("tradeIn.vehicle"), `${r.year} ${r.make} ${r.model}`],
      [t("tradeIn.mileage"), `${Number(r.mileage).toLocaleString("en-US").replace(/,/g, " ")} km`],
      [t("tradeIn.condition"), tConditions(String(r.condition))],
      [t("tradeIn.estimate"), `${formatPrice(Number(r.estimate_low))} – ${formatPrice(Number(r.estimate_high))}`],
    );
  if (kind === "service") details.push([t("service.vehicle"), String(r.vehicle_description)], [t("service.type"), t(`serviceTypes.${r.service_type}`)]);
  if (kind === "reservation" && r.hold_until) details.push([t("holdUntil"), formatDateTime(String(r.hold_until), tz)]);
  if ((kind === "test_drive" || kind === "service") && r.notes) details.push([tc("notes"), String(r.notes)]);
  if (kind === "reservation" && r.message) details.push([t("message"), String(r.message)]);

  return (
    <div className="space-y-8">
      <AdminHeader eyebrow={tNav(kind)} title={request.reference}>
        <Badge tone={request.status}>{tStatus(request.status)}</Badge>
        {lead && (staff.can("leads.read_all") || staff.can("leads.read_own")) && (
          <Link href={`/admin/leads/${lead.id}`} className="text-[11px] tracking-[0.18em] uppercase underline underline-offset-4">
            {t("openLead")}
          </Link>
        )}
      </AdminHeader>
      {request.status === "new" && config.appointment && <p className="border-l-2 border-champagne pl-4 text-sm text-muted">{t("notConfirmed")}</p>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel title={t("details")}>
            <KeyValues items={details} />
          </Panel>
          <Panel title={t("events")}>
            <ol className="space-y-4">
              {events.map((event) => (
                <li key={event.id} className="border-l-2 border-line pl-4 text-sm">
                  <p className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-accent">
                      {t(`eventKinds.${event.kind}`)}
                      {event.kind === "status" && event.to_status ? `: ${event.from_status ? `${tStatus(event.from_status)} → ` : ""}${tStatus(event.to_status)}` : ""}
                    </span>
                    <span className="text-xs text-muted tabular-nums">
                      {formatDateTime(event.created_at, tz)}
                      {event.actor_id && names[event.actor_id] ? ` · ${names[event.actor_id]}` : ""}
                    </span>
                  </p>
                  {event.kind === "assignment" ? (
                    <p className="mt-1 text-muted">{event.body ? names[event.body] ?? "—" : tc("unassigned")}</p>
                  ) : event.body === "hold_expired" ? (
                    <p className="mt-1 text-muted">{t("holdExpired")}</p>
                  ) : event.body === "customer" ? (
                    <p className="mt-1 text-muted">{t("byCustomer")}</p>
                  ) : (
                    event.body && <p className="mt-1 whitespace-pre-line">{event.body}</p>
                  )}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        {canUpdate && (
          <div className="space-y-6">
            <Panel title={tc("status")}>
              <StatusControl kind={kind} id={request.id} status={request.status} version={request.version} />
            </Panel>
            <Panel title={tc("assignee")}>
              <RequestAssign kind={kind} id={request.id} assignee={request.assigned_to} staff={assignable} />
            </Panel>
            {(kind === "test_drive" || kind === "service") && request.starts_at && ["new", "in_progress", "confirmed"].includes(request.status) && (
              <Panel title={t("reschedule")}>
                <RescheduleForm kind={kind} id={request.id} version={request.version} slots={dealership.bookingSlots} date={localDateKey(request.starts_at, tz)} />
              </Panel>
            )}
            <Panel title={t("notes")}>
              <RequestNote kind={kind} id={request.id} />
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
