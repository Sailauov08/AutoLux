import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Panel } from "@/components/admin/admin-ui";
import { LogoUpload, SettingsForm } from "@/components/admin/settings-form";
import { requireStaff } from "@/lib/auth/session";
import { getAdminSettings } from "@/lib/data/admin";

export default async function SettingsPage({ params }: PageProps<"/[locale]/admin/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, "settings.update");
  const [t, settings] = await Promise.all([getTranslations("admin.settings"), getAdminSettings(staff.dealershipId)]);
  return (
    <div className="space-y-8">
      <AdminHeader title={t("title")} description={t("description")} />
      <Panel title={t("logo")}>
        <LogoUpload logoUrl={settings.logo_url} />
      </Panel>
      <Panel>
        <SettingsForm settings={settings} />
      </Panel>
    </div>
  );
}
