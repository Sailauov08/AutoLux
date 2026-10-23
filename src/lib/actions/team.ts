"use server";

import { randomUUID } from "node:crypto";
import { siteUrl } from "@/lib/supabase/config";
import { fieldErrors } from "@/lib/validation/schemas";
import { inviteSchema, memberRoleSchema, memberStatusSchema, rolePermissionsSchema, settingsSchema } from "@/lib/validation/admin";
import { type ActionResult, dbError, fail, ok, safeLocale } from "./shared";
import { refreshAdmin, refreshSite, result, staffAction } from "./staff";

const LOGO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function inviteStaff(input: unknown, locale: string): Promise<ActionResult<{ link: string }>> {
  return staffAction("team.manage", async ({ supabase, dealershipId }) => {
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const { data, error } = await supabase.rpc("create_invitation", { p_dealership: dealershipId, p_email: parsed.data.email, p_role: parsed.data.role });
    if (error) return fail(dbError(error));
    refreshAdmin();
    return ok({ link: `${siteUrl()}/${safeLocale(locale)}/invite/${data as string}` });
  });
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  return staffAction("team.manage", async ({ supabase }) => {
    if (!/^[0-9a-f-]{36}$/.test(id)) return fail("invalid");
    const { error } = await supabase.rpc("revoke_invitation", { p_invitation: id });
    return result(error, null);
  });
}

export async function setMemberRole(input: unknown): Promise<ActionResult> {
  return staffAction("team.manage", async ({ supabase, dealershipId }) => {
    const parsed = memberRoleSchema.safeParse(input);
    if (!parsed.success) return fail("invalid");
    const { error } = await supabase.rpc("set_member_role", { p_dealership: dealershipId, p_user: parsed.data.userId, p_role: parsed.data.role });
    return result(error, null);
  });
}

export async function setMemberStatus(input: unknown): Promise<ActionResult> {
  return staffAction("team.manage", async ({ supabase, dealershipId }) => {
    const parsed = memberStatusSchema.safeParse(input);
    if (!parsed.success) return fail("invalid");
    const { error } = await supabase.rpc("set_member_status", { p_dealership: dealershipId, p_user: parsed.data.userId, p_status: parsed.data.status });
    return result(error, null);
  });
}

export async function removeMember(userId: string): Promise<ActionResult> {
  return staffAction("team.manage", async ({ supabase, dealershipId }) => {
    if (!/^[0-9a-f-]{36}$/.test(userId)) return fail("invalid");
    const { error } = await supabase.rpc("remove_member", { p_dealership: dealershipId, p_user: userId });
    return result(error, null);
  });
}

export async function updateRolePermissions(input: unknown): Promise<ActionResult> {
  return staffAction("team.manage", async ({ supabase, dealershipId, role }) => {
    if (role !== "owner") return fail("forbidden");
    const parsed = rolePermissionsSchema.safeParse(input);
    if (!parsed.success) return fail("invalid");
    const { error } = await supabase.rpc("update_role_permissions", { p_dealership: dealershipId, p_role: parsed.data.role, p_permissions: parsed.data.permissions });
    return result(error, null);
  });
}

export async function saveSettings(input: unknown): Promise<ActionResult> {
  return staffAction("settings.update", async ({ supabase, dealershipId }) => {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const v = parsed.data;
    const { data, error } = await supabase
      .from("dealerships")
      .update({
        name: v.name,
        legal_name: v.legalName || null,
        phone: v.phone || null,
        email: v.email || null,
        whatsapp: v.whatsapp || null,
        address: v.address,
        maps_url: v.mapsUrl || null,
        hours: Object.fromEntries(Object.entries(v.hours).filter(([, time]) => time)),
        socials: v.socials,
        services: v.services,
        currency: v.currency,
        timezone: v.timezone,
        show_sold_vehicles: v.showSoldVehicles,
        price_approval_required: v.priceApprovalRequired,
        booking_slots: [...new Set(v.bookingSlots)].sort(),
        booking_window_days: v.bookingWindowDays,
        reservation_hold_hours: v.reservationHoldHours,
        service_capacity: v.serviceCapacity,
        service_enabled: v.serviceEnabled,
        test_drive_enabled: v.testDriveEnabled,
        notify_new_leads: v.notifyNewLeads,
        notification_email: v.notificationEmail || null,
        retention_months: v.retentionMonths,
      })
      .eq("id", dealershipId)
      .select("id");
    if (error) return fail(dbError(error));
    if (!data?.length) return fail("forbidden");
    refreshSite();
    return result(null, null);
  });
}

export async function uploadLogo(formData: FormData): Promise<ActionResult> {
  return staffAction("settings.update", async ({ supabase, dealershipId }) => {
    const file = formData.get("file");
    if (!(file instanceof File) || !LOGO_TYPES[file.type]) return fail("image_type");
    if (file.size === 0 || file.size > 2 * 1024 * 1024) return fail("image_size");
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const ascii = String.fromCharCode(...head);
    const valid =
      (file.type === "image/jpeg" && head[0] === 0xff && head[1] === 0xd8) ||
      (file.type === "image/png" && ascii.slice(1, 4) === "PNG") ||
      (file.type === "image/webp" && ascii.slice(8, 12) === "WEBP");
    if (!valid) return fail("image_type");
    const bucket = supabase.storage.from("dealership-assets");
    const path = `${dealershipId}/${randomUUID()}.${LOGO_TYPES[file.type]}`;
    const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return fail("upload_failed");
    const { data: previous } = await supabase.rpc("dealership_admin_settings", { p_dealership: dealershipId });
    const { error } = await supabase.from("dealerships").update({ logo_url: bucket.getPublicUrl(path).data.publicUrl, logo_path: path }).eq("id", dealershipId);
    if (error) {
      await bucket.remove([path]);
      return fail(dbError(error));
    }
    const oldPath = (previous as { logo_url?: string } | null)?.logo_url?.split("/dealership-assets/")[1];
    if (oldPath) await bucket.remove([oldPath]);
    refreshSite();
    return result(null, null);
  });
}

export async function markNotificationsRead(ids: number[] | "all"): Promise<ActionResult> {
  return staffAction(null, async ({ supabase, user }) => {
    let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    if (ids !== "all") {
      if (!ids.every(Number.isInteger) || ids.length > 100) return fail("invalid");
      query = query.in("id", ids);
    }
    const { error } = await query;
    return result(error, null);
  });
}
