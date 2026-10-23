"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";

export type AdminNavGroup = { key: string; items: { href: string; key: string; badge?: number }[] };

export function AdminNav({ groups }: { groups: AdminNavGroup[] }) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="admin-menu"
        className="inline-flex h-10 items-center gap-2 border border-white/15 px-3 text-[11px] tracking-[0.18em] uppercase lg:hidden"
      >
        {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
        {t("menu")}
      </button>
      <nav id="admin-menu" aria-label={t("label")} className={`${open ? "block" : "hidden"} mt-4 lg:mt-0 lg:block`}>
        {groups.map((group) => (
          <div key={group.key} className="mb-5">
            <p className="pb-2 text-[10px] tracking-[0.28em] uppercase text-white/35">{t(group.key)}</p>
            <ul>
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active(item.href) ? "page" : undefined}
                    className={`flex items-center justify-between gap-3 border-l-2 px-3 py-2 text-[13px] transition-colors ${
                      active(item.href) ? "border-champagne bg-white/[0.04] text-white" : "border-transparent text-white/60 hover:text-white"
                    }`}
                  >
                    {t(item.key)}
                    {item.badge ? <span className="min-w-5 bg-champagne px-1.5 text-center text-[10px] font-semibold text-obsidian tabular-nums">{item.badge}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
