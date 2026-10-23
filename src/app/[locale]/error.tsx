"use client";

import { useTranslations } from "next-intl";
import { StatusScreen } from "@/components/layout/status-screen";
import { Button, ButtonLink } from "@/components/ui/button";

export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");

  return (
    <StatusScreen eyebrow={t("eyebrow")} title={t("title")} text={t("text")}>
      <Button variant="white" onClick={reset}>
        {t("retry")}
      </Button>
      <ButtonLink href="/" variant="outline-white">
        {t("home")}
      </ButtonLink>
    </StatusScreen>
  );
}
