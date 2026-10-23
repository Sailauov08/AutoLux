import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export function AdminHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-6 border-b border-line pb-8 md:flex-row md:items-end">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display mt-3 text-[clamp(2rem,4vw,3.2rem)] break-words">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-[1.7] text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: string | number; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-[10px] tracking-[0.24em] uppercase text-muted">{label}</p>
      <p className="font-display mt-3 text-3xl tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block bg-card p-5 transition-colors hover:bg-mist">
      {body}
    </Link>
  ) : (
    <div className="bg-card p-5">{body}</div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

export function Panel({ title, description, actions, children, className = "" }: { title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`border border-line bg-card p-5 md:p-7 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[11px] font-medium tracking-[0.24em] uppercase text-accent">{title}</h2>}
            {description && <p className="mt-2 max-w-xl text-xs leading-[1.6] text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="border border-dashed border-line px-6 py-12 text-center text-sm text-muted">{children}</p>;
}

export function Table({ children, minWidth = 720 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
      <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const th = "border-b border-line py-3 pr-4 text-[10px] font-medium tracking-[0.2em] uppercase text-muted whitespace-nowrap";
export const td = "border-b border-line py-3.5 pr-4 align-top";

const TONES: Record<string, string> = {
  new: "border-champagne/60 text-accent",
  in_progress: "border-sky-500/50 text-sky-600 dark:text-sky-300",
  confirmed: "border-emerald-500/50 text-emerald-600 dark:text-emerald-300",
  completed: "border-line text-muted",
  cancelled: "border-line text-muted line-through",
  rejected: "border-red-500/40 text-red-600 dark:text-red-400",
  draft: "border-line text-muted",
  available: "border-emerald-500/50 text-emerald-600 dark:text-emerald-300",
  reserved: "border-champagne/60 text-accent",
  sold: "border-ink/40 text-ink",
  archived: "border-line text-muted",
  pending: "border-champagne/60 text-accent",
  active: "border-emerald-500/50 text-emerald-600 dark:text-emerald-300",
  suspended: "border-red-500/40 text-red-600 dark:text-red-400",
  won: "border-emerald-500/50 text-emerald-600 dark:text-emerald-300",
  lost: "border-red-500/40 text-red-600 dark:text-red-400",
};

export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-medium tracking-[0.14em] whitespace-nowrap uppercase ${TONES[tone] ?? "border-line text-muted"}`}>
      {children}
    </span>
  );
}

export function KeyValues({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-px bg-line text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="bg-card px-4 py-3">
          <dt className="text-[10px] tracking-[0.2em] uppercase text-muted">{label}</dt>
          <dd className="mt-1 break-words">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export async function Pagination({ page, pages, total, pathname, query }: { page: number; pages: number; total: number; pathname: string; query: Record<string, string> }) {
  const t = await getTranslations("admin.common");
  const href = (target: number) => ({ pathname, query: { ...query, page: String(target) } });
  const link = "inline-flex size-9 items-center justify-center border border-line hover:border-accent";
  return (
    <nav aria-label={t("pagination")} className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
      <span>{t("total", { count: total })}</span>
      {pages > 1 && (
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link href={href(page - 1)} aria-label={t("previous")} className={link}>
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          ) : null}
          <span>{t("pageOf", { page, pages })}</span>
          {page < pages ? (
            <Link href={href(page + 1)} aria-label={t("next")} className={link}>
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      )}
    </nav>
  );
}

export function FilterBar({ children, action }: { children: React.ReactNode; action?: string }) {
  return (
    <form method="get" action={action} className="flex flex-wrap items-end gap-3 border-b border-line py-5">
      {children}
    </form>
  );
}

export const filterInput = "h-10 border border-line bg-card px-3 text-sm text-ink outline-none focus:border-accent";
export const filterLabel = "flex flex-col gap-1.5 text-[10px] tracking-[0.2em] uppercase text-muted";
export const filterButton = "h-10 border border-ink bg-ink px-5 text-[11px] tracking-[0.2em] uppercase text-page hover:bg-accent hover:border-accent";
