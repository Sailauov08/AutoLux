import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getDealership } from "@/lib/data/dealership";
import { NAV_LINKS } from "@/lib/site";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const d = await getTranslations("dealership");
  const n = await getTranslations("nav");
  const [dealership, locale] = await Promise.all([getDealership(), getLocale()]);
  const address = dealership.address?.[locale as "kk"];

  return (
    <footer className="relative overflow-hidden bg-obsidian text-white">
      <div className="mx-auto max-w-[1600px] px-6 pt-24 md:px-12 md:pt-32">
        <p aria-hidden className="font-display select-none text-[clamp(4rem,19vw,19rem)] leading-none text-white/[0.06]">
          AutoLux
        </p>
        <div className="mt-16 grid grid-cols-1 gap-14 border-t border-white/10 pt-14 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="max-w-md text-lg leading-[1.7] text-silver">{t("description")}</p>
            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {dealership.socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] tracking-[0.24em] uppercase text-white/60 underline-offset-8 transition-colors hover:text-champagne hover:underline"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label={t("explore")} className="lg:col-span-3">
            <h2 className="text-[11px] tracking-[0.3em] uppercase text-champagne">{t("explore")}</h2>
            <ul className="mt-6 space-y-4">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-base text-white/75 transition-colors hover:text-champagne">
                    {n(link.key)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/service" className="text-base text-white/75 transition-colors hover:text-champagne">
                  {n("service")}
                </Link>
              </li>
              <li>
                <Link href="/trade-in" className="text-base text-white/75 transition-colors hover:text-champagne">
                  {n("tradeIn")}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <h2 className="text-[11px] tracking-[0.3em] uppercase text-champagne">{t("visitContact")}</h2>
            <ul className="mt-6 space-y-5 text-base text-white/75">
              <li>
                <span className="block">{address?.line1 || d("address1")}</span>
                <span className="block">{address?.line2 || d("address2")}</span>
              </li>
              <li>
                <a href={`tel:${dealership.phoneHref}`} className="transition-colors hover:text-champagne">
                  {dealership.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${dealership.email}`} className="transition-colors hover:text-champagne">
                  {dealership.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-20 flex max-w-[1600px] flex-col gap-3 border-t border-white/10 px-6 py-7 text-[11px] tracking-[0.12em] text-white/40 md:flex-row md:justify-between md:px-12">
        <p>
          © {new Date().getFullYear()} {dealership.name}. {t("rights")}{" "}
          <Link href="/privacy" className="underline-offset-4 hover:text-champagne hover:underline">
            {t("privacy")}
          </Link>
        </p>
        <p>{t("pricesNote")}</p>
      </div>
    </footer>
  );
}
