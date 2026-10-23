"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { bulkInventory } from "@/lib/actions/inventory";
import type { AdminVehicleRow } from "@/lib/data/admin";
import { VEHICLE_PLACEHOLDER } from "@/lib/cars";
import { formatDate, formatMileage, formatPrice } from "@/lib/format";
import { ActionButton } from "./admin-client";

const TONE: Record<string, string> = {
  available: "text-emerald-600 dark:text-emerald-400",
  reserved: "text-accent",
  draft: "text-muted",
  sold: "text-ink",
  archived: "text-muted",
};

export function InventoryTable({ rows, canPublish, canArchive }: { rows: AdminVehicleRow[]; canPublish: boolean; canArchive: boolean }) {
  const t = useTranslations("admin.inventory");
  const tStatus = useTranslations("statuses.vehicle");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const bulk = canPublish || canArchive;
  const ids = [...selected];

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const after = (data: { updated: number; failed: number }) => {
    setMessage(t("bulkDone", data));
    setSelected(new Set());
  };

  return (
    <div>
      {bulk && selected.size > 0 && (
        <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 border border-line bg-card p-3 text-sm">
          <span className="mr-2">{t("selected", { count: selected.size })}</span>
          {canPublish && (
            <>
              <ActionButton action={() => bulkInventory({ action: "publish", ids })} confirm={t("bulkConfirm", { action: t("bulkPublish"), count: selected.size })} onDone={after}>
                {t("bulkPublish")}
              </ActionButton>
              <ActionButton action={() => bulkInventory({ action: "unpublish", ids })} confirm={t("bulkConfirm", { action: t("bulkUnpublish"), count: selected.size })} onDone={after}>
                {t("bulkUnpublish")}
              </ActionButton>
            </>
          )}
          {canArchive && (
            <ActionButton variant="danger" action={() => bulkInventory({ action: "archive", ids })} confirm={t("bulkConfirm", { action: t("bulkArchive"), count: selected.size })} onDone={after}>
              {t("bulkArchive")}
            </ActionButton>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="mb-4 text-sm text-muted">
          {message}
        </p>
      )}
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((row) => {
          const cover = [...row.vehicle_media].sort((a, b) => a.position - b.position)[0]?.url ?? VEHICLE_PLACEHOLDER;
          const name = `${row.year} ${row.make} ${row.model}`;
          return (
            <li key={row.id} className="flex items-center gap-3 py-3 md:gap-5">
              {bulk && (
                <input
                  type="checkbox"
                  aria-label={t("select", { name })}
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                  className="size-4 shrink-0 accent-[var(--color-champagne)]"
                />
              )}
              <div className="relative hidden aspect-[4/3] w-24 shrink-0 overflow-hidden bg-mist sm:block">
                <Image src={cover} alt="" fill sizes="96px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/inventory/${row.id}`} className="font-medium hover:text-accent">
                  {name}
                </Link>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span className={TONE[row.status]}>{tStatus(row.status)}</span>
                  <span>{row.published ? t("publishedYes") : t("publishedNo")}</span>
                  {row.featured && <span className="text-accent">{t("featuredBadge")}</span>}
                  <span>{formatMileage(row.mileage, "km")}</span>
                  <span>{t("updatedOn", { date: formatDate(row.updated_at) })}</span>
                </p>
              </div>
              <p className="shrink-0 text-right text-sm font-medium tabular-nums">{formatPrice(row.price)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
