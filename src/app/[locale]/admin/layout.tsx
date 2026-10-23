import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminNav, type AdminNavGroup } from "@/components/admin/admin-nav";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Link } from "@/i18n/navigation";
import type { Permission } from "@/lib/auth/permissions";
import { requireStaff } from "@/lib/auth/session";
import { unreadNotifications } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/admin">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "meta" });
  return { title: t("admin"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

type Entry = { href: string; key: string; needs?: Permission[] };

const GROUPS: { key: string; items: Entry[] }[] = [
  { key: "workspace", items: [{ href: "/admin", key: "overview" }, { href: "/admin/tasks", key: "tasks" }, { href: "/admin/notifications", key: "notifications" }] },
  {
    key: "stock",
    items: [
      { href: "/admin/inventory", key: "inventory", needs: ["inventory.read"] },
      { href: "/admin/prices", key: "prices", needs: ["inventory.price_approve"] },
    ],
  },
  {
    key: "sales",
    items: [
      { href: "/admin/leads", key: "leads", needs: ["leads.read_all", "leads.read_own"] },
      { href: "/admin/customers", key: "customers", needs: ["customers.read", "leads.read_own"] },
      { href: "/admin/sales", key: "salesRecords", needs: ["sales.read", "sales.create"] },
    ],
  },
  {
    key: "bookings",
    items: [
      { href: "/admin/calendar", key: "calendar", needs: ["bookings.read"] },
      { href: "/admin/requests/test-drives", key: "test_drive", needs: ["bookings.read"] },
      { href: "/admin/requests/reservations", key: "reservation", needs: ["reservations.read"] },
      { href: "/admin/requests/service", key: "service", needs: ["bookings.read"] },
    ],
  },
  {
    key: "requests",
    items: [
      { href: "/admin/requests/inquiries", key: "inquiry", needs: ["inquiries.read"] },
      { href: "/admin/requests/financing", key: "financing", needs: ["finance.read"] },
      { href: "/admin/requests/trade-ins", key: "trade_in", needs: ["tradein.read"] },
    ],
  },
  {
    key: "management",
    items: [
      { href: "/admin/analytics", key: "analytics", needs: ["analytics.read"] },
      { href: "/admin/team", key: "team", needs: ["team.read"] },
      { href: "/admin/settings", key: "settings", needs: ["settings.update"] },
      { href: "/admin/audit", key: "audit", needs: ["audit.read"] },
    ],
  },
];

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-6 py-24">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="display mt-6 text-[clamp(2.4rem,5vw,4rem)]">{t("setupTitle")}</h1>
        <p className="mt-8 leading-[1.8] text-muted [overflow-wrap:anywhere]">{t("setupText")}</p>
        <Link href="/" className="mt-12 text-[11px] tracking-[0.24em] uppercase underline underline-offset-8">
          {t("nav.viewSite")}
        </Link>
      </main>
    );
  }

  const staff = await requireStaff(locale);
  const [dealership, unread, tRoles] = await Promise.all([getDealership(), unreadNotifications(staff.user.id), getTranslations("roles")]);
  const groups: AdminNavGroup[] = GROUPS.map((group) => ({
    key: group.key,
    items: group.items
      .filter((item) => !item.needs || item.needs.some((permission) => staff.can(permission)))
      .map((item) => ({ href: item.href, key: item.key, badge: item.key === "notifications" ? unread : undefined })),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className="bg-obsidian px-5 py-4 text-white lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-64 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:px-6 lg:py-8">
        <div className="flex items-center justify-between gap-4 lg:block">
          <div>
            <Link href="/admin" className="font-display text-xl">
              Auto<span className="italic text-champagne">Lux</span>
            </Link>
            <p className="mt-1 text-[10px] tracking-[0.24em] uppercase text-white/40">{dealership.name}</p>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/admin/notifications" aria-label={t("nav.notifications")} className="relative inline-flex size-10 items-center justify-center">
              <Bell className="size-4" aria-hidden />
              {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-champagne" />}
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <div className="mt-4 lg:mt-8">
          <AdminNav groups={groups} />
        </div>
        <div className="mt-auto hidden space-y-4 border-t border-white/10 pt-6 lg:block">
          <div className="flex items-center justify-between">
            <LocaleSwitcher className="flex" />
            <ThemeToggle />
          </div>
          <Link href="/account" className="block text-xs text-white/70 hover:text-white">
            {staff.user.fullName ?? staff.user.email}
            <span className="mt-1 block text-[10px] tracking-[0.2em] uppercase text-champagne/80">{tRoles(staff.role)}</span>
          </Link>
          <Link href="/" className="block text-[11px] tracking-[0.2em] uppercase text-white/45 hover:text-champagne">
            {t("nav.viewSite")}
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
