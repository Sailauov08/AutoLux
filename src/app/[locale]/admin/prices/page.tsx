import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionButton } from "@/components/admin/admin-client";
import { AdminHeader, Empty, Table, td, th } from "@/components/admin/admin-ui";
import { Link } from "@/i18n/navigation";
import { decidePriceRequest } from "@/lib/actions/inventory";
import { requireStaff } from "@/lib/auth/session";
import { listPendingPriceRequests, staffNames } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { formatDateTime, formatPrice } from "@/lib/format";

export default async function PricesPage({ params }: PageProps<"/[locale]/admin/prices">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, "inventory.price_approve");
  const [t, dealership, rows, names] = await Promise.all([
    getTranslations("admin.prices"),
    getDealership(),
    listPendingPriceRequests(staff.dealershipId),
    staffNames(staff.dealershipId),
  ]);

  return (
    <div className="space-y-8">
      <AdminHeader title={t("title")} description={t("description")} />
      {rows.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th className={th}>{t("vehicle")}</th>
              <th className={th}>{t("change")}</th>
              <th className={th}>{t("reason")}</th>
              <th className={th}>{t("requestedBy")}</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const delta = row.proposed_price - row.current_price;
              return (
                <tr key={row.id}>
                  <td className={td}>
                    {row.vehicle && (
                      <Link href={`/admin/inventory/${row.vehicle.id}`} className="hover:text-accent">
                        {row.vehicle.year} {row.vehicle.make} {row.vehicle.model}
                      </Link>
                    )}
                  </td>
                  <td className={`${td} tabular-nums`}>
                    {formatPrice(row.current_price)} → <strong>{formatPrice(row.proposed_price)}</strong>
                    <span className={`block text-xs ${delta < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {delta > 0 ? "+" : "−"}
                      {formatPrice(Math.abs(delta))}
                    </span>
                  </td>
                  <td className={td}>{row.reason}</td>
                  <td className={td}>
                    {names.get(row.requested_by) ?? "—"}
                    <span className="block text-xs text-muted">{formatDateTime(row.created_at, dealership.timezone)}</span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <span className="flex gap-2">
                      <ActionButton variant="primary" action={decidePriceRequest.bind(null, row.id, true)}>
                        {t("approve")}
                      </ActionButton>
                      <ActionButton action={decidePriceRequest.bind(null, row.id, false)}>{t("reject")}</ActionButton>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
