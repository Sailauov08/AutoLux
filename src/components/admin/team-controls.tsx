"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FormAlert } from "@/components/forms/form-status";
import { inviteStaff, removeMember, revokeInvitation, setMemberRole, setMemberStatus, updateRolePermissions } from "@/lib/actions/team";
import { PERMISSION_GROUPS, type StaffRole } from "@/lib/auth/permissions";
import { ActionButton, adminButton, Field, inputClass, Saved, SubmitButton, useAction, useFieldError } from "./admin-client";

export function InviteForm({ roles }: { roles: StaffRole[] }) {
  const t = useTranslations("admin.team");
  const tRoles = useTranslations("roles");
  const locale = useLocale();
  const { pending, error, fields, run } = useAction();
  const fieldError = useFieldError(fields);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4">
      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setCopied(false);
          run(() => inviteStaff({ email: data.get("email"), role: data.get("role") }, locale), (result) => setLink(result.link));
        }}
      >
        <Field label={t("email")} error={fieldError("email")}>
          <input name="email" type="email" required maxLength={254} autoComplete="off" className={inputClass} />
        </Field>
        <Field label={t("role")}>
          <select name="role" defaultValue={roles.includes("sales_rep") ? "sales_rep" : roles[0]} className={inputClass}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {tRoles(role)}
              </option>
            ))}
          </select>
        </Field>
        <SubmitButton pending={pending}>{t("send")}</SubmitButton>
      </form>
      <p className="text-xs text-muted">{t("inviteHint")}</p>
      <FormAlert code={error} />
      {link && (
        <div className="space-y-2 border border-champagne/50 bg-page p-4">
          <p className="text-xs text-muted">{t("linkReady")}</p>
          <code className="block break-all text-xs">{link}</code>
          <button
            type="button"
            className={adminButton("outline")}
            onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true), () => setCopied(false))}
          >
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      )}
    </div>
  );
}

export function MemberControls({ userId, role, status, roles }: { userId: string; role: StaffRole; status: string; roles: StaffRole[] }) {
  const t = useTranslations("admin.team");
  const tRoles = useTranslations("roles");
  const { pending, error, run } = useAction();
  if (!roles.includes(role)) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label={t("role")}
        value={role}
        disabled={pending}
        onChange={(event) => run(() => setMemberRole({ userId, role: event.target.value }))}
        className={`${inputClass} h-9 w-auto`}
      >
        {roles.map((option) => (
          <option key={option} value={option}>
            {tRoles(option)}
          </option>
        ))}
      </select>
      {status === "active" ? (
        <ActionButton variant="danger" className="h-9" confirm={t("suspendConfirm")} action={() => setMemberStatus({ userId, status: "suspended" })}>
          {t("suspend")}
        </ActionButton>
      ) : (
        <ActionButton className="h-9" action={() => setMemberStatus({ userId, status: "active" })}>
          {t("reactivate")}
        </ActionButton>
      )}
      <ActionButton variant="ghost" className="h-9" confirm={t("removeConfirm")} action={() => removeMember(userId)}>
        {t("remove")}
      </ActionButton>
      <FormAlert code={error} />
    </div>
  );
}

export function RevokeInvitationButton({ id }: { id: string }) {
  const t = useTranslations("admin.team");
  return (
    <ActionButton variant="ghost" className="h-9" confirm={t("revokeConfirm")} action={() => revokeInvitation(id)}>
      {t("revoke")}
    </ActionButton>
  );
}

export function PermissionMatrix({ roles, granted, editable }: { roles: StaffRole[]; granted: Record<string, string[]>; editable: boolean }) {
  const t = useTranslations("admin.team");
  const tRoles = useTranslations("roles");
  const [role, setRole] = useState<StaffRole>(roles[0]);
  const [selection, setSelection] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(Object.entries(granted).map(([key, values]) => [key, new Set(values)])),
  );
  const { pending, error, done, run, setDone } = useAction();
  const current = selection[role] ?? new Set<string>();

  const toggle = (permission: string) => {
    setDone(false);
    setSelection((state) => {
      const next = new Set(state[role] ?? []);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return { ...state, [role]: next };
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("role")}>
        {roles.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={item === role}
            onClick={() => setRole(item)}
            className={adminButton(item === role ? "primary" : "outline", "h-9")}
          >
            {tRoles(item)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => (
          <fieldset key={group}>
            <legend className="eyebrow mb-3">{t(`permissionGroups.${group}`)}</legend>
            <ul className="space-y-2">
              {permissions.map((permission) => (
                <li key={permission}>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={!editable || role === "owner"}
                      checked={role === "owner" || current.has(permission)}
                      onChange={() => toggle(permission)}
                      className="mt-1 accent-[var(--color-champagne)]"
                    />
                    <span>{t(`permissionNames.${permission.replace(".", "_")}`)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>
      {editable && role !== "owner" && (
        <div className="flex items-center gap-4">
          <button type="button" disabled={pending} className={adminButton("primary")} onClick={() => run(() => updateRolePermissions({ role, permissions: [...current] }))}>
            {t("savePermissions", { role: tRoles(role) })}
          </button>
          <Saved show={done} />
        </div>
      )}
      <FormAlert code={error} />
    </div>
  );
}
