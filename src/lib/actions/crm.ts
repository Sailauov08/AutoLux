"use server";

import { getDealership } from "@/lib/data/dealership";
import { fromDateTimeLocal } from "@/lib/format";
import { fieldErrors } from "@/lib/validation/schemas";
import { activitySchema, assignSchema, customerSchema, leadUpdateSchema, manualLeadSchema, taskSchema } from "@/lib/validation/admin";
import { type ActionResult, dbError, fail } from "./shared";
import { result, staffAction } from "./staff";

const iso = async (value: string) => (value ? fromDateTimeLocal(value, (await getDealership()).timezone) : null);
const uuid = (value: string) => /^[0-9a-f-]{36}$/.test(value);

export async function createLead(input: unknown): Promise<ActionResult<{ id: string }>> {
  return staffAction("leads.create", async ({ supabase, dealershipId }) => {
    const parsed = manualLeadSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const v = parsed.data;
    const { data, error } = await supabase.rpc("create_manual_lead", {
      p_dealership: dealershipId,
      p_name: v.name,
      p_email: v.email,
      p_phone: v.phone,
      p_vehicle: v.vehicleId,
      p_source: v.source,
      p_assignee: v.assignee,
      p_note: v.note,
    });
    return result(error, { id: data as string });
  });
}

export async function updateLead(input: unknown): Promise<ActionResult> {
  return staffAction("leads.update", async ({ supabase }) => {
    const parsed = leadUpdateSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const v = parsed.data;
    const { data, error } = await supabase
      .from("leads")
      .update({
        stage: v.stage,
        follow_up_at: await iso(v.followUpAt),
        vehicle_id: v.vehicleId,
        negotiation_price: v.negotiationPrice === "" ? null : v.negotiationPrice,
        lost_reason: v.stage === "lost" ? v.lostReason : null,
      })
      .eq("id", v.id)
      .eq("version", v.version)
      .select("id");
    if (error) return fail(dbError(error));
    if (!data?.length) return fail("conflict");
    return result(null, null);
  });
}

export async function assignLead(input: unknown): Promise<ActionResult> {
  return staffAction("leads.assign", async ({ supabase }) => {
    const parsed = assignSchema.safeParse(input);
    if (!parsed.success) return fail("invalid");
    const { data, error } = await supabase.from("leads").update({ assigned_to: parsed.data.assignee }).eq("id", parsed.data.id).select("id");
    if (error) return fail(dbError(error));
    return data?.length ? result(null, null) : fail("not_found");
  });
}

export async function logActivity(input: unknown): Promise<ActionResult> {
  return staffAction("leads.update", async ({ supabase, dealershipId, user }) => {
    const parsed = activitySchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const { error } = await supabase.from("lead_activities").insert({
      dealership_id: dealershipId,
      lead_id: parsed.data.leadId,
      actor_id: user.id,
      kind: parsed.data.kind,
      body: parsed.data.body,
    });
    return result(error, null);
  });
}

export async function createTask(input: unknown): Promise<ActionResult> {
  return staffAction(null, async ({ supabase, dealershipId, user, can }) => {
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const v = parsed.data;
    const assignee = v.assignee ?? user.id;
    if (assignee !== user.id && !can("tasks.manage")) return fail("forbidden");
    const { error } = await supabase.from("staff_tasks").insert({
      dealership_id: dealershipId,
      assigned_to: assignee,
      title: v.title,
      notes: v.notes || null,
      due_at: await iso(v.dueAt),
      lead_id: v.leadId,
    });
    return result(error, null);
  });
}

export async function setTaskDone(id: string, completed: boolean): Promise<ActionResult> {
  return staffAction(null, async ({ supabase }) => {
    if (!uuid(id)) return fail("invalid");
    const { data, error } = await supabase.from("staff_tasks").update({ completed_at: completed ? new Date().toISOString() : null }).eq("id", id).select("id");
    if (error) return fail(dbError(error));
    return data?.length ? result(null, null) : fail("not_found");
  });
}

export async function deleteTask(id: string): Promise<ActionResult> {
  return staffAction(null, async ({ supabase }) => {
    if (!uuid(id)) return fail("invalid");
    const { data, error } = await supabase.from("staff_tasks").delete().eq("id", id).select("id");
    if (error) return fail(dbError(error));
    return data?.length ? result(null, null) : fail("not_found");
  });
}

export async function updateCustomer(input: unknown): Promise<ActionResult> {
  return staffAction("customers.update", async ({ supabase }) => {
    const parsed = customerSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const v = parsed.data;
    const { data, error } = await supabase
      .from("customers")
      .update({ full_name: v.fullName, email: v.email || null, phone: v.phone || null, locale: v.locale, notes: v.notes || null })
      .eq("id", v.id)
      .eq("version", v.version)
      .select("id");
    if (error) return fail(dbError(error, "email_taken"), error.code === "23505" ? { email: "emailTaken" } : undefined);
    return data?.length ? result(null, null) : fail("conflict");
  });
}

export async function anonymizeCustomer(id: string): Promise<ActionResult> {
  return staffAction("customers.delete", async ({ supabase }) => {
    if (!uuid(id)) return fail("invalid");
    const { error } = await supabase.rpc("anonymize_customer", { p_customer: id });
    return result(error, null);
  });
}
