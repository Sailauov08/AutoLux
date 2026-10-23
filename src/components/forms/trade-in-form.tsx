"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { submitTradeIn } from "@/lib/actions/submissions";
import { TRADE_IN_CONDITIONS } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { tradeInSchema } from "@/lib/validation/schemas";
import { FormAlert, SubmissionSuccess } from "./form-status";
import { ConsentField } from "./consent-field";
import { useSubmission } from "./use-submission";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 18 }, (_, index) => CURRENT_YEAR - index);
const EMPTY = { brand: "", model: "", year: "", mileage: "", condition: "", name: "", email: "", phone: "" };

export function TradeInForm() {
  const t = useTranslations("forms");
  const [values, setValues] = useState(EMPTY);
  const [consent, setConsent] = useState(false);
  const form = useSubmission(tradeInSchema, submitTradeIn);

  const update = (key: keyof typeof EMPTY) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const err = (key: string) => (form.errors[key] ? t(`errors.${form.errors[key]}`) : undefined);
  const f = (key: string) => t(`tradeInFields.${key}`);

  if (form.result) {
    return (
      <SubmissionSuccess
        title={`${formatPrice(form.result.low)} – ${formatPrice(form.result.high)}`}
        text={t("tradeInSuccess.text")}
        reference={form.result.reference}
      >
        <Button
          variant="outline"
          onClick={() => {
            setValues(EMPTY);
            form.reset();
          }}
        >
          {t("tradeInSuccess.again")}
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
      <TextField id="ti-brand" label={f("brand")} value={values.brand} onChange={update("brand")} error={err("brand")} />
      <TextField id="ti-model" label={f("model")} value={values.model} onChange={update("model")} error={err("model")} />
      <SelectField id="ti-year" label={f("year")} value={values.year} onChange={update("year")} error={err("year")}>
        <option value="">{f("selectYear")}</option>
        {YEARS.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </SelectField>
      <TextField id="ti-mileage" label={f("mileage")} type="number" inputMode="numeric" min={0} value={values.mileage} onChange={update("mileage")} error={err("mileage")} />
      <SelectField id="ti-condition" label={f("condition")} value={values.condition} onChange={update("condition")} error={err("condition")} className="md:col-span-2">
        <option value="">{f("selectCondition")}</option>
        {TRADE_IN_CONDITIONS.map((key) => (
          <option key={key} value={key}>
            {t(`tradeInFields.conditions.${key}`)}
          </option>
        ))}
      </SelectField>
      <TextField id="ti-name" label={f("name")} autoComplete="name" value={values.name} onChange={update("name")} error={err("name")} />
      <TextField id="ti-email" label={f("email")} type="email" autoComplete="email" value={values.email} onChange={update("email")} error={err("email")} />
      <TextField id="ti-phone" label={f("phone")} type="tel" autoComplete="tel" value={values.phone} onChange={update("phone")} error={err("phone")} className="md:col-span-2" />
      <ConsentField id="ti-consent" checked={consent} onChange={setConsent} error={err("consent")} className="md:col-span-2" />
      <div className="space-y-6 md:col-span-2">
        <FormAlert code={form.formError} />
        <Button type="submit" variant="solid" disabled={form.pending} className="w-full md:w-auto md:min-w-64">
          {form.pending ? t("calculating") : t("submit.tradeIn")}
        </Button>
      </div>
    </form>
  );
}
