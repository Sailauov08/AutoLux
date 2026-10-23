import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { FieldErrors } from "@/lib/validation/schemas";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string; fields?: FieldErrors };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string, fields?: FieldErrors): ActionResult<never> => ({ ok: false, error, fields });

const KNOWN = [
  "rate_limited",
  "invalid_date",
  "vehicle_unavailable",
  "vehicle_reserved",
  "auth_required",
  "forbidden",
  "service_disabled",
  "not_found",
  "conflict",
  "invalid_transition",
  "archive_instead",
  "media_limit",
  "reason_required",
  "self_approval",
  "use_sale",
  "invalid_assignee",
  "consent_required",
  "last_owner",
  "already_member",
  "invitation_invalid",
  "invitation_email",
  "email_not_confirmed",
  "suspended",
  "slot_taken",
];

export function dbError(error: { code?: string; message?: string; hint?: string } | null, duplicate = "duplicate") {
  const text = `${error?.hint ?? ""} ${error?.message ?? ""}`;
  const known = KNOWN.find((code) => text.includes(code));
  if (known) return known;
  if (error?.code === "23505") return duplicate;
  if (error?.code === "23514" || error?.code === "22P02" || error?.code === "23502") return "invalid";
  if (error?.code === "42501" || error?.code === "PGRST301") return "forbidden";
  if (error?.code === "23503") return "in_use";
  console.error(JSON.stringify({ level: "error", scope: "supabase", code: error?.code ?? null }));
  return "generic";
}

export async function fingerprint() {
  const list = await headers();
  const ip = (list.get("x-forwarded-for") ?? list.get("x-real-ip") ?? "").split(",")[0].trim();
  return createHash("sha256").update(`${ip}|${list.get("user-agent") ?? ""}`).digest("hex").slice(0, 32);
}

export const LOCALES = ["kk", "ru", "en"] as const;
export const safeLocale = (value: string) => ((LOCALES as readonly string[]).includes(value) ? value : "kk");
