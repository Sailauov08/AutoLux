import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";

export async function generateMetadata({ params }: PageProps<"/[locale]/auth/forgot-password">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "meta" });
  return { title: t("forgot"), robots: { index: false } };
}

export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/auth/forgot-password">) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("auth");

  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("forgotTitle")} text={t("forgotText")}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
