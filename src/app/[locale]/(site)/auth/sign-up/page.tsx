import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignUpForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";

export async function generateMetadata({ params }: PageProps<"/[locale]/auth/sign-up">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "meta" });
  return { title: t("signUp"), robots: { index: false } };
}

export default async function SignUpPage({ params }: PageProps<"/[locale]/auth/sign-up">) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("auth");

  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("signUpTitle")} text={t("signUpText")}>
      <SignUpForm />
    </AuthShell>
  );
}
