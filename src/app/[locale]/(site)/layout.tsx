import { setRequestLocale } from "next-intl/server";
import { CompareBar } from "@/components/layout/compare-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  setRequestLocale((await params).locale);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CompareBar />
    </>
  );
}
