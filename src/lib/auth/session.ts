import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { getDealershipId } from "@/lib/data/dealership";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isStaffRole, type Permission, type StaffRole } from "./permissions";

export type SessionUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  fullName: string | null;
  phone: string | null;
  locale: string;
};

export type Staff = {
  user: SessionUser;
  dealershipId: string;
  role: StaffRole;
  permissions: ReadonlySet<string>;
  can: (permission: Permission) => boolean;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name, phone, locale").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    email: user.email ?? "",
    emailConfirmed: Boolean(user.email_confirmed_at),
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    locale: profile?.locale ?? "kk",
  };
});

export const getStaff = cache(async (): Promise<Staff | null> => {
  const user = await getSessionUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return null;
  const dealershipId = await getDealershipId();
  if (!dealershipId) return null;
  const [{ data: membership }, { data: permissions }] = await Promise.all([
    supabase.from("memberships").select("role, status").eq("dealership_id", dealershipId).eq("user_id", user.id).maybeSingle(),
    supabase.rpc("my_permissions", { p_dealership: dealershipId }),
  ]);
  if (!membership || membership.status !== "active" || !isStaffRole(membership.role)) return null;
  const granted = new Set<string>((permissions as string[] | null) ?? []);
  return { user, dealershipId, role: membership.role, permissions: granted, can: (permission) => granted.has(permission) };
});

export async function requireUser(locale: string, next: string) {
  const user = await getSessionUser();
  if (!user) return redirect({ href: { pathname: "/auth/sign-in", query: { next } }, locale });
  return user;
}

export async function requireStaff(locale: string, permission?: Permission | Permission[]) {
  await requireUser(locale, "/admin");
  const staff = await getStaff();
  if (!staff) return redirect({ href: "/account", locale });
  const needed = permission ? (Array.isArray(permission) ? permission : [permission]) : [];
  if (needed.length && !needed.some((item) => staff.can(item))) return redirect({ href: "/admin", locale });
  return staff;
}
