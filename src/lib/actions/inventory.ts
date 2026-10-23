"use server";

import { randomUUID } from "node:crypto";
import { fieldErrors } from "@/lib/validation/schemas";
import {
  bulkSchema,
  createVehicleSchema,
  mediaMetaSchema,
  mediaOrderSchema,
  priceSchema,
  publicationSchema,
  transitionSchema,
  updateVehicleSchema,
  vehiclePrivateSchema,
} from "@/lib/validation/admin";
import { type ActionResult, dbError, fail, ok } from "./shared";
import { refreshAdmin, refreshSite, staffAction } from "./staff";

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const BUCKET = "vehicle-media";

const compact = (value: Record<string, string>) => Object.fromEntries(Object.entries(value).filter(([, text]) => text.length > 0));

function vehicleRow(v: ReturnType<typeof updateVehicleSchema.parse> | ReturnType<typeof createVehicleSchema.parse>) {
  return {
    slug: v.slug,
    make: v.make,
    model: v.model,
    generation: v.generation || null,
    trim_level: v.trimLevel || null,
    year: v.year,
    mileage: v.mileage,
    fuel: v.fuel,
    transmission: v.transmission,
    drivetrain: v.drivetrain,
    body_type: v.bodyType,
    engine: v.engine,
    horsepower: v.horsepower,
    exterior_color: v.exteriorColor,
    interior_color: v.interiorColor || null,
    condition: v.condition,
    badges: v.badges,
    description: compact(v.description),
  };
}

const done = <T>(data: T) => {
  refreshAdmin();
  refreshSite();
  return ok(data);
};

export async function createVehicle(input: unknown): Promise<ActionResult<{ id: string }>> {
  return staffAction("inventory.create", async ({ supabase, dealershipId }) => {
    const parsed = createVehicleSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const { data, error } = await supabase
      .from("vehicles")
      .insert({ ...vehicleRow(parsed.data), price: parsed.data.price, dealership_id: dealershipId })
      .select("id")
      .single();
    if (error) return fail(dbError(error, "slug_taken"), error.code === "23505" ? { slug: "slugTaken" } : undefined);
    const equipment = parsed.data.equipment.map(compact);
    const { error: equipmentError } = await supabase.rpc("replace_vehicle_equipment", { p_vehicle: data.id, p_labels: equipment });
    if (equipmentError) return fail(dbError(equipmentError));
    return done({ id: data.id as string });
  });
}

export async function updateVehicle(input: unknown): Promise<ActionResult> {
  return staffAction("inventory.update", async ({ supabase }) => {
    const parsed = updateVehicleSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const v = parsed.data;
    const { data, error } = await supabase.from("vehicles").update(vehicleRow(v)).eq("id", v.id).eq("version", v.version).select("id");
    if (error) return fail(dbError(error, "slug_taken"), error.code === "23505" ? { slug: "slugTaken" } : undefined);
    if (!data?.length) return fail("conflict");
    const { error: equipmentError } = await supabase.rpc("replace_vehicle_equipment", { p_vehicle: v.id, p_labels: v.equipment.map(compact) });
    if (equipmentError) return fail(dbError(equipmentError));
    return done(null);
  });
}

export async function transitionVehicle(input: unknown): Promise<ActionResult> {
  return staffAction(["inventory.update", "inventory.delete"], async ({ supabase }) => {
    const parsed = transitionSchema.safeParse(input);
    if (!parsed.success) return fail("invalid");
    const { error } = await supabase.rpc("transition_vehicle", { p_vehicle: parsed.data.id, p_status: parsed.data.status, p_version: parsed.data.version });
    return error ? fail(dbError(error)) : done(null);
  });
}

export async function setPublication(input: unknown): Promise<ActionResult> {
  return staffAction("inventory.publish", async ({ supabase }) => {
    const parsed = publicationSchema.safeParse(input);
    if (!parsed.success) return fail("invalid");
    const v = parsed.data;
    const { data, error } = await supabase
      .from("vehicles")
      .update({ published: v.published, featured: v.published && v.featured })
      .eq("id", v.id)
      .eq("version", v.version)
      .select("id");
    if (error) return fail(dbError(error));
    if (!data?.length) return fail("conflict");
    return done(null);
  });
}

export async function changePrice(input: unknown): Promise<ActionResult<{ outcome: "applied" | "requested" }>> {
  return staffAction(["inventory.price", "inventory.price_request", "inventory.price_approve"], async ({ supabase }) => {
    const parsed = priceSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const v = parsed.data;
    const { data, error } = await supabase.rpc("change_vehicle_price", { p_vehicle: v.id, p_price: v.price, p_reason: v.reason, p_version: v.version });
    return error ? fail(dbError(error)) : done({ outcome: data as "applied" | "requested" });
  });
}

export async function decidePriceRequest(id: string, approve: boolean): Promise<ActionResult> {
  return staffAction("inventory.price_approve", async ({ supabase }) => {
    if (!/^[0-9a-f-]{36}$/.test(id)) return fail("invalid");
    const { error } = await supabase.rpc("decide_price_request", { p_request: id, p_approve: approve });
    return error ? fail(dbError(error)) : done(null);
  });
}

export async function saveVehiclePrivate(input: unknown): Promise<ActionResult> {
  return staffAction("inventory.private", async ({ supabase, dealershipId }) => {
    const parsed = vehiclePrivateSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error));
    const v = parsed.data;
    const { error } = await supabase.from("vehicle_private").upsert({
      vehicle_id: v.vehicleId,
      dealership_id: dealershipId,
      vin: v.vin || null,
      stock_number: v.stockNumber || null,
      internal_notes: v.internalNotes || null,
    });
    if (error) return fail(dbError(error, "vin_taken"), error.code === "23505" ? { vin: "vinTaken" } : undefined);
    refreshAdmin();
    return ok(null);
  });
}

