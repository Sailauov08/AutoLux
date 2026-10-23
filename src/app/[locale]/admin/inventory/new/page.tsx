import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Panel } from "@/components/admin/admin-ui";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { requireStaff } from "@/lib/auth/session";

export default async function NewVehiclePage({ params }: PageProps<"/[locale]/admin/inventory/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff(locale, "inventory.create");
  const t = await getTranslations("admin.inventory");
  return (
    <div className="space-y-8">
      <AdminHeader eyebrow={t("title")} title={t("newTitle")} description={t("newHint")} />
      <Panel>
        <VehicleForm />
      </Panel>
    </div>
  );
}
