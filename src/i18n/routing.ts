import { defineRouting } from "next-intl/routing";

export const LOCALES = ["kk", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "kk",
  localePrefix: "always",
});
