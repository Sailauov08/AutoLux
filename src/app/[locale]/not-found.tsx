import { getTranslations } from "next-intl/server";
import { StatusScreen } from "@/components/layout/status-screen";
import { ButtonLink } from "@/components/ui/button";

export default async function NotFound() {
  const [t, nav] = await Promise.all([getTranslations("notFound"), getTranslations("nav")]);

  return (
    <StatusScreen code="404" eyebrow={t("eyebrow")} title={t("title")} text={t("text")}>
      <ButtonLink href="/" variant="white" arrow>
        {t("home")}
      </ButtonLink>
      <ButtonLink href="/inventory" variant="outline-white">
        {nav("inventory")}
      </ButtonLink>
    </StatusScreen>
  );
}
