import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Panel } from "@/components/admin/admin-ui";
import { TaskForm, TaskList } from "@/components/admin/task-controls";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getStaffDirectory, listTasks, param } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";

export default async function TasksPage({ params, searchParams }: PageProps<"/[locale]/admin/tasks">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale);
  const query = await searchParams;
  const scope = param(query.scope) === "team" && staff.can("tasks.read_all") ? "team" : "mine";
  const done = param(query.view) === "done";
  const [t, dealership, directory, tasks] = await Promise.all([
    getTranslations("admin.tasks"),
    getDealership(),
    getStaffDirectory(staff.dealershipId),
    listTasks(staff.dealershipId, { scope, userId: staff.user.id, done }),
  ]);
  const names = Object.fromEntries(directory.map((member) => [member.user_id, member.full_name]));
  const tab = (active: boolean) => `border-b-2 px-1 pb-2 text-[11px] tracking-[0.18em] uppercase ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`;

  return (
    <div className="space-y-8">
      <AdminHeader title={t("title")} />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="mb-4 flex flex-wrap gap-6">
            <Link href={{ pathname: "/admin/tasks", query: { scope: "mine", view: done ? "done" : "open" } }} className={tab(scope === "mine")}>
              {t("mine")}
            </Link>
            {staff.can("tasks.read_all") && (
              <Link href={{ pathname: "/admin/tasks", query: { scope: "team", view: done ? "done" : "open" } }} className={tab(scope === "team")}>
                {t("team")}
              </Link>
            )}
            <span className="mx-2 h-5 w-px bg-line" aria-hidden />
            <Link href={{ pathname: "/admin/tasks", query: { scope, view: "open" } }} className={tab(!done)}>
              {t("open")}
            </Link>
            <Link href={{ pathname: "/admin/tasks", query: { scope, view: "done" } }} className={tab(done)}>
              {t("done")}
            </Link>
          </div>
          <TaskList tasks={tasks} timeZone={dealership.timezone} names={names} />
        </Panel>
        <Panel title={t("new")}>
          <TaskForm staff={directory.map((member) => ({ id: member.user_id, name: member.full_name }))} canAssign={staff.can("tasks.manage")} selfId={staff.user.id} />
        </Panel>
      </div>
    </div>
  );
}
