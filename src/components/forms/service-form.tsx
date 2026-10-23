"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { submitService } from "@/lib/actions/submissions";
import { serviceSchema } from "@/lib/validation/schemas";
import { FormAlert, SubmissionSuccess } from "./form-status";
import { ConsentField } from "./consent-field";
import { useSubmission } from "./use-submission";

const EMPTY = { vehicleDescription: "", serviceType: "", date: "", slot: "", name: "", email: "", phone: "", notes: "" };

export function ServiceForm({ slots, services }: { slots: string[]; services: string[] }) {
  const t = useTranslations("service");
  const tf = useTranslations("forms");
  const [values, setValues] = useState(EMPTY);
  const [consent, setConsent] = useState(false);
  const form = useSubmission(serviceSchema, submitService);

  const update = (key: keyof typeof EMPTY) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const err = (key: string) => (form.errors[key] ? tf(`errors.${form.errors[key]}`) : undefined);

  if (form.result) return <SubmissionSuccess title={t("successTitle")} text={t("successText")} reference={form.result.reference} />;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.submit({ ...values, consent });
  };

  return (
    <form noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-x-8 gap-y-9 md:grid-cols-2">
      <TextField
        id="sv-vehicle"
        label={t("vehicle")}
        placeholder={t("vehiclePlaceholder")}
        value={values.vehicleDescription}
        onChange={update("vehicleDescription")}
        error={err("vehicleDescription")}
        className="md:col-span-2"
      />
      <SelectField id="sv-type" label={t("type")} value={values.serviceType} onChange={update("serviceType")} error={err("serviceType")} className="md:col-span-2">
        <option value="">—</option>
        {services.map((type) => (
          <option key={type} value={type}>
            {t(`types.${type}`)}
          </option>
        ))}
      </SelectField>
      <TextField id="sv-date" label={t("date")} type="date" value={values.date} onChange={update("date")} error={err("date")} />
      <SelectField id="sv-slot" label={t("time")} value={values.slot} onChange={update("slot")} error={err("slot")}>
        <option value="">—</option>
        {slots.map((slot) => (
          <option key={slot} value={slot}>
            {slot}
          </option>
        ))}
      </SelectField>
      <TextField id="sv-name" label={tf("testDriveFields.name")} autoComplete="name" value={values.name} onChange={update("name")} error={err("name")} />
      <TextField id="sv-email" label={tf("testDriveFields.email")} type="email" autoComplete="email" value={values.email} onChange={update("email")} error={err("email")} />
      <TextField id="sv-phone" label={tf("testDriveFields.phone")} type="tel" autoComplete="tel" value={values.phone} onChange={update("phone")} error={err("phone")} />
      <TextAreaField id="sv-notes" label={t("notes")} value={values.notes} onChange={update("notes")} error={err("notes")} className="md:col-span-2" />
      <ConsentField id="sv-consent" checked={consent} onChange={setConsent} error={err("consent")} className="md:col-span-2" />
      <div className="space-y-6 md:col-span-2">
        <FormAlert code={form.formError} />
        <Button type="submit" variant="solid" disabled={form.pending} className="w-full md:w-auto md:min-w-64">
          {form.pending ? tf("sending") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
