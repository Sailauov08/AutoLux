"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { requestReservation } from "@/lib/actions/submissions";
import { reservationSchema } from "@/lib/validation/schemas";
import { FormAlert, SubmissionSuccess } from "./form-status";
import { ConsentField } from "./consent-field";
import { useSubmission } from "./use-submission";

export function ReservationPanel({ vehicleId, available }: { vehicleId: string; available: boolean }) {
  const t = useTranslations("reservation");
  const tf = useTranslations("forms");
  const tAccount = useTranslations("auth");
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ phone: "", message: "" });
  const [consent, setConsent] = useState(false);
  const form = useSubmission(reservationSchema, requestReservation);
  const err = (key: string) => (form.errors[key] ? tf(`errors.${form.errors[key]}`) : undefined);

  if (!available) return <p className="text-sm text-muted">{t("unavailable")}</p>;

  if (form.result) {
    return (
      <SubmissionSuccess title={t("successTitle")} text={t("successText")} reference={form.result.reference}>
        <ButtonLink href="/account" variant="outline">
          {tAccount("goToAccount")}
        </ButtonLink>
      </SubmissionSuccess>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        {t("title")}
      </Button>
    );
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.submit({ vehicleId, ...values, consent });
  };

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-7 border border-line p-6">
      <div>
        <p className="eyebrow">{t("eyebrow")}</p>
        <p className="mt-3 text-sm leading-[1.7] text-muted">{t("text")}</p>
      </div>
      <TextField id="rs-phone" label={t("phone")} type="tel" autoComplete="tel" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} error={err("phone")} />
      <TextAreaField id="rs-message" label={t("message")} value={values.message} onChange={(event) => setValues({ ...values, message: event.target.value })} error={err("message")} />
      <ConsentField id="rs-consent" checked={consent} onChange={setConsent} error={err("consent")} />
      <FormAlert code={form.formError} />
      <Button type="submit" variant="solid" disabled={form.pending} className="w-full">
        {form.pending ? tf("sending") : t("submit")}
      </Button>
    </form>
  );
}
