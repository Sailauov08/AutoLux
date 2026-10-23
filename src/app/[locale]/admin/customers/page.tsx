import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Empty, FilterBar, filterButton, filterInput, filterLabel, Pagination, Panel, Table, td, th } from "@/components/admin/admin-ui";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/session";
import { listCustomers, param, toPage } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { formatDate } from "@/lib/format";

export default async function CustomersPage({ params, searchParams }: PageProps<"/[locale]/admin/customers">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, ["customers.read", "leads.read_own"]);
  const query = await searchParams;
  const q = param(query.q);
  const [t, tc, dealership, list] = await Promise.all([
    getTranslations("admin.customers"),
    getTranslations("admin.common"),
    getDealership(),
    listCustomers(staff.dealershipId, { q, page: toPage(query.page) }),
  ]);

  return (
    <div className="space-y-6">
      <AdminHeader title={t("title")} description={staff.can("customers.read") ? undefined : t("ownOnly")} />
      <FilterBar>
        <label className={filterLabel}>
          {tc("search")}
          <input name="q" defaultValue={q} placeholder={t("search")} className={`${filterInput} w-64`} />
        </label>
        <button type="submit" className={filterButton}>
          {tc("apply")}
        </button>
      </FilterBar>
      <Panel>
        {list.rows.length === 0 ? (
          <Empty>{t("empty")}</Empty>
        ) : (
          <Table minWidth={640}>
            <thead>
              <tr>
                <th className={th}>{tc("name")}</th>
                <th className={th}>{tc("email")}</th>
                <th className={th}>{tc("phone")}</th>
                <th className={th}>{t("since")}</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((customer) => (
                <tr key={customer.id}>
                  <td className={td}>
                    <Link href={`/admin/customers/${customer.id}`} className="font-medium hover:text-accent">
                      {customer.full_name}
                    </Link>
                    {customer.anonymized_at && <span className="ml-2 text-xs text-muted">{t("anonymizedShort")}</span>}
                  </td>
                  <td className={td}>{customer.email ?? "—"}</td>
                  <td className={td}>{customer.phone ?? "—"}</td>
                  <td className={`${td} tabular-nums text-muted`}>{formatDate(customer.created_at, dealership.timezone)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={list.page} pages={list.pages} total={list.total} pathname="/admin/customers" query={q ? { q } : {}} />
      </Panel>
    </div>
  );
}
