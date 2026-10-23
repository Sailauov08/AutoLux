"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function ConsentField({ id, checked, onChange, error, className = "" }: { id: string; checked: boolean; onChange: (value: boolean) => void; error?: string; className?: string }) {
  const t = useTranslations("forms");
  return (
    <div className={className}>
      <label htmlFor={id} className="flex items-start gap-3 text-sm leading-[1.6] text-muted">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1 size-4 shrink-0 accent-[var(--color-champagne)]"
        />
        <span>
          {t("consent")}{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-ink">
            {t("privacyLink")}
          </Link>
        </span>
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
