"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { submitFinancing } from "@/lib/actions/submissions";
import { LOAN_TERMS } from "@/lib/domain";
import { financingSchema } from "@/lib/validation/schemas";
import { FormAlert, SubmissionSuccess } from "./form-status";
import type { VehicleOption } from "./test-drive-form";
import { ConsentField } from "./consent-field";
import { useSubmission } from "./use-submission";

const EMPTY = { vehicleId: "", price: "", downPayment: "", term: "60", name: "", email: "", phone: "" };

export function FinancingRequestForm({ vehicles, initialVehicleId }: { vehicles: (VehicleOption & { price: number })[]; initialVehicleId?: string }) {
  const t = useTranslations("financingForm");
  const tf = useTranslations("forms");
  const tc = useTranslations("calculator");
  const initial = vehicles.find((item) => item.id === initialVehicleId);
  const [values, setValues] = useState(initial ? { ...EMPTY, vehicleId: initial.id, price: String(initial.price) } : EMPTY);
  const [consent, setConsent] = useState(false);
  const form = useSubmission(financingSchema, submitFinancing);

  const update = (key: keyof typeof EMPTY) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setValues((current) => {
      if (key !== "vehicleId") return { ...current, [key]: value };
      const vehicle = vehicles.find((item) => item.id === value);
      return { ...current, vehicleId: value, price: vehicle ? String(vehicle.price) : current.price };
    });
  };
  const err = (key: string) => (form.errors[key] ? tf(`errors.${form.errors[key]}`) : undefined);

  if (form.result) return <SubmissionSuccess title={t("successTitle")} text={t("successText")} reference={form.result.reference} />;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.submit({ ...values, consent });
  };

  return (
    <form noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-x-8 gap-y-9 md:grid-cols-2">
      <SelectField id="fin-vehicle" label={t("vehicle")} value={values.vehicleId} onChange={update("vehicleId")} className="md:col-span-2">
        <option value="">{t("anyVehicle")}</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.label}
          </option>
        ))}
      </SelectField>
      <TextField id="fin-price" label={t("price")} type="number" inputMode="numeric" min={0} value={values.price} onChange={update("price")} error={err("price")} />
      <TextField id="fin-down" label={t("down")} type="number" inputMode="numeric" min={0} value={values.downPayment} onChange={update("downPayment")} error={err("downPayment")} />
      <SelectField id="fin-term" label={t("term")} value={values.term} onChange={update("term")} error={err("term")}>
        {LOAN_TERMS.map((term) => (
          <option key={term} value={term}>
            {tc("months", { count: term })}
          </option>
        ))}
      </SelectField>
      <TextField id="fin-name" label={tf("testDriveFields.name")} autoComplete="name" value={values.name} onChange={update("name")} error={err("name")} />
      <TextField id="fin-email" label={tf("testDriveFields.email")} type="email" autoComplete="email" value={values.email} onChange={update("email")} error={err("email")} />
      <TextField id="fin-phone" label={tf("testDriveFields.phone")} type="tel" autoComplete="tel" value={values.phone} onChange={update("phone")} error={err("phone")} />
      <ConsentField id="fin-consent" checked={consent} onChange={setConsent} error={err("consent")} className="md:col-span-2" />
      <div className="space-y-6 md:col-span-2">
        <FormAlert code={form.formError} />
        <Button type="submit" variant="solid" disabled={form.pending} className="w-full md:w-auto md:min-w-64">
          {form.pending ? tf("sending") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
