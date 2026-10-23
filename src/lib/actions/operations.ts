"use server";

import type { Permission } from "@/lib/auth/permissions";
import { REQUEST_KINDS, type RequestKind } from "@/lib/domain";
import { fieldErrors } from "@/lib/validation/schemas";
import {
  requestAssignSchema,
  requestNoteSchema,
  requestStatusSchema,
  rescheduleSchema,
  saleCancelSchema,
  saleCorrectionSchema,
  saleSchema,
} from "@/lib/validation/admin";
import { type ActionResult, fail } from "./shared";
import { refreshSite, result, staffAction } from "./staff";

const updatePermission = (kind: RequestKind) => `${REQUEST_KINDS[kind].permission}.update` as Permission;
const kindOf = (input: unknown) => {
  const kind = (input as { kind?: string } | null)?.kind;
  return kind && kind in REQUEST_KINDS ? (kind as RequestKind) : null;
};

export async function recordSale(input: unknown): Promise<ActionResult<{ id: string }>> {
  return staffAction("sales.create", async ({ supabase }) => {
    const parsed = saleSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const v = parsed.data;
    const { data, error } = await supabase.rpc("record_sale", {
      p_vehicle: v.vehicleId,
      p_customer: v.customerId,
      p_lead: v.leadId,
      p_salesperson: v.salespersonId,
      p_price: v.price,
      p_sale_date: v.saleDate,
      p_status: v.status,
      p_notes: v.notes,
    });
    if (!error) refreshSite();
    return result(error, { id: data as string }, "vehicle_unavailable");
  });
}

export async function completeSale(id: string, version: number): Promise<ActionResult> {
  return staffAction("sales.update", async ({ supabase }) => {
    if (!/^[0-9a-f-]{36}$/.test(id) || !Number.isInteger(version)) return fail("invalid");
    const { error } = await supabase.rpc("complete_sale", { p_sale: id, p_version: version });
    if (!error) refreshSite();
    return result(error, null);
  });
}

export async function correctSale(input: unknown): Promise<ActionResult> {
  return staffAction("sales.update", async ({ supabase }) => {
    const parsed = saleCorrectionSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const v = parsed.data;
    const { error } = await supabase.rpc("correct_sale", {
      p_sale: v.id,
      p_version: v.version,
      p_price: v.price,
      p_sale_date: v.saleDate,
      p_salesperson: v.salespersonId,
      p_notes: v.notes,
      p_reason: v.reason,
    });
    return result(error, null);
  });
}

export async function cancelSale(input: unknown): Promise<ActionResult> {
  return staffAction("sales.cancel", async ({ supabase }) => {
    const parsed = saleCancelSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const { error } = await supabase.rpc("cancel_sale", { p_sale: parsed.data.id, p_version: parsed.data.version, p_reason: parsed.data.reason });
    if (!error) refreshSite();
    return result(error, null);
  });
}

export async function setRequestStatus(input: unknown): Promise<ActionResult> {
  const kind = kindOf(input);
  if (!kind) return fail("invalid");
  return staffAction(updatePermission(kind), async ({ supabase }) => {
    const parsed = requestStatusSchema.safeParse(input);
    if (!parsed.success) return fail("invalid");
    const v = parsed.data;
    const { error } = await supabase.rpc("set_request_status", { p_kind: v.kind, p_id: v.id, p_status: v.status, p_version: v.version, p_note: v.note });
    if (!error && kind === "reservation") refreshSite();
    return result(error, null, "slot_taken");
  });
}

export async function assignRequest(input: unknown): Promise<ActionResult> {
  const kind = kindOf(input);
  if (!kind) return fail("invalid");
  return staffAction(updatePermission(kind), async ({ supabase }) => {
    const parsed = requestAssignSchema.safeParse(input);
    if (!parsed.success) return fail("invalid");
    const { error } = await supabase.rpc("assign_request", { p_kind: parsed.data.kind, p_id: parsed.data.id, p_user: parsed.data.assignee });
    return result(error, null);
  });
}

export async function addRequestNote(input: unknown): Promise<ActionResult> {
  const kind = kindOf(input);
  if (!kind) return fail("invalid");
  return staffAction(updatePermission(kind), async ({ supabase }) => {
    const parsed = requestNoteSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const { error } = await supabase.rpc("add_request_note", { p_kind: parsed.data.kind, p_id: parsed.data.id, p_body: parsed.data.body });
    return result(error, null);
  });
}

export async function rescheduleAppointment(input: unknown): Promise<ActionResult> {
  return staffAction("bookings.update", async ({ supabase }) => {
    const parsed = rescheduleSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const v = parsed.data;
    const { error } = await supabase.rpc("reschedule_appointment", { p_kind: v.kind, p_id: v.id, p_date: v.date, p_slot: v.slot, p_version: v.version });
    return result(error, null, "slot_taken");
  });
}
