"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getVehicleUuid } from "@/lib/data/vehicles";
import { isRequestKind } from "@/lib/domain";
import { siteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  profileSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validation/schemas";
import { type ActionResult, dbError, fail, ok, safeLocale } from "./shared";

const logAuthError = (scope: string, error: { status?: number; code?: string; message?: string } | null) => {
  if (error) console.error(JSON.stringify({ level: "error", scope, status: error.status ?? null, code: error.code ?? null, message: error.message ?? null }));
};

const confirmUrl = (next: string) => `${siteUrl()}/api/auth/confirm?next=${encodeURIComponent(next)}`;

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (!error) return ok(null);
  if (error.code === "email_not_confirmed") return fail("email_not_confirmed");
  if (error.code === "invalid_credentials") return fail("invalid_credentials");
  if (error.status === 429) return fail("rate_limited");
  return fail("generic");
}

export async function signUp(input: unknown, locale: string): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  const lang = safeLocale(locale);
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.name, locale: lang }, emailRedirectTo: confirmUrl(`/${lang}/account`) },
  });
  if (!error) return ok(null);
  logAuthError("auth.sign_up", error);
  if (error.code === "weak_password") return fail("invalid", { password: "passwordLength" });
  if (error.status === 429) return fail("rate_limited");
  return fail("generic");
}

export async function requestPasswordReset(input: unknown, locale: string): Promise<ActionResult> {
  const parsed = resetRequestSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl(`/${safeLocale(locale)}/auth/update-password`),
  });
  logAuthError("auth.password_reset", error);
  if (error?.status === 429) return fail("rate_limited");
  return ok(null);
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  if (!(await getSessionUser())) return fail("auth_required");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  return error ? fail(error.code === "same_password" ? "same_password" : "generic") : ok(null);
}

export async function signOut(locale: string) {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect({ href: "/", locale: safeLocale(locale) });
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser();
  if (!supabase || !user) return fail("auth_required");
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null, locale: parsed.data.locale })
    .eq("id", user.id);
  if (error) return fail(dbError(error));
  revalidatePath("/[locale]/account", "page");
  return ok(null);
}

export async function syncFavorite(slug: string, active: boolean): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser();
  if (!supabase || !user) return fail("auth_required");
  const vehicleId = await getVehicleUuid(slug);
  if (!vehicleId) return fail("not_found");
  const { error } = active
    ? await supabase.from("favorites").upsert({ user_id: user.id, vehicle_id: vehicleId }, { ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", user.id).eq("vehicle_id", vehicleId);
  return error ? fail(dbError(error)) : ok(null);
}

export async function importFavorites(slugs: string[]): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser();
  if (!supabase || !user) return fail("auth_required");
  const ids = await Promise.all(slugs.filter((slug) => /^[a-z0-9-]{3,80}$/.test(slug)).slice(0, 50).map(getVehicleUuid));
  const rows = ids.filter((id): id is string => Boolean(id)).map((id) => ({ user_id: user.id, vehicle_id: id }));
  if (rows.length === 0) return ok(null);
  const { error } = await supabase.from("favorites").upsert(rows, { ignoreDuplicates: true });
  return error ? fail(dbError(error)) : ok(null);
}

const CANCELLABLE = ["test_drive", "reservation", "service"];

export async function cancelMyRequest(kind: string, id: string): Promise<ActionResult> {
  if (!isRequestKind(kind) || !CANCELLABLE.includes(kind) || !/^[0-9a-f-]{36}$/.test(id)) return fail("invalid");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  const { error } = await supabase.rpc("cancel_my_request", { p_kind: kind, p_id: id });
  if (error) return fail(dbError(error));
  revalidatePath("/[locale]/account", "page");
  return ok(null);
}

export async function acceptInvitation(token: string): Promise<ActionResult> {
  if (!/^[0-9a-f]{64}$/.test(token)) return fail("invitation_invalid");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  if (!(await getSessionUser())) return fail("auth_required");
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  return error ? fail(dbError(error)) : ok(null);
}
