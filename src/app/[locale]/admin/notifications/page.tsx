import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionButton } from "@/components/admin/admin-client";
import { AdminHeader, Empty, Pagination } from "@/components/admin/admin-ui";
import { Link } from "@/i18n/navigation";
import { markNotificationsRead } from "@/lib/actions/team";
import { requireStaff } from "@/lib/auth/session";
import { listNotifications, toPage } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { REQUEST_KINDS, isRequestKind } from "@/lib/domain";
import { formatDateTime, formatPrice } from "@/lib/format";

type Payload = Record<string, string | number | boolean | undefined>;

function target(kind: string, payload: Payload) {
  if ((kind === "lead_new" || kind === "lead_assigned") && payload.lead_id) return `/admin/leads/${payload.lead_id}`;
  if ((kind === "request_new" || kind === "request_assigned") && typeof payload.kind === "string" && isRequestKind(payload.kind))
    return `/admin/requests/${REQUEST_KINDS[payload.kind].slug}/${payload.request_id}`;
  if (kind.startsWith("price") && payload.vehicle_id) return `/admin/inventory/${payload.vehicle_id}`;
  if (kind === "task_assigned") return "/admin/tasks";
  return null;
}

export default async function NotificationsPage({ params, searchParams }: PageProps<"/[locale]/admin/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale);
  const page = toPage((await searchParams).page);
  const [t, tNav, tSources, dealership, list] = await Promise.all([
    getTranslations("admin.notifications"),
    getTranslations("admin.nav"),
    getTranslations("admin.leads.sources"),
    getDealership(),
    listNotifications(staff.user.id, page),
  ]);

  const describe = (rawKind: string, payload: Payload) => {
    const kind = rawKind.replace(".", "_");
    const requestKind = typeof payload.kind === "string" && isRequestKind(payload.kind) ? tNav(payload.kind) : "";
    const values = {
      source: typeof payload.source === "string" && tSources.has(payload.source) ? tSources(payload.source) : "",
      kind: requestKind,
      reference: String(payload.reference ?? ""),
      title: String(payload.title ?? ""),
      vehicle: String(payload.vehicle ?? ""),
      price: typeof payload.price === "number" ? formatPrice(payload.price) : "",
      result: payload.approved ? t("approved") : t("rejected"),
    };
    return { kind, text: t.has(`kinds.${kind}`) ? t(`kinds.${kind}`, values) : kind };
  };

  return (
    <div className="space-y-8">
      <AdminHeader title={t("title")}>
        {list.rows.some((row) => !row.read_at) && <ActionButton action={markNotificationsRead.bind(null, "all")}>{t("markAllRead")}</ActionButton>}
      </AdminHeader>
      {list.rows.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {list.rows.map((row) => {
            const { kind, text } = describe(row.kind, row.payload as Payload);
            const href = target(kind, row.payload as Payload);
            return (
              <li key={row.id} className={`flex flex-wrap items-baseline justify-between gap-3 px-1 py-4 text-sm ${row.read_at ? "text-muted" : ""}`}>
                <span className="flex items-baseline gap-3">
                  {!row.read_at && <span aria-label={t("unreadOne")} className="size-2 shrink-0 translate-y-[-1px] rounded-full bg-champagne" />}
                  {href ? (
                    <Link href={href} className="hover:text-accent hover:underline">
                      {text}
                    </Link>
                  ) : (
                    text
                  )}
                </span>
                <span className="text-xs tabular-nums text-muted">{formatDateTime(row.created_at, dealership.timezone)}</span>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={list.page} pages={list.pages} total={list.total} pathname="/admin/notifications" query={{}} />
    </div>
  );
}
