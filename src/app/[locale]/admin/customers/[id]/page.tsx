import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnonymizeButton, CustomerEditor } from "@/components/admin/crm-controls";
import { AdminHeader, Badge, Empty, KeyValues, Panel } from "@/components/admin/admin-ui";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getCustomer } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { REQUEST_KINDS } from "@/lib/domain";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";

export default async function CustomerPage({ params }: PageProps<"/[locale]/admin/customers/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["customers.read", "leads.read_own"]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getCustomer(id);
  if (!data) notFound();
  const { customer, leads, sales, requests } = data;
  const [t, tc, tStage, tStatus, tSale, tNav, tLang, dealership] = await Promise.all([
    getTranslations("admin.customers"),
    getTranslations("admin.common"),
    getTranslations("statuses.stage"),
    getTranslations("statuses.request"),
    getTranslations("admin.sales.statuses"),
    getTranslations("admin.nav"),
    getTranslations("account.languages"),
    getDealership(),
  ]);
  const tz = dealership.timezone;
  const anonymized = Boolean(customer.anonymized_at);

  return (
    <div className="space-y-8">
      <AdminHeader eyebrow={t("title")} title={customer.full_name}>
        {anonymized && <Badge tone="archived">{t("anonymized", { date: formatDate(customer.anonymized_at!, tz) })}</Badge>}
      </AdminHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Panel title={t("profile")}>
            {staff.can("customers.update") && !anonymized ? (
              <CustomerEditor
                customer={{ id: customer.id, version: customer.version, fullName: customer.full_name, email: customer.email, phone: customer.phone, locale: customer.locale, notes: customer.notes }}
              />
            ) : (
              <KeyValues
                items={[
                  [tc("email"), customer.email],
                  [tc("phone"), customer.phone],
                  [t("language"), tLang(customer.locale as "kk")],
                  [tc("notes"), customer.notes],
                ]}
              />
            )}
            <p className="mt-5 text-xs text-muted">
              {customer.privacy_consent_at ? t("consentAt", { date: formatDateTime(customer.privacy_consent_at, tz) }) : t("noConsent")}
              {customer.user_id ? ` · ${t("linkedAccount")}` : ""}
            </p>
          </Panel>

          <Panel title={t("requests")}>
            {requests.length === 0 ? (
              <Empty>{t("noRequests")}</Empty>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {requests
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((request) => (
                    <li key={`${request.kind}-${request.id}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                      <Link href={`/admin/requests/${REQUEST_KINDS[request.kind].slug}/${request.id}`} className="hover:text-accent">
                        {tNav(request.kind)} · {request.reference}
                      </Link>
                      <span className="flex items-center gap-3 text-xs text-muted">
                        <Badge tone={request.status}>{tStatus(request.status)}</Badge>
                        {formatDate(request.created_at, tz)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t("leads")}>
            {leads.length === 0 ? (
              <Empty>{t("noLeads")}</Empty>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {leads.map((lead) => (
                  <li key={lead.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                    <Link href={`/admin/leads/${lead.id}`} className="hover:text-accent">
                      {lead.vehicle ? `${lead.vehicle.make} ${lead.vehicle.model}` : t("generalLead")}
                    </Link>
                    <Badge tone={lead.stage}>{tStage(lead.stage)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {(staff.can("sales.read") || sales.length > 0) && (
            <Panel title={t("sales")}>
              {sales.length === 0 ? (
                <Empty>{t("noSales")}</Empty>
              ) : (
                <ul className="divide-y divide-line text-sm">
                  {sales.map((sale) => (
                    <li key={sale.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                      <Link href={`/admin/sales/${sale.id}`} className="hover:text-accent">
                        {sale.vehicle ? `${sale.vehicle.make} ${sale.vehicle.model}` : sale.reference}
                      </Link>
                      <span className="text-xs text-muted tabular-nums">
                        {formatPrice(sale.agreed_price)} · {tSale(sale.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          {staff.can("customers.delete") && !anonymized && (
            <Panel title={t("privacy")} description={t("privacyHint")}>
              <AnonymizeButton customerId={customer.id} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
