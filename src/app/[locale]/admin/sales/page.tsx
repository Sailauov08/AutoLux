import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Badge, Empty, FilterBar, filterButton, filterInput, filterLabel, Pagination, Panel, Table, td, th } from "@/components/admin/admin-ui";
import { SaleForm } from "@/components/admin/crm-controls";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/session";
import { customerOptions, getStaffDirectory, listSales, param, toPage, vehicleOptions } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { SALE_STATUSES } from "@/lib/domain";
import { formatDate, formatMoney, localDateKey } from "@/lib/format";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function SalesPage({ params, searchParams }: PageProps<"/[locale]/admin/sales">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["sales.read", "sales.create"]);
  const query = await searchParams;
  const filters = {
    status: (SALE_STATUSES as readonly string[]).includes(param(query.status)) ? param(query.status) : "",
    from: DATE.test(param(query.from)) ? param(query.from) : "",
    to: DATE.test(param(query.to)) ? param(query.to) : "",
  };
  const canCreate = staff.can("sales.create");
  const [t, tc, dealership, directory, list, vehicles, customers] = await Promise.all([
    getTranslations("admin.sales"),
    getTranslations("admin.common"),
    getDealership(),
    getStaffDirectory(staff.dealershipId),
    listSales(staff.dealershipId, { ...filters, page: toPage(query.page) }),
    canCreate ? vehicleOptions(staff.dealershipId, ["available", "reserved"]) : Promise.resolve([]),
    canCreate ? customerOptions(staff.dealershipId) : Promise.resolve([]),
  ]);
  const names = new Map(directory.map((member) => [member.user_id, member.full_name]));
  const tz = dealership.timezone;

  return (
    <div className="space-y-6">
      <AdminHeader title={t("title")} description={t("revenueNote")} />

      {canCreate && (
        <details className="border border-line bg-card">
          <summary className="cursor-pointer px-5 py-4 text-[11px] tracking-[0.2em] uppercase hover:text-accent">{t("record")}</summary>
          <div className="border-t border-line p-5">
            <SaleForm
              vehicles={vehicles.map((v) => ({ id: v.id, label: `${v.year} ${v.make} ${v.model}` }))}
              customers={customers.map((c) => ({ id: c.id, label: [c.full_name, c.phone ?? c.email].filter(Boolean).join(" · ") }))}
              staff={directory.map((member) => ({ id: member.user_id, label: member.full_name }))}
              defaults={{ salespersonId: staff.user.id }}
              today={localDateKey(new Date().toISOString(), tz)}
            />
          </div>
        </details>
      )}

      <FilterBar>
        <label className={filterLabel}>
          {tc("status")}
          <select name="status" defaultValue={filters.status} className={filterInput}>
            <option value="">{tc("all")}</option>
            {SALE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`statuses.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={filterLabel}>
          {tc("from")}
          <input type="date" name="from" defaultValue={filters.from} className={filterInput} />
        </label>
        <label className={filterLabel}>
          {tc("to")}
          <input type="date" name="to" defaultValue={filters.to} className={filterInput} />
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
                <th className={th}>{t("date")}</th>
                <th className={th}>{tc("vehicle")}</th>
                <th className={th}>{tc("customer")}</th>
                <th className={th}>{t("salesperson")}</th>
                <th className={th}>{tc("status")}</th>
                <th className={`${th} text-right`}>{t("price")}</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((sale) => (
                <tr key={sale.id}>
                  <td className={`${td} tabular-nums`}>
                    <Link href={`/admin/sales/${sale.id}`} className="hover:text-accent">
                      {formatDate(sale.sale_date, tz)}
                    </Link>
                    <span className="block text-xs text-muted">{sale.reference}</span>
                  </td>
                  <td className={td}>{sale.vehicle ? `${sale.vehicle.year} ${sale.vehicle.make} ${sale.vehicle.model}` : "—"}</td>
                  <td className={td}>{sale.customer?.full_name ?? "—"}</td>
                  <td className={td}>{sale.salesperson_id ? names.get(sale.salesperson_id) ?? "—" : "—"}</td>
                  <td className={td}>
                    <Badge tone={sale.status}>{t(`statuses.${sale.status}`)}</Badge>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{formatMoney(sale.agreed_price, sale.currency)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={list.page} pages={list.pages} total={list.total} pathname="/admin/sales" query={Object.fromEntries(Object.entries(filters).filter(([, value]) => value))} />
      </Panel>
    </div>
  );
}
