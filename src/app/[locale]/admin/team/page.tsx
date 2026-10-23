import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminHeader, Badge, Empty, Panel, Table, td, th } from "@/components/admin/admin-ui";
import { InviteForm, MemberControls, PermissionMatrix, RevokeInvitationButton } from "@/components/admin/team-controls";
import { manageableRoles, STAFF_ROLES } from "@/lib/auth/permissions";
import { requireStaff } from "@/lib/auth/session";
import { getRolePermissions, listInvitations, listMembers } from "@/lib/data/admin";
import { getDealership } from "@/lib/data/dealership";
import { formatDate, formatDateTime } from "@/lib/format";

export default async function TeamPage({ params }: PageProps<"/[locale]/admin/team">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await requireStaff(locale, "team.read");
  const canManage = staff.can("team.manage");
  const [t, tRoles, dealership, members, invitations, rolePermissions] = await Promise.all([
    getTranslations("admin.team"),
    getTranslations("roles"),
    getDealership(),
    listMembers(staff.dealershipId),
    canManage ? listInvitations(staff.dealershipId) : Promise.resolve([]),
    getRolePermissions(staff.dealershipId),
  ]);
  const roles = manageableRoles(staff.role, staff.permissions);
  const tz = dealership.timezone;
  const granted = Object.fromEntries(STAFF_ROLES.map((role) => [role, [...(rolePermissions.get(role) ?? [])]]));

  return (
    <div className="space-y-8">
      <AdminHeader title={t("title")} description={t("description")} />

      {canManage && roles.length > 0 && (
        <Panel title={t("invite")}>
          <InviteForm roles={roles} />
        </Panel>
      )}

      <Panel title={t("members")}>
        <Table minWidth={760}>
          <thead>
            <tr>
              <th className={th}>{t("name")}</th>
              <th className={th}>{t("role")}</th>
              <th className={th}>{t("status")}</th>
              <th className={th}>{t("since")}</th>
              {canManage && <th className={th}>{t("actions")}</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.user_id}>
                <td className={td}>
                  {member.full_name ?? "—"}
                  {member.user_id === staff.user.id && <span className="ml-2 text-xs text-accent">{t("you")}</span>}
                  <span className="block text-xs text-muted">{member.email}</span>
                </td>
                <td className={td}>{tRoles(member.role)}</td>
                <td className={td}>
                  <Badge tone={member.status}>{t(`statuses.${member.status}`)}</Badge>
                </td>
                <td className={`${td} tabular-nums text-muted`}>{formatDate(member.created_at, tz)}</td>
                {canManage && (
                  <td className={td}>
                    {member.user_id !== staff.user.id && <MemberControls userId={member.user_id} role={member.role} status={member.status} roles={roles} />}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>

      {canManage && (
        <Panel title={t("pending")}>
          {invitations.length === 0 ? (
            <Empty>{t("noPending")}</Empty>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span>
                    {invitation.email} · {tRoles(invitation.role)}
                    <span className="block text-xs text-muted">{t("expires", { date: formatDateTime(invitation.expires_at, tz) })}</span>
                  </span>
                  {roles.includes(invitation.role) && <RevokeInvitationButton id={invitation.id} />}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Panel title={t("permissions")} description={t("permissionsHint")}>
        <PermissionMatrix roles={[...STAFF_ROLES]} granted={granted} editable={staff.role === "owner"} />
      </Panel>
    </div>
  );
}