export async function deleteDraftVehicle(id: string): Promise<ActionResult> {
  return staffAction("inventory.delete", async ({ supabase }) => {
    if (!/^[0-9a-f-]{36}$/.test(id)) return fail("invalid");
    const { data: media } = await supabase.from("vehicle_media").select("storage_path").eq("vehicle_id", id);
    const { data, error } = await supabase.from("vehicles").delete().eq("id", id).select("id");
    if (error) return fail(dbError(error));
    if (!data?.length) return fail("not_found");
    const paths = (media ?? []).map((item) => item.storage_path).filter((path): path is string => Boolean(path));
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    return done(null);
  });
}

export async function bulkInventory(input: unknown): Promise<ActionResult<{ updated: number; failed: number }>> {
  return staffAction(["inventory.publish", "inventory.delete"], async ({ supabase, can }) => {
    const parsed = bulkSchema.safeParse(input);
    if (!parsed.success) return fail("invalid");
    const { action, ids } = parsed.data;
    if (action === "archive" ? !can("inventory.delete") : !can("inventory.publish")) return fail("forbidden");
    const { data: rows, error } = await supabase.from("vehicles").select("id, status, version, published").in("id", ids);
    if (error) return fail(dbError(error));
    let updated = 0;
    for (const row of rows ?? []) {
      const response =
        action === "archive"
          ? await supabase.rpc("transition_vehicle", { p_vehicle: row.id, p_status: "archived", p_version: row.version })
          : row.published === (action === "publish") || !["available", "reserved", "sold"].includes(row.status)
            ? { error: { code: "skip" } }
            : await supabase.from("vehicles").update({ published: action === "publish", ...(action === "unpublish" ? { featured: false } : {}) }).eq("id", row.id).eq("version", row.version);
      if (!response.error) updated += 1;
    }
    refreshAdmin();
    refreshSite();
    return ok({ updated, failed: ids.length - updated });
  });
}

async function looksLikeImage(file: File) {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = String.fromCharCode(...head);
  return (
    (file.type === "image/jpeg" && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) ||
    (file.type === "image/png" && head[0] === 0x89 && ascii.slice(1, 4) === "PNG") ||
    (file.type === "image/webp" && ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP") ||
    (file.type === "image/avif" && ascii.slice(4, 8) === "ftyp" && /avi[fs]/.test(ascii.slice(8, 12)))
  );
}

export async function uploadVehicleMedia(formData: FormData): Promise<ActionResult> {
  return staffAction("media.update", async ({ supabase, dealershipId }) => {
    const vehicleId = String(formData.get("vehicleId") ?? "");
    const meta = mediaMetaSchema.safeParse({ kind: formData.get("kind") ?? "exterior", source: formData.get("source") ?? "dealer" });
    const file = formData.get("file");
    if (!/^[0-9a-f-]{36}$/.test(vehicleId) || !meta.success) return fail("invalid");
    if (!(file instanceof File) || !IMAGE_TYPES[file.type]) return fail("image_type");
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return fail("image_size");
    if (!(await looksLikeImage(file))) return fail("image_type");

    const { data: vehicle } = await supabase.from("vehicles").select("id").eq("id", vehicleId).eq("dealership_id", dealershipId).maybeSingle();
    if (!vehicle) return fail("not_found");

    const path = `${dealershipId}/${vehicleId}/${randomUUID()}.${IMAGE_TYPES[file.type]}`;
    const bucket = supabase.storage.from(BUCKET);
    const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    if (uploadError) return fail("upload_failed");

    const { data: last } = await supabase.from("vehicle_media").select("position").eq("vehicle_id", vehicleId).order("position", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("vehicle_media").insert({
      dealership_id: dealershipId,
      vehicle_id: vehicleId,
      kind: meta.data.kind,
      source: meta.data.source,
      url: bucket.getPublicUrl(path).data.publicUrl,
      storage_path: path,
      position: last ? last.position + 1 : 0,
    });
    if (error) {
      await bucket.remove([path]);
      return fail(dbError(error));
    }
    return done(null);
  });
}

export async function deleteVehicleMedia(id: string): Promise<ActionResult> {
  return staffAction("media.update", async ({ supabase }) => {
    if (!/^[0-9a-f-]{36}$/.test(id)) return fail("invalid");
    const { data, error } = await supabase.from("vehicle_media").delete().eq("id", id).select("storage_path");
    if (error) return fail(dbError(error));
    if (!data?.length) return fail("not_found");
    if (data[0].storage_path) await supabase.storage.from(BUCKET).remove([data[0].storage_path]);
    return done(null);
  });
}

export async function reorderVehicleMedia(input: unknown): Promise<ActionResult> {
  return staffAction("media.update", async ({ supabase }) => {
    const parsed = mediaOrderSchema.safeParse(input);
    if (!parsed.success) return fail("invalid");
    const { error } = await supabase.rpc("reorder_vehicle_media", { p_vehicle: parsed.data.vehicleId, p_media: parsed.data.ids });
    return error ? fail(dbError(error)) : done(null);
  });
}

export async function updateMediaMeta(id: string, input: unknown): Promise<ActionResult> {
  return staffAction("media.update", async ({ supabase }) => {
    const parsed = mediaMetaSchema.safeParse(input);
    if (!parsed.success || !/^[0-9a-f-]{36}$/.test(id)) return fail("invalid");
    const { error } = await supabase.from("vehicle_media").update(parsed.data).eq("id", id);
    return error ? fail(dbError(error)) : done(null);
  });
}
