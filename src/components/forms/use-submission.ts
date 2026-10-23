"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import type { ZodType } from "zod";
import type { ActionResult } from "@/lib/actions/shared";
import { type FieldErrors, fieldErrors } from "@/lib/validation/schemas";

export function useSubmission<T>(
  schema: ZodType,
  action: (input: unknown, locale: string) => Promise<ActionResult<T>>,
  onSuccess?: (data: T) => Promise<void> | void,
) {
  const locale = useLocale();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [done, setDone] = useState(false);

  async function submit(values: unknown) {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError("invalid");
      return;
    }
    setErrors({});
    setFormError(null);
    setPending(true);
    try {
      const response = await action(values, locale);
      if (response.ok) {
        setResult(response.data);
        setDone(true);
        await onSuccess?.(response.data);
      } else {
        setErrors(response.fields ?? {});
        setFormError(response.error);
      }
    } catch {
      setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  const reset = () => {
    setResult(null);
    setDone(false);
  };

  return { errors, formError, pending, result, done, submit, reset };
}
