"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormAlert } from "@/components/forms/form-status";
import { addRequestNote, assignRequest, rescheduleAppointment, setRequestStatus } from "@/lib/actions/operations";
import type { RequestKind, RequestStatus } from "@/lib/domain";
import { adminButton, Field, inputClass, Saved, SubmitButton, useAction, useFieldError } from "./admin-client";

const NEXT: Record<string, RequestStatus[]> = {
  new: ["in_progress", "confirmed", "rejected", "cancelled"],
  in_progress: ["confirmed", "completed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled"],
};

export function nextStatuses(kind: RequestKind, status: string) {
  return (NEXT[status] ?? []).filter((next) => !(kind === "reservation" && next === "completed"));
}

export function StatusControl({ kind, id, status, version }: { kind: RequestKind; id: string; status: string; version: number }) {
  const t = useTranslations("admin.requests");
  const { pending, error, run } = useAction();
  const [note, setNote] = useState("");
  const options = nextStatuses(kind, status);
  if (options.length === 0) return <p className="text-sm text-muted">{t("closed")}</p>;
  return (
    <div className="space-y-3">
      <Field label={t("statusNote")}>
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} className={inputClass} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {options.map((next) => (
          <button
            key={next}
            type="button"
            disabled={pending}
            onClick={() => run(() => setRequestStatus({ kind, id, status: next, version, note }), () => setNote(""))}
            className={adminButton(next === "confirmed" || next === "completed" ? "primary" : next === "rejected" || next === "cancelled" ? "danger" : "outline")}
          >
            {t(`actions.${next}`)}
          </button>
        ))}
      </div>
      {kind === "reservation" && status !== "confirmed" && <p className="text-xs text-muted">{t("reservationHint")}</p>}
      <FormAlert code={error} />
    </div>
  );
}

export function RequestAssign({ kind, id, assignee, staff }: { kind: RequestKind; id: string; assignee: string | null; staff: { id: string; label: string }[] }) {
  const tc = useTranslations("admin.common");
  const { pending, error, run } = useAction();
  return (
    <div className="space-y-2">
      <select
        aria-label={tc("assignee")}
        value={assignee ?? ""}
        disabled={pending}
        onChange={(event) => run(() => assignRequest({ kind, id, assignee: event.target.value }))}
        className={inputClass}
      >
        <option value="">{tc("unassigned")}</option>
        {staff.map((member) => (
          <option key={member.id} value={member.id}>
            {member.label}
          </option>
        ))}
      </select>
      <FormAlert code={error} />
    </div>
  );
}

export function RequestNote({ kind, id }: { kind: RequestKind; id: string }) {
  const t = useTranslations("admin.requests");
  const { pending, error, fields, run } = useAction();
  const fieldError = useFieldError(fields);
  const [key, setKey] = useState(0);
  return (
    <form
      key={key}
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const body = String(new FormData(event.currentTarget).get("body") ?? "");
        run(() => addRequestNote({ kind, id, body }), () => setKey((value) => value + 1));
      }}
    >
      <Field label={t("addNote")} error={fieldError("body")}>
        <textarea name="body" required rows={2} maxLength={2000} className={`${inputClass} h-auto py-2`} />
      </Field>
      <SubmitButton pending={pending} variant="outline">
        {t("saveNote")}
      </SubmitButton>
      <FormAlert code={error} />
    </form>
  );
}

export function RescheduleForm({ kind, id, version, slots, date }: { kind: "test_drive" | "service"; id: string; version: number; slots: string[]; date: string }) {
  const t = useTranslations("admin.requests");
  const { pending, error, fields, done, run } = useAction();
  const fieldError = useFieldError(fields);
  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        run(() => rescheduleAppointment({ kind, id, version, date: data.get("date"), slot: data.get("slot") }));
      }}
    >
      <Field label={t("newDate")} error={fieldError("date")}>
        <input name="date" type="date" required defaultValue={date} className={inputClass} />
      </Field>
      <Field label={t("newTime")} error={fieldError("slot")}>
        <select name="slot" required className={inputClass}>
          {slots.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </Field>
      <SubmitButton pending={pending} variant="outline">
        {t("reschedule")}
      </SubmitButton>
      <div className="sm:col-span-3">
        <Saved show={done} />
        <FormAlert code={error} />
      </div>
    </form>
  );
}
