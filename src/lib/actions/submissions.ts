"use server";

import { getSessionUser } from "@/lib/auth/session";
import { getVehicleUuid } from "@/lib/data/vehicles";
import { dealershipSlug } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  contactSchema,
  fieldErrors,
  financingSchema,
  reservationSchema,
  serviceSchema,
  testDriveSchema,
  tradeInSchema,
} from "@/lib/validation/schemas";
import { type ActionResult, dbError, fail, fingerprint, ok, safeLocale } from "./shared";

type Reference = { reference: string };

async function vehicleUuid(slug: string) {
  return slug ? getVehicleUuid(slug) : null;
}

export async function submitContact(input: unknown, locale: string): Promise<ActionResult<Reference>> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  const v = parsed.data;
  const { data, error } = await supabase.rpc("submit_inquiry", {
    p_dealership: dealershipSlug(),
    p_name: v.name,
    p_email: v.email,
    p_phone: v.phone,
    p_topic: v.topic,
    p_message: v.message,
    p_vehicle: null,
    p_locale: safeLocale(locale),
    p_fingerprint: await fingerprint(),
    p_consent: v.consent,
  });
  return error ? fail(dbError(error)) : ok({ reference: data as string });
}

export async function submitTestDrive(input: unknown, locale: string): Promise<ActionResult<Reference>> {
  const parsed = testDriveSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  const v = parsed.data;
  const vehicle = await vehicleUuid(v.vehicleId);
  if (!vehicle) return fail("vehicle_unavailable");
  const { data, error } = await supabase.rpc("submit_test_drive", {
    p_dealership: dealershipSlug(),
    p_vehicle: vehicle,
    p_date: v.date,
    p_slot: v.slot,
    p_name: v.name,
    p_email: v.email,
    p_phone: v.phone,
    p_notes: v.notes,
    p_locale: safeLocale(locale),
    p_fingerprint: await fingerprint(),
    p_consent: v.consent,
  });
  return error ? fail(dbError(error, "duplicate_request")) : ok({ reference: data as string });
}

export async function submitTradeIn(input: unknown, locale: string): Promise<ActionResult<Reference & { low: number; high: number }>> {
  const parsed = tradeInSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  const v = parsed.data;
  const { data, error } = await supabase.rpc("submit_trade_in", {
    p_dealership: dealershipSlug(),
    p_make: v.brand,
    p_model: v.model,
    p_year: v.year,
    p_mileage: v.mileage,
    p_condition: v.condition,
    p_name: v.name,
    p_email: v.email,
    p_phone: v.phone,
    p_locale: safeLocale(locale),
    p_fingerprint: await fingerprint(),
    p_consent: v.consent,
  });
  if (error) return fail(dbError(error));
  const result = data as { reference: string; low: number; high: number };
  return ok({ reference: result.reference, low: Number(result.low), high: Number(result.high) });
}

export async function submitFinancing(input: unknown, locale: string): Promise<ActionResult<Reference>> {
  const parsed = financingSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  const v = parsed.data;
  const { data, error } = await supabase.rpc("submit_financing", {
    p_dealership: dealershipSlug(),
    p_vehicle: await vehicleUuid(v.vehicleId),
    p_price: v.price,
    p_down: v.downPayment,
    p_term: v.term,
    p_name: v.name,
    p_email: v.email,
    p_phone: v.phone,
    p_locale: safeLocale(locale),
    p_fingerprint: await fingerprint(),
    p_consent: v.consent,
  });
  return error ? fail(dbError(error)) : ok({ reference: data as string });
}

export async function submitService(input: unknown, locale: string): Promise<ActionResult<Reference>> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  const v = parsed.data;
  const { data, error } = await supabase.rpc("submit_service", {
    p_dealership: dealershipSlug(),
    p_vehicle_description: v.vehicleDescription,
    p_service_type: v.serviceType,
    p_date: v.date,
    p_slot: v.slot,
    p_name: v.name,
    p_email: v.email,
    p_phone: v.phone,
    p_notes: v.notes,
    p_locale: safeLocale(locale),
    p_fingerprint: await fingerprint(),
    p_consent: v.consent,
  });
  return error ? fail(dbError(error, "duplicate_request")) : ok({ reference: data as string });
}

export async function requestReservation(input: unknown, locale: string): Promise<ActionResult<Reference>> {
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("unconfigured");
  if (!(await getSessionUser())) return fail("auth_required");
  const v = parsed.data;
  const vehicle = await vehicleUuid(v.vehicleId);
  if (!vehicle) return fail("vehicle_unavailable");
  const { data, error } = await supabase.rpc("request_reservation", {
    p_dealership: dealershipSlug(),
    p_vehicle: vehicle,
    p_phone: v.phone,
    p_message: v.message,
    p_locale: safeLocale(locale),
    p_consent: v.consent,
  });
  return error ? fail(dbError(error, "duplicate_request")) : ok({ reference: data as string });
}
