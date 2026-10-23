import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Badge, Panel, Table, td, th } from "@/components/admin/admin-ui";
import { DeleteDraftButton, LifecycleControls, MediaManager, PriceControls, PrivateRecordForm, PublicationControls } from "@/components/admin/vehicle-controls";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { CarCard } from "@/components/cars/car-card";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getAdminVehicle, staffNames } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import type { Car } from "@/lib/cars";
import { formatDateTime, formatPrice } from "@/lib/format";

export default async function VehiclePage({ params }: PageProps<"/[locale]/admin/inventory/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, "inventory.read");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getAdminVehicle(id);
  if (!data) notFound();
  const [t, tStatus, dealership, names] = await Promise.all([
    getTranslations("admin.inventory"),
    getTranslations("statuses.vehicle"),
    getDealership(),
    staffNames(staff.dealershipId),
  ]);
  const { vehicle, media, equipment, history, priceRequests, privateData } = data;
  const ref = { id: vehicle.id, version: vehicle.version };
  const nameMap = Object.fromEntries(names);
  const ordered = [...media].sort((a, b) => a.position - b.position);
  const preview: Car = {
    id: vehicle.slug,
    brand: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    price: Number(vehicle.price),
    mileage: vehicle.mileage,
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    horsepower: vehicle.horsepower,
    drivetrain: vehicle.drivetrain,
    bodyType: vehicle.body_type,
    color: vehicle.exterior_color,
    engine: vehicle.engine,
    images: ordered.map((item) => item.url),
    photoSource: ordered.length === 0 ? "pending" : ordered[0].source === "dealer" ? "dealer" : "representative",
    badges: vehicle.badges as Car["badges"],
    status: vehicle.status as Car["status"],
  };
  const canPrice = staff.can("inventory.price") || staff.can("inventory.price_request") || staff.can("inventory.price_approve");

  return (
    <div className="space-y-8">
      <AdminHeader eyebrow={t("title")} title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}>
        <Badge tone={vehicle.status}>{tStatus(vehicle.status)}</Badge>
        <Badge tone={vehicle.published ? "available" : "draft"}>{vehicle.published ? t("publishedYes") : t("publishedNo")}</Badge>
        {vehicle.published && (
          <Link href={`/inventory/${vehicle.slug}`} target="_blank" className="text-[11px] tracking-[0.18em] uppercase underline underline-offset-4">
            {t("viewPublic")}
          </Link>
        )}
      </AdminHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel title={t("lifecycle")} description={t("lifecycleHint")}>
          <LifecycleControls vehicle={ref} status={vehicle.status} canUpdate={staff.can("inventory.update")} canDelete={staff.can("inventory.delete")} />
          {vehicle.status === "draft" && staff.can("inventory.delete") && (
            <div className="mt-5 border-t border-line pt-5">
              <DeleteDraftButton vehicleId={vehicle.id} />
            </div>
          )}
        </Panel>
        {staff.can("inventory.publish") && (
          <Panel title={t("publication")}>
            <PublicationControls vehicle={ref} status={vehicle.status} published={vehicle.published} featured={vehicle.featured} />
          </Panel>
        )}
        <Panel title={t("previewTitle")} description={t("previewHint")}>
          <div className="max-w-xs">
            <CarCard car={preview} />
          </div>
        </Panel>
      </div>

      {canPrice && (
        <Panel title={t("pricing")}>
          <PriceControls
            vehicle={ref}
            price={Number(vehicle.price)}
            requests={priceRequests.filter((request) => request.status === "pending")}
            canApprove={staff.can("inventory.price_approve")}
            names={nameMap}
          />
        </Panel>
      )}

      {staff.can("media.update") ? (
        <Panel title={t("media")}>
          <MediaManager vehicleId={vehicle.id} media={media} />
        </Panel>
      ) : null}

      {staff.can("inventory.update") && (
        <Panel title={t("details")}>
          <VehicleForm vehicle={vehicle} equipment={equipment.map((item) => item.label)} />
        </Panel>
      )}

      {staff.can("inventory.private") && (
        <Panel title={t("private")} description={t("privateHint")}>
          <PrivateRecordForm vehicleId={vehicle.id} data={privateData} />
        </Panel>
      )}

      <Panel title={t("priceHistory")}>
        {history.length === 0 ? (
          <p className="text-sm text-muted">{t("noHistory")}</p>
        ) : (
          <Table minWidth={560}>
            <thead>
              <tr>
                <th className={th}>{t("when")}</th>
                <th className={th}>{t("change")}</th>
                <th className={th}>{t("priceReason")}</th>
                <th className={th}>{t("changedBy")}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td className={`${td} tabular-nums`}>{formatDateTime(row.changed_at, dealership.timezone)}</td>
                  <td className={`${td} tabular-nums`}>
                    {formatPrice(row.old_price)} → {formatPrice(row.new_price)}
                  </td>
                  <td className={td}>{row.reason ?? "—"}</td>
                  <td className={td}>
                    {(row.changed_by && nameMap[row.changed_by]) ?? "—"}
                    {row.approved_by && row.approved_by !== row.changed_by ? ` · ${t("approvedBy", { name: nameMap[row.approved_by] ?? "—" })}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
