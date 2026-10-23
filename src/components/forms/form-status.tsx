"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function FormAlert({ code }: { code: string | null }) {
  const t = useTranslations("errors");
  const tNav = useTranslations("nav");
  if (!code) return null;
  return (
    <p role="alert" className="border-l-2 border-red-500 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
      {t.has(code) ? t(code) : t("generic")}
      {code === "auth_required" && (
        <Link href="/auth/sign-in" className="ml-2 underline underline-offset-4">
          {tNav("signIn")}
        </Link>
      )}
    </p>
  );
}

export function SubmissionSuccess({
  title,
  text,
  reference,
  children,
}: {
  title: string;
  text: string;
  reference?: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations("success");
  return (
    <div className="flex min-h-80 flex-col items-start justify-center" role="status">
      <CheckCircle2 className="size-10 text-accent" aria-hidden />
      <h2 className="display mt-6 text-3xl md:text-4xl">{title}</h2>
      <p className="mt-4 max-w-md leading-[1.8] text-muted">{text}</p>
      {reference && (
        <p className="mt-8 flex gap-4 border-y border-line py-4 text-sm">
          <span className="text-[11px] tracking-[0.22em] uppercase text-muted">{t("reference")}</span>
          <span className="font-medium tabular-nums">{reference}</span>
        </p>
      )}
      {children && <div className="mt-10 flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}

export function DemoNotice() {
  const t = useTranslations("common");
  return (
    <p className="mb-10 border border-dashed border-line px-5 py-4 text-sm leading-[1.7] text-muted">
      <span className="mr-2 text-[11px] font-medium tracking-[0.22em] uppercase text-accent">{t("demoMode")}</span>
      {t("demoModeText")}
    </p>
  );
}
