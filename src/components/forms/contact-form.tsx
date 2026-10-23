"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { submitContact } from "@/lib/actions/submissions";
import { CONTACT_TOPICS } from "@/lib/domain";
import { contactSchema } from "@/lib/validation/schemas";
import { FormAlert, SubmissionSuccess } from "./form-status";
import { ConsentField } from "./consent-field";
import { useSubmission } from "./use-submission";

const EMPTY = { name: "", email: "", phone: "", topic: "", message: "" };

export function ContactForm({ defaultTopic }: { defaultTopic?: string }) {
  const t = useTranslations("forms");
  const initial = { ...EMPTY, topic: defaultTopic && (CONTACT_TOPICS as readonly string[]).includes(defaultTopic) ? defaultTopic : "" };
  const [values, setValues] = useState(initial);
  const [consent, setConsent] = useState(false);
  const form = useSubmission(contactSchema, submitContact);

  const update = (key: keyof typeof EMPTY) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const err = (key: string) => (form.errors[key] ? t(`errors.${form.errors[key]}`) : undefined);
  const f = (key: string) => t(`contactFields.${key}`);

  if (form.result) {
    return (
      <SubmissionSuccess
        title={t("contactSuccess.title", { name: values.name.split(" ")[0] })}
        text={t("contactSuccess.text")}
        reference={form.result.reference}
      >
        <Button
          variant="outline"
          onClick={() => {
            setValues(initial);
            form.reset();
          }}
        >
          {t("contactSuccess.again")}
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
      <TextField id="ct-name" label={f("name")} autoComplete="name" value={values.name} onChange={update("name")} error={err("name")} />
      <TextField id="ct-email" label={f("email")} type="email" autoComplete="email" value={values.email} onChange={update("email")} error={err("email")} />
      <TextField id="ct-phone" label={f("phone")} type="tel" autoComplete="tel" value={values.phone} onChange={update("phone")} error={err("phone")} />
      <SelectField id="ct-topic" label={f("topic")} value={values.topic} onChange={update("topic")} error={err("topic")}>
        <option value="">{f("selectTopic")}</option>
        {CONTACT_TOPICS.map((topic) => (
          <option key={topic} value={topic}>
            {t(`contactFields.topics.${topic}`)}
          </option>
        ))}
      </SelectField>
      <TextAreaField id="ct-message" label={f("message")} rows={5} value={values.message} onChange={update("message")} error={err("message")} className="md:col-span-2" />
      <ConsentField id="ct-consent" checked={consent} onChange={setConsent} error={err("consent")} className="md:col-span-2" />
      <div className="space-y-6 md:col-span-2">
        <FormAlert code={form.formError} />
        <Button type="submit" variant="solid" disabled={form.pending} className="w-full md:w-auto md:min-w-64">
          {form.pending ? t("sending") : t("submit.contact")}
        </Button>
      </div>
    </form>
  );
}
