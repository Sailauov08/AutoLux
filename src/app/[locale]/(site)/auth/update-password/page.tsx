import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UpdatePasswordForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import { requireUser } from "@/lib/auth/session";

export async function generateMetadata({ params }: PageProps<"/[locale]/auth/update-password">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "meta" });
  return { title: t("forgot"), robots: { index: false } };
}

export default async function UpdatePasswordPage({ params }: PageProps<"/[locale]/auth/update-password">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale, "/auth/update-password");
  const t = await getTranslations("auth");

  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("updateTitle")} text={t("updateText")}>
      <UpdatePasswordForm />
    </AuthShell>
  );
}
