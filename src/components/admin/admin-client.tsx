"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { FormAlert } from "@/components/forms/form-status";
import { useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/actions/shared";

export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const run = <T,>(action: () => Promise<ActionResult<T>>, onSuccess?: (data: T) => void) =>
    start(async () => {
      const result = await action();
      setDone(result.ok);
      if (result.ok) {
        setError(null);
        setFields({});
        onSuccess?.(result.data);
        router.refresh();
      } else {
        setError(result.error);
        setFields(result.fields ?? {});
      }
    });

  return { pending, error, fields, done, run, setDone };
}

export function useFieldError(fields: Record<string, string>) {
  const t = useTranslations("forms.errors");
  return (name: string) => {
    const code = fields[name];
    if (!code) return undefined;
    return t.has(code) ? t(code) : t("required");
  };
}

export function Saved({ show, children }: { show: boolean; children?: React.ReactNode }) {
  const t = useTranslations("admin.common");
  if (!show) return null;
  return (
    <p role="status" className="text-xs text-emerald-600 dark:text-emerald-400">
      {children ?? t("saved")}
    </p>
  );
}

const variants = {
  primary: "border-ink bg-ink text-page hover:border-accent hover:bg-accent",
  outline: "border-line text-ink hover:border-accent hover:text-accent",
  danger: "border-red-500/50 text-red-600 hover:bg-red-600 hover:text-white dark:text-red-400",
  ghost: "border-transparent text-muted hover:text-ink",
};

export const adminButton = (variant: keyof typeof variants = "outline", extra = "") =>
  `inline-flex h-10 items-center justify-center gap-2 border px-4 text-[11px] font-medium tracking-[0.16em] uppercase transition-colors disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${extra}`;

export function SubmitButton({ pending, children, variant = "primary", className = "" }: { pending: boolean; children: React.ReactNode; variant?: keyof typeof variants; className?: string }) {
  return (
    <button type="submit" disabled={pending} className={adminButton(variant, className)}>
      {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ActionButton<T>({
  action,
  children,
  confirm,
  variant = "outline",
  className = "",
  onDone,
}: {
  action: () => Promise<ActionResult<T>>;
  children: React.ReactNode;
  confirm?: string;
  variant?: keyof typeof variants;
  className?: string;
  onDone?: (data: T) => void;
}) {
  const t = useTranslations("admin.common");
  const { pending, error, run } = useAction();
  const [asking, setAsking] = useState(false);

  if (asking) {
    return (
      <div role="alertdialog" aria-label={confirm} className="flex flex-col gap-2 border border-line bg-page p-3 text-sm">
        <p>{confirm}</p>
        <div className="flex gap-2">
          <button
            type="button"
            autoFocus
            disabled={pending}
            className={adminButton(variant === "danger" ? "danger" : "primary")}
            onClick={() => run(action, (data) => { setAsking(false); onDone?.(data); })}
          >
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            {t("confirm")}
          </button>
          <button type="button" className={adminButton("ghost")} onClick={() => setAsking(false)}>
            {t("cancel")}
          </button>
        </div>
        <FormAlert code={error} />
      </div>
    );
  }

  return (
    <span className="inline-flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        className={adminButton(variant, className)}
        onClick={() => (confirm ? setAsking(true) : run(action, onDone))}
      >
        {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        {children}
      </button>
      <FormAlert code={error} />
    </span>
  );
}

export const inputClass = "h-10 w-full border border-line bg-page px-3 text-sm text-ink outline-none focus:border-accent aria-[invalid=true]:border-red-500";
export const labelClass = "flex flex-col gap-1.5 text-[10px] font-medium tracking-[0.18em] uppercase text-muted";

export function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`${labelClass} ${className}`}>
      <span>{label}</span>
      {children}
      {error && <span className="normal-case tracking-normal text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}
