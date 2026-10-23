"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/forms/form-status";
import { useSubmission } from "@/components/forms/use-submission";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { cancelMyRequest, updateProfile } from "@/lib/actions/account";
import { profileSchema } from "@/lib/validation/schemas";

export function ProfileForm({ initial }: { initial: { fullName: string; phone: string; locale: string } }) {
  const t = useTranslations("account");
  const tf = useTranslations("forms");
  const [values, setValues] = useState(initial);
  const form = useSubmission(profileSchema, (input) => updateProfile(input));
  const err = (key: string) => (form.errors[key] ? tf(`errors.${form.errors[key]}`) : undefined);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.submit(values);
  };

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-8">
      <TextField id="pf-name" label={t("fullName")} autoComplete="name" value={values.fullName} onChange={(e) => setValues({ ...values, fullName: e.target.value })} error={err("fullName")} />
      <TextField id="pf-phone" label={t("phone")} type="tel" autoComplete="tel" value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} error={err("phone")} />
      <SelectField id="pf-locale" label={t("locale")} value={values.locale} onChange={(e) => setValues({ ...values, locale: e.target.value })}>
        {(["kk", "ru", "en"] as const).map((code) => (
          <option key={code} value={code}>
            {t(`languages.${code}`)}
          </option>
        ))}
      </SelectField>
      <FormAlert code={form.formError} />
      {form.done && !form.pending && <p role="status" className="text-sm text-accent">{t("profileSaved")}</p>}
      <Button type="submit" variant="solid" disabled={form.pending}>
        {t("saveProfile")}
      </Button>
    </form>
  );
}

export function CancelRequestButton({ kind, id }: { kind: string; id: string }) {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("cancel") + "?")) return;
          startTransition(async () => {
            const result = await cancelMyRequest(kind, id);
            setError(result.ok ? null : result.error);
          });
        }}
        className="text-[11px] tracking-[0.2em] uppercase text-muted underline-offset-4 transition-colors hover:text-red-500 hover:underline disabled:opacity-40"
      >
        {pending ? tc("saving") : t("cancel")}
      </button>
      <FormAlert code={error} />
    </div>
  );
}
