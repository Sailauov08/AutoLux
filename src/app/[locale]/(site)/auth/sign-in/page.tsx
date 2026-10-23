import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignInForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";

export async function generateMetadata({ params }: PageProps<"/[locale]/auth/sign-in">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "meta" });
  return { title: t("signIn"), robots: { index: false } };
}

export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/auth/sign-in">) {
  setRequestLocale((await params).locale);
  const { next, error } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("signInTitle")} text={t("signInText")}>
      <SignInForm next={typeof next === "string" ? next : undefined} initialError={error === "link" ? "link" : undefined} />
    </AuthShell>
  );
}
