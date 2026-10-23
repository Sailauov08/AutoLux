"use client";

import { Check, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormAlert } from "@/components/forms/form-status";
import { Link } from "@/i18n/navigation";
import { createTask, deleteTask, setTaskDone } from "@/lib/actions/crm";
import type { TaskRow } from "@/lib/data/admin";
import { formatDateTime, isPast } from "@/lib/format";
import { Field, inputClass, SubmitButton, useAction, useFieldError } from "./admin-client";

export function TaskList({ tasks, timeZone, names, compact = false }: { tasks: TaskRow[]; timeZone: string; names: Record<string, string>; compact?: boolean }) {
  const t = useTranslations("admin.tasks");
  const { pending, error, run } = useAction();
  if (tasks.length === 0) return <p className="py-6 text-sm text-muted">{t("empty")}</p>;
  return (
    <div>
      <ul className="divide-y divide-line">
        {tasks.map((task) => {
          const overdue = !task.completed_at && isPast(task.due_at);
          return (
            <li key={task.id} className="flex items-start gap-3 py-3 text-sm">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setTaskDone(task.id, !task.completed_at))}
                aria-label={task.completed_at ? t("reopen") : t("complete")}
                title={task.completed_at ? t("reopen") : t("complete")}
                className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center border ${task.completed_at ? "border-emerald-500 text-emerald-600" : "border-line hover:border-accent"}`}
              >
                {task.completed_at ? <RotateCcw className="size-3" aria-hidden /> : <Check className="size-3 opacity-40" aria-hidden />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={task.completed_at ? "text-muted line-through" : ""}>{task.title}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                  {task.due_at && <span className={overdue ? "text-red-600 dark:text-red-400" : ""}>{formatDateTime(task.due_at, timeZone)}{overdue ? ` · ${t("overdue")}` : ""}</span>}
                  {!compact && names[task.assigned_to] && <span>{names[task.assigned_to]}</span>}
                  {task.lead_id && (
                    <Link href={`/admin/leads/${task.lead_id}`} className="underline underline-offset-2">
                      {t("lead")}
                    </Link>
                  )}
                </p>
                {!compact && task.notes && <p className="mt-1 text-xs text-muted">{task.notes}</p>}
              </div>
              {!compact && (
                <button type="button" disabled={pending} onClick={() => run(() => deleteTask(task.id))} aria-label={t("delete")} title={t("delete")} className="text-muted hover:text-red-600">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <FormAlert code={error} />
    </div>
  );
}

export function TaskForm({ staff, leadId, canAssign, selfId }: { staff: { id: string; name: string }[]; leadId?: string; canAssign: boolean; selfId: string }) {
  const t = useTranslations("admin.tasks");
  const tc = useTranslations("admin.common");
  const { pending, error, fields, done, run } = useAction();
  const fieldError = useFieldError(fields);
  const [key, setKey] = useState(0);

  return (
    <form
      key={key}
      className="grid grid-cols-1 gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
        run(() => createTask({ title: data.title, notes: data.notes ?? "", dueAt: data.dueAt ?? "", assignee: data.assignee ?? "", leadId: leadId ?? "" }), () => setKey((value) => value + 1));
      }}
    >
      <Field label={t("titleField")} error={fieldError("title")} className="md:col-span-2">
        <input name="title" required maxLength={200} className={inputClass} />
      </Field>
      <Field label={t("due")} error={fieldError("dueAt")}>
        <input name="dueAt" type="datetime-local" className={inputClass} />
      </Field>
      {canAssign ? (
        <Field label={t("assignee")}>
          <select name="assignee" defaultValue={selfId} className={inputClass}>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="assignee" value={selfId} />
      )}
      <Field label={tc("notes")} className="md:col-span-2">
        <textarea name="notes" maxLength={2000} rows={2} className={`${inputClass} h-auto py-2`} />
      </Field>
      <div className="flex flex-wrap items-center gap-4 md:col-span-2">
        <SubmitButton pending={pending}>{t("new")}</SubmitButton>
        {done && <span className="text-xs text-emerald-600">{tc("saved")}</span>}
      </div>
      <div className="md:col-span-2">
        <FormAlert code={error} />
      </div>
    </form>
  );
}
