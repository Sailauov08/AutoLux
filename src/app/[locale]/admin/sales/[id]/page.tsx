import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SaleActions } from "@/components/admin/crm-controls";
import { AdminHeader, Badge, KeyValues, Panel } from "@/components/admin/admin-ui";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getSale, getStaffDirectory } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

type Change = { from?: unknown; to?: unknown };

export default async function SalePage({ params }: PageProps<"/[locale]/admin/sales/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["sales.read", "sales.create"]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getSale(id);
  if (!data) notFound();
  const { sale, events } = data;
  const [t, tc, dealership, directory] = await Promise.all([
    getTranslations("admin.sales"),
    getTranslations("admin.common"),
    getDealership(),
    getStaffDirectory(staff.dealershipId),
  ]);
  const tz = dealership.timezone;
  const names = Object.fromEntries(directory.map((member) => [member.user_id, member.full_name]));
  const describe = (changes: Record<string, unknown>) =>
    Object.entries(changes)
      .filter(([, value]) => typeof value === "object" && value !== null && (value as Change).from !== (value as Change).to)
      .map(([key, value]) => {
        const change = value as Change;
        const render = (raw: unknown) => (key === "price" ? formatMoney(Number(raw), sale.currency) : key === "salesperson" ? names[String(raw)] ?? "—" : String(raw ?? "—"));
        return `${t(`fields.${key}`)}: ${render(change.from)} → ${render(change.to)}`;
      });

  return (
    <div className="space-y-8">
      <AdminHeader eyebrow={t("title")} title={sale.reference}>
        <Badge tone={sale.status}>{t(`statuses.${sale.status}`)}</Badge>
      </AdminHeader>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <Panel title={t("details")}>
            <KeyValues
              items={[
                [
                  tc("vehicle"),
                  sale.vehicle ? (
                    staff.can("inventory.read") ? (
                      <Link href={`/admin/inventory/${sale.vehicle.id}`} className="hover:text-accent">
                        {sale.vehicle.year} {sale.vehicle.make} {sale.vehicle.model}
                      </Link>
                    ) : (
                      `${sale.vehicle.year} ${sale.vehicle.make} ${sale.vehicle.model}`
                    )
                  ) : null,
                ],
                [
                  tc("customer"),
                  sale.customer ? (
                    <Link href={`/admin/customers/${sale.customer.id}`} className="hover:text-accent">
                      {sale.customer.full_name}
                    </Link>
                  ) : null,
                ],
                [t("price"), formatMoney(sale.agreed_price, sale.currency)],
                [t("date"), formatDate(sale.sale_date, tz)],
                [t("salesperson"), sale.salesperson_id ? names[sale.salesperson_id] : null],
                [t("lead"), sale.lead_id ? <Link href={`/admin/leads/${sale.lead_id}`} className="hover:text-accent">{t("openLead")}</Link> : null],
                [tc("notes"), sale.notes],
                [t("cancelReason"), sale.cancel_reason],
              ]}
            />
          </Panel>
          <Panel title={t("events")}>
            <ol className="space-y-4">
              {events.map((event) => (
                <li key={event.id} className="border-l-2 border-line pl-4 text-sm">
                  <p className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-accent">{t(`eventKinds.${event.kind}`)}</span>
                    <span className="text-xs text-muted tabular-nums">
                      {formatDateTime(event.created_at, tz)}
                      {event.actor_id && names[event.actor_id] ? ` · ${names[event.actor_id]}` : ""}
                    </span>
                  </p>
                  {event.reason && <p className="mt-1">{event.reason}</p>}
                  {event.kind === "corrected" && describe(event.changes).map((line) => <p key={line} className="mt-1 text-xs text-muted">{line}</p>)}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        {(staff.can("sales.update") || staff.can("sales.cancel")) && (
          <Panel title={t("manage")}>
            <SaleActions
              sale={{ id: sale.id, version: sale.version, status: sale.status, price: sale.agreed_price, saleDate: sale.sale_date, salespersonId: sale.salesperson_id, notes: sale.notes }}
              staff={directory.map((member) => ({ id: member.user_id, label: member.full_name }))}
              canUpdate={staff.can("sales.update")}
              canCancel={staff.can("sales.cancel")}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
