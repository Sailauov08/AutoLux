"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { submitTestDrive } from "@/lib/actions/submissions";
import { testDriveSchema } from "@/lib/validation/schemas";
import { FormAlert, SubmissionSuccess } from "./form-status";
import { ConsentField } from "./consent-field";
import { useSubmission } from "./use-submission";

export type VehicleOption = { id: string; label: string };

const EMPTY = { vehicleId: "", date: "", slot: "", name: "", email: "", phone: "", notes: "" };

export function TestDriveForm({ vehicles, defaultCarId, slots }: { vehicles: VehicleOption[]; defaultCarId?: string; slots: string[] }) {
  const t = useTranslations("forms");
  const [values, setValues] = useState({ ...EMPTY, vehicleId: defaultCarId ?? "" });
  const [consent, setConsent] = useState(false);
  const form = useSubmission(testDriveSchema, submitTestDrive);

  const update = (key: keyof typeof EMPTY) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const err = (key: string) => (form.errors[key] ? t(`errors.${form.errors[key]}`) : undefined);
  const f = (key: string) => t(`testDriveFields.${key}`);

  if (form.result) {
    return (
      <SubmissionSuccess title={t("testDriveSuccess.title")} text={t("testDriveSuccess.text")} reference={form.result.reference}>
        <ButtonLink href="/inventory" variant="solid" arrow>
          {t("testDriveSuccess.browse")}
        </ButtonLink>
        <Button
          variant="outline"
          onClick={() => {
            setValues({ ...EMPTY, vehicleId: values.vehicleId });
            form.reset();
          }}
        >
          {t("testDriveSuccess.again")}
        </Button>
      </SubmissionSuccess>
    );
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.submit({ ...values, consent });
  };

  return (
    <form noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-x-8 gap-y-9 md:grid-cols-2">
      <SelectField id="td-car" label={f("vehicle")} value={values.vehicleId} onChange={update("vehicleId")} error={err("vehicleId")} className="md:col-span-2">
        <option value="">{f("selectVehicle")}</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.label}
          </option>
        ))}
      </SelectField>
      <TextField id="td-date" label={f("date")} type="date" value={values.date} onChange={update("date")} error={err("date")} />
      <SelectField id="td-time" label={f("time")} value={values.slot} onChange={update("slot")} error={err("slot")}>
        <option value="">{f("selectTime")}</option>
        {slots.map((slot) => (
          <option key={slot} value={slot}>
            {slot}
          </option>
        ))}
      </SelectField>
      <TextField id="td-name" label={f("name")} autoComplete="name" value={values.name} onChange={update("name")} error={err("name")} />
      <TextField id="td-email" label={f("email")} type="email" autoComplete="email" value={values.email} onChange={update("email")} error={err("email")} />
      <TextField id="td-phone" label={f("phone")} type="tel" autoComplete="tel" value={values.phone} onChange={update("phone")} error={err("phone")} />
      <TextAreaField
        id="td-notes"
        label={f("notes")}
        placeholder={f("notesPlaceholder")}
        value={values.notes}
        onChange={update("notes")}
        error={err("notes")}
        className="md:col-span-2"
      />
      <ConsentField id="td-consent" checked={consent} onChange={setConsent} error={err("consent")} className="md:col-span-2" />
      <div className="space-y-6 md:col-span-2">
        <FormAlert code={form.formError} />
        <Button type="submit" variant="solid" disabled={form.pending} className="w-full md:w-auto md:min-w-64">
          {form.pending ? t("requesting") : t("submit.testDrive")}
        </Button>
      </div>
    </form>
  );
}
