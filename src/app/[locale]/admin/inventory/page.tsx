import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Empty, FilterBar, filterButton, filterInput, filterLabel, Pagination } from "@/components/admin/admin-ui";
import { InventoryTable } from "@/components/admin/inventory-table";
import { ButtonLink } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth/session";
import { listVehicles, param, toPage } from "@/lib/data/admin";
import { VEHICLE_STATUSES } from "@/lib/domain";

export default async function InventoryPage({ params, searchParams }: PageProps<"/[locale]/admin/inventory">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, "inventory.read");
  const query = await searchParams;
  const filters = {
    q: param(query.q),
    status: (VEHICLE_STATUSES as readonly string[]).includes(param(query.status)) ? param(query.status) : "",
    published: ["yes", "no"].includes(param(query.published)) ? param(query.published) : "",
  };
  const [t, tStatus, tc, list] = await Promise.all([
    getTranslations("admin.inventory"),
    getTranslations("statuses.vehicle"),
    getTranslations("admin.common"),
    listVehicles(staff.dealershipId, { ...filters, page: toPage(query.page) }),
  ]);

  return (
    <div className="space-y-6">
      <AdminHeader title={t("title")}>
        {staff.can("inventory.create") && (
          <ButtonLink href="/admin/inventory/new" variant="solid" className="h-11 px-5">
            {t("add")}
          </ButtonLink>
        )}
      </AdminHeader>

      <FilterBar>
        <label className={filterLabel}>
          {tc("search")}
          <input name="q" defaultValue={filters.q} placeholder={t("search")} className={`${filterInput} w-56`} />
        </label>
        <label className={filterLabel}>
          {tc("status")}
          <select name="status" defaultValue={filters.status} className={filterInput}>
            <option value="">{t("activeStock")}</option>
            {VEHICLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {tStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <label className={filterLabel}>
          {t("published")}
          <select name="published" defaultValue={filters.published} className={filterInput}>
            <option value="">{tc("all")}</option>
            <option value="yes">{t("publishedYes")}</option>
            <option value="no">{t("publishedNo")}</option>
          </select>
        </label>
        <button type="submit" className={filterButton}>
          {tc("apply")}
        </button>
      </FilterBar>

      {list.rows.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <InventoryTable rows={list.rows} canPublish={staff.can("inventory.publish")} canArchive={staff.can("inventory.delete")} />
      )}
      <Pagination page={list.page} pages={list.pages} total={list.total} pathname="/admin/inventory" query={Object.fromEntries(Object.entries(filters).filter(([, value]) => value))} />
    </div>
  );
}
