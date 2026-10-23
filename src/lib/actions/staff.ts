import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Permission } from "@/lib/auth/permissions";
import { getSessionUser, getStaff, type Staff } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionResult, dbError, fail, ok } from "./shared";

export type StaffContext = Staff & { supabase: SupabaseClient };

export async function staffAction<T>(
  permission: Permission | Permission[] | null,
  run: (ctx: StaffContext) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  if (!(await getSessionUser())) return fail("auth_required");
  const staff = await getStaff();
  if (!staff) return fail("forbidden");
  const needed = permission ? (Array.isArray(permission) ? permission : [permission]) : [];
  if (needed.length && !needed.some((item) => staff.can(item))) {
    await supabase.rpc("log_security_event", { p_dealership: staff.dealershipId, p_action: needed.join("|"), p_detail: "server_action" });
    return fail("forbidden");
  }
  try {
    return await run({ ...staff, supabase });
  } catch (error) {
    console.error(JSON.stringify({ level: "error", scope: "staff_action", message: error instanceof Error ? error.name : "unknown" }));
    return fail("generic");
  }
}

export const result = <T>(error: { code?: string; message?: string; hint?: string } | null, data: T, duplicate?: string): ActionResult<T> => {
  if (error) return fail(dbError(error, duplicate));
  refreshAdmin();
  return ok(data);
};

export const refreshAdmin = () => revalidatePath("/[locale]/admin", "layout");
export const refreshSite = () => revalidatePath("/", "layout");
