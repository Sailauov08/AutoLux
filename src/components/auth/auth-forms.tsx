"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { FormAlert, SubmissionSuccess } from "@/components/forms/form-status";
import { useSubmission } from "@/components/forms/use-submission";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Link, useRouter } from "@/i18n/navigation";
import { importFavorites, requestPasswordReset, signIn, signUp, updatePassword } from "@/lib/actions/account";
import { useGarage } from "@/lib/garage";
import { resetRequestSchema, signInSchema, signUpSchema, updatePasswordSchema } from "@/lib/validation/schemas";

const SAFE_NEXT = /^\/[a-z0-9/_-]*$/i;

function useFieldError(errors: Record<string, string>) {
  const t = useTranslations("forms");
  return (key: string) => (errors[key] ? t(`errors.${errors[key]}`) : undefined);
}

export function SignInForm({ next, initialError }: { next?: string; initialError?: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const { favorites } = useGarage();
  const [values, setValues] = useState({ email: "", password: "" });
  const form = useSubmission(signInSchema, (input) => signIn(input), async () => {
    await importFavorites(favorites);
    router.replace(next && SAFE_NEXT.test(next) ? next : "/account");
    router.refresh();
  });
  const err = useFieldError(form.errors);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.submit(values);
  };

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-9">
      <TextField id="si-email" label={t("email")} type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} error={err("email")} />
      <TextField id="si-password" label={t("password")} type="password" autoComplete="current-password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} error={err("password")} />
      <FormAlert code={form.formError ?? initialError ?? null} />
      <Button type="submit" variant="solid" disabled={form.pending || form.done} className="w-full">
        {t("signIn")}
      </Button>
      <div className="flex flex-wrap justify-between gap-4 text-sm">
        <Link href="/auth/forgot-password" className="text-muted underline-offset-4 hover:text-ink hover:underline">
          {t("forgot")}
        </Link>
        <span className="text-muted">
          {t("noAccount")}{" "}
          <Link href="/auth/sign-up" className="text-ink underline underline-offset-4 hover:text-accent">
            {t("signUp")}
          </Link>
        </span>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const t = useTranslations("auth");
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const form = useSubmission(signUpSchema, signUp);
  const err = useFieldError(form.errors);

  if (form.done) return <SubmissionSuccess title={t("checkEmailTitle")} text={t("checkEmailText")} />;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.submit(values);
  };

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-9">
      <TextField id="su-name" label={t("fullName")} autoComplete="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} error={err("name")} />
      <TextField id="su-email" label={t("email")} type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} error={err("email")} />
      <TextField id="su-password" label={t("password")} type="password" autoComplete="new-password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} error={err("password")} />
      <FormAlert code={form.formError} />
      <Button type="submit" variant="solid" disabled={form.pending} className="w-full">
        {t("signUp")}
      </Button>
      <p className="text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href="/auth/sign-in" className="text-ink underline underline-offset-4 hover:text-accent">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const form = useSubmission(resetRequestSchema, requestPasswordReset);
  const err = useFieldError(form.errors);

  if (form.done) return <SubmissionSuccess title={t("checkEmailTitle")} text={t("resetSent")} />;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.submit({ email });
  };

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-9">
      <TextField id="fp-email" label={t("email")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={err("email")} />
      <FormAlert code={form.formError} />
      <Button type="submit" variant="solid" disabled={form.pending} className="w-full">
        {t("sendLink")}
      </Button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const t = useTranslations("auth");
  const [password, setPassword] = useState("");
  const form = useSubmission(updatePasswordSchema, (input) => updatePassword(input));
  const err = useFieldError(form.errors);

  if (form.done) {
    return (
      <SubmissionSuccess title={t("passwordUpdated")} text={t("signInText")}>
        <ButtonLink href="/account" variant="solid" arrow>
          {t("goToAccount")}
        </ButtonLink>
      </SubmissionSuccess>
    );
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.submit({ password });
  };

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-9">
      <TextField id="up-password" label={t("newPassword")} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={err("password")} />
      <FormAlert code={form.formError} />
      <Button type="submit" variant="solid" disabled={form.pending} className="w-full">
        {t("updatePassword")}
      </Button>
    </form>
  );
}
