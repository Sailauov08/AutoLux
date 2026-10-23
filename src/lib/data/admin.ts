import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { StaffRole } from "@/lib/auth/permissions";
import { REQUEST_KINDS, type RequestKind } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Localized } from "./vehicles";

export const PAGE_SIZE = 25;

async function db(): Promise<SupabaseClient> {
  const client = await createSupabaseServerClient();
  if (!client) throw new Error("Supabase is not configured");
  return client;
}

function must<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export type Paged<T> = { rows: T[]; total: number; page: number; pages: number };

const pageRange = (page: number) => [(page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1] as const;

function paged<T>(result: { data: unknown; error: { message: string } | null; count: number | null }, page: number): Paged<T> {
  const rows = must<T[]>(result);
  const total = result.count ?? rows.length;
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

const searchTerm = (value?: string) => (value ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 80);

export const toPage = (value: string | string[] | undefined) => {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

// Overview & shared ---------------------------------------------------------------

export type Overview = {
  inventory?: { total: number; draft: number; available: number; reserved: number; sold: number; published: number; unpublishedAvailable: number };
  pendingPrices?: number;
  requests: Partial<Record<RequestKind, number>>;
  upcomingTestDrives?: number;
  pipeline?: Record<string, number>;
  overdueFollowUps?: number;
  unassignedLeads?: number | null;
  salesThisMonth?: { count: number; pending: number; value: number | null };
  myTasks: { open: number; overdue: number };
};

export async function getOverview(dealershipId: string) {
  return must<Overview>(await (await db()).rpc("dealership_overview", { p_dealership: dealershipId }));
}

export const getStaffDirectory = cache(async (dealershipId: string) =>
  must<{ user_id: string; full_name: string; role: StaffRole }[]>(await (await db()).rpc("staff_directory", { p_dealership: dealershipId })),
);

export async function staffNames(dealershipId: string) {
  return new Map((await getStaffDirectory(dealershipId)).map((member) => [member.user_id, member.full_name]));
}

export async function getRecentActivity(dealershipId: string, limit = 12) {
  return must<{ id: number; kind: string; body: string | null; meta: Record<string, unknown>; created_at: string; actor_id: string | null; lead: { id: string; customer: { full_name: string } | null } | null }[]>(
    await (await db())
      .from("lead_activities")
      .select("id, kind, body, meta, created_at, actor_id, lead:leads(id, customer:customers(full_name))")
      .eq("dealership_id", dealershipId)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

export async function getUpcomingAppointments(dealershipId: string, days = 7) {
  const client = await db();
  const to = new Date(Date.now() + days * 86_400_000).toISOString();
  const now = new Date().toISOString();
  const [drives, service] = await Promise.all([
    client
      .from("test_drives")
      .select("id, reference, starts_at, status, contact, vehicle:vehicles(make, model)")
      .eq("dealership_id", dealershipId)
      .in("status", ["new", "in_progress", "confirmed"])
      .gte("starts_at", now)
      .lte("starts_at", to)
      .order("starts_at")
      .limit(20),
    client
      .from("service_appointments")
      .select("id, reference, starts_at, status, contact, service_type")
      .eq("dealership_id", dealershipId)
      .in("status", ["new", "in_progress", "confirmed"])
      .gte("starts_at", now)
      .lte("starts_at", to)
      .order("starts_at")
      .limit(20),
  ]);
  return {
    testDrives: (drives.data ?? []) as unknown as { id: string; reference: string; starts_at: string; status: string; contact: { name?: string }; vehicle: { make: string; model: string } | null }[],
    service: (service.data ?? []) as unknown as { id: string; reference: string; starts_at: string; status: string; contact: { name?: string }; service_type: string }[],
  };
}

// Inventory ---------------------------------------------------------------------

export type AdminVehicleRow = {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  status: string;
  published: boolean;
  featured: boolean;
  version: number;
  updated_at: string;
  vehicle_media: { url: string; position: number }[];
};

export async function listVehicles(dealershipId: string, filters: { q?: string; status?: string; published?: string; page: number }) {
  let query = (await db())
    .from("vehicles")
    .select("id, slug, make, model, year, price, mileage, status, published, featured, version, updated_at, vehicle_media(url, position)", { count: "exact" })
    .eq("dealership_id", dealershipId)
    .order("updated_at", { ascending: false })
    .range(...pageRange(filters.page));
  if (filters.status) query = query.eq("status", filters.status);
  else query = query.neq("status", "archived");
  if (filters.published === "yes") query = query.eq("published", true);
  if (filters.published === "no") query = query.eq("published", false);
  const term = searchTerm(filters.q);
  if (term) query = query.or(`make.ilike.%${term}%,model.ilike.%${term}%,slug.ilike.%${term}%`);
  return paged<AdminVehicleRow>(await query, filters.page);
}

export type AdminVehicle = {
  id: string;
  slug: string;
  make: string;
  model: string;
  generation: string | null;
  trim_level: string | null;
  year: number;
  body_type: string;
  fuel: string;
  transmission: string;
  drivetrain: string;
  engine: string;
  horsepower: number;
  mileage: number;
  price: number;
  exterior_color: string;
  interior_color: string | null;
  condition: string;
  status: string;
  published: boolean;
  featured: boolean;
  badges: string[];
  description: Localized;
  published_at: string | null;
  sold_at: string | null;
  created_at: string;
  version: number;
};

export type MediaRow = { id: string; url: string; kind: string; source: string; position: number; storage_path: string | null; credit: string | null };

export async function getAdminVehicle(id: string) {
  const client = await db();
  const vehicle = must<AdminVehicle | null>(await client.from("vehicles").select("*").eq("id", id).maybeSingle());
  if (!vehicle) return null;
  const [media, equipment, history, requests, privateData] = await Promise.all([
    client.from("vehicle_media").select("id, url, kind, source, position, storage_path, credit").eq("vehicle_id", id).order("position"),
    client.from("vehicle_equipment").select("position, label").eq("vehicle_id", id).order("position"),
    client.from("vehicle_price_history").select("id, old_price, new_price, reason, changed_by, approved_by, changed_at").eq("vehicle_id", id).order("changed_at", { ascending: false }).limit(20),
    client.from("price_change_requests").select("id, current_price, proposed_price, reason, status, requested_by, created_at").eq("vehicle_id", id).order("created_at", { ascending: false }).limit(10),
    client.from("vehicle_private").select("vin, stock_number, internal_notes").eq("vehicle_id", id).maybeSingle(),
  ]);
  return {
    vehicle,
    media: must<MediaRow[]>(media),
    equipment: must<{ position: number; label: Localized }[]>(equipment),
    history: must<{ id: number; old_price: number; new_price: number; reason: string | null; changed_by: string | null; approved_by: string | null; changed_at: string }[]>(history),
    priceRequests: must<{ id: string; current_price: number; proposed_price: number; reason: string; status: string; requested_by: string; created_at: string }[]>(requests),
    privateData: (privateData.data ?? null) as { vin: string | null; stock_number: string | null; internal_notes: string | null } | null,
  };
}

export async function listPendingPriceRequests(dealershipId: string) {
  return must<{ id: string; current_price: number; proposed_price: number; reason: string; requested_by: string; created_at: string; vehicle: { id: string; make: string; model: string; year: number } | null }[]>(
    await (await db())
      .from("price_change_requests")
      .select("id, current_price, proposed_price, reason, requested_by, created_at, vehicle:vehicles(id, make, model, year)")
      .eq("dealership_id", dealershipId)
      .eq("status", "pending")
      .order("created_at"),
  );
}

export async function vehicleOptions(dealershipId: string, statuses = ["draft", "available", "reserved"]) {
  return must<{ id: string; make: string; model: string; year: number; status: string; price: number }[]>(
    await (await db()).from("vehicles").select("id, make, model, year, status, price").eq("dealership_id", dealershipId).in("status", statuses).order("make").limit(500),
  );
}

// CRM ------------------------------------------------------------------------------

export type LeadRow = {
  id: string;
  stage: string;
  source: string;
  follow_up_at: string | null;
  created_at: string;
  assigned_to: string | null;
  negotiation_price: number | null;
  version: number;
  customer: { id: string; full_name: string; email: string | null; phone: string | null } | null;
  vehicle: { id: string; make: string; model: string; year: number } | null;
};

const LEAD_SELECT =
  "id, stage, source, follow_up_at, created_at, assigned_to, negotiation_price, version, customer:customers!inner(id, full_name, email, phone), vehicle:vehicles(id, make, model, year)";

export async function listLeads(dealershipId: string, filters: { stage?: string; assignee?: string; source?: string; q?: string; page: number; open?: boolean }) {
  let query = (await db())
    .from("leads")
    .select(LEAD_SELECT, { count: "exact" })
    .eq("dealership_id", dealershipId)
    .order("created_at", { ascending: false })
    .range(...pageRange(filters.page));
  if (filters.stage) query = query.eq("stage", filters.stage);
  else if (filters.open) query = query.not("stage", "in", "(won,lost)");
  if (filters.assignee === "none") query = query.is("assigned_to", null);
  else if (filters.assignee) query = query.eq("assigned_to", filters.assignee);
  if (filters.source) query = query.eq("source", filters.source);
  const term = searchTerm(filters.q);
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`, { referencedTable: "customers" });
  return paged<LeadRow>(await query, filters.page);
}

export async function getLead(id: string) {
  const client = await db();
  const lead = must<(LeadRow & { lost_reason: string | null; won_sale_id: string | null; closed_at: string | null; request_kind: string | null; request_id: string | null; dealership_id: string }) | null>(
    await client.from("leads").select(`${LEAD_SELECT}, lost_reason, won_sale_id, closed_at, request_kind, request_id, dealership_id`).eq("id", id).maybeSingle(),
  );
  if (!lead) return null;
  const [activities, tasks, sale] = await Promise.all([
    client.from("lead_activities").select("id, kind, body, meta, created_at, actor_id").eq("lead_id", id).order("created_at", { ascending: false }).limit(100),
    client.from("staff_tasks").select("id, title, due_at, completed_at, assigned_to").eq("lead_id", id).order("due_at", { nullsFirst: false }),
    lead.won_sale_id ? client.from("sales").select("id, reference, agreed_price, status, sale_date").eq("id", lead.won_sale_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  return {
    lead,
    activities: must<{ id: number; kind: string; body: string | null; meta: Record<string, unknown>; created_at: string; actor_id: string | null }[]>(activities),
    tasks: must<TaskRow[]>(tasks),
    sale: (sale.data ?? null) as { id: string; reference: string; agreed_price: number; status: string; sale_date: string } | null,
  };
}

export type CustomerRow = { id: string; full_name: string; email: string | null; phone: string | null; locale: string; created_at: string; anonymized_at: string | null };

export async function listCustomers(dealershipId: string, filters: { q?: string; page: number }) {
  let query = (await db())
    .from("customers")
    .select("id, full_name, email, phone, locale, created_at, anonymized_at", { count: "exact" })
    .eq("dealership_id", dealershipId)
    .order("created_at", { ascending: false })
    .range(...pageRange(filters.page));
  const term = searchTerm(filters.q);
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  return paged<CustomerRow>(await query, filters.page);
}

export async function customerOptions(dealershipId: string) {
  return must<{ id: string; full_name: string; email: string | null; phone: string | null }[]>(
    await (await db()).from("customers").select("id, full_name, email, phone").eq("dealership_id", dealershipId).is("anonymized_at", null).order("updated_at", { ascending: false }).limit(300),
  );
}

export async function getCustomer(id: string) {
  const client = await db();
  const customer = must<(CustomerRow & { notes: string | null; version: number; privacy_consent_at: string | null; user_id: string | null }) | null>(
    await client.from("customers").select("*").eq("id", id).maybeSingle(),
  );
  if (!customer) return null;
  const [leads, sales, ...requests] = await Promise.all([
    client.from("leads").select("id, stage, source, created_at, vehicle:vehicles(make, model)").eq("customer_id", id).order("created_at", { ascending: false }),
    client.from("sales").select("id, reference, agreed_price, status, sale_date, vehicle:vehicles(make, model)").eq("customer_id", id).order("sale_date", { ascending: false }),
    ...(Object.keys(REQUEST_KINDS) as RequestKind[]).map((kind) =>
      client.from(REQUEST_KINDS[kind].table).select("id, reference, status, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
    ),
  ]);
  return {
    customer,
    leads: (leads.data ?? []) as unknown as { id: string; stage: string; source: string; created_at: string; vehicle: { make: string; model: string } | null }[],
    sales: (sales.data ?? []) as unknown as { id: string; reference: string; agreed_price: number; status: string; sale_date: string; vehicle: { make: string; model: string } | null }[],
    requests: (Object.keys(REQUEST_KINDS) as RequestKind[]).flatMap((kind, index) =>
      ((requests[index].data ?? []) as { id: string; reference: string; status: string; created_at: string }[]).map((row) => ({ ...row, kind })),
    ),
  };
}

// Tasks ------------------------------------------------------------------------------

export type TaskRow = { id: string; title: string; notes?: string | null; due_at: string | null; completed_at: string | null; assigned_to: string; lead_id?: string | null; created_by?: string | null };

export async function listTasks(dealershipId: string, filters: { scope: "mine" | "team"; userId: string; done: boolean }) {
  let query = (await db())
    .from("staff_tasks")
    .select("id, title, notes, due_at, completed_at, assigned_to, lead_id, created_by")
    .eq("dealership_id", dealershipId)
    .order(filters.done ? "completed_at" : "due_at", { ascending: !filters.done, nullsFirst: false })
    .limit(200);
  query = filters.done ? query.not("completed_at", "is", null) : query.is("completed_at", null);
  if (filters.scope === "mine") query = query.eq("assigned_to", filters.userId);
  return must<TaskRow[]>(await query);
}

// Sales --------------------------------------------------------------------------------

export type SaleRow = {
  id: string;
  reference: string;
  agreed_price: number;
  currency: string;
  status: string;
  sale_date: string;
  salesperson_id: string | null;
  version: number;
  vehicle: { id: string; make: string; model: string; year: number } | null;
  customer: { id: string; full_name: string } | null;
};

const SALE_SELECT = "id, reference, agreed_price, currency, status, sale_date, salesperson_id, version, vehicle:vehicles(id, make, model, year), customer:customers(id, full_name)";

export async function listSales(dealershipId: string, filters: { status?: string; from?: string; to?: string; page: number }) {
  let query = (await db())
    .from("sales")
    .select(SALE_SELECT, { count: "exact" })
    .eq("dealership_id", dealershipId)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(...pageRange(filters.page));
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("sale_date", filters.from);
  if (filters.to) query = query.lte("sale_date", filters.to);
  return paged<SaleRow>(await query, filters.page);
}

export async function getSale(id: string) {
  const client = await db();
  const sale = must<(SaleRow & { notes: string | null; cancel_reason: string | null; lead_id: string | null; created_at: string }) | null>(
    await client.from("sales").select(`${SALE_SELECT}, notes, cancel_reason, lead_id, created_at`).eq("id", id).maybeSingle(),
  );
  if (!sale) return null;
  const events = must<{ id: number; kind: string; reason: string | null; changes: Record<string, unknown>; actor_id: string | null; created_at: string }[]>(
    await client.from("sale_events").select("id, kind, reason, changes, actor_id, created_at").eq("sale_id", id).order("created_at", { ascending: false }),
  );
  return { sale, events };
}

// Requests -------------------------------------------------------------------------------

export type RequestRow = Record<string, unknown> & {
  id: string;
  reference: string;
  status: string;
  created_at: string;
  assigned_to: string | null;
  version: number;
  contact: { name?: string; email?: string; phone?: string | null };
  starts_at?: string;
  vehicle?: { id: string; make: string; model: string; year: number } | null;
};

const requestSelect = (kind: RequestKind) =>
  ["test_drive", "reservation", "financing", "inquiry"].includes(kind) ? "*, vehicle:vehicles(id, make, model, year)" : "*";

export async function listRequests(dealershipId: string, kind: RequestKind, filters: { status?: string; assignee?: string; page: number }) {
  let query = (await db())
    .from(REQUEST_KINDS[kind].table)
    .select(requestSelect(kind), { count: "exact" })
    .eq("dealership_id", dealershipId)
    .order(REQUEST_KINDS[kind].appointment ? "starts_at" : "created_at", { ascending: REQUEST_KINDS[kind].appointment })
    .range(...pageRange(filters.page));
  if (filters.status) query = query.eq("status", filters.status);
  else query = query.in("status", ["new", "in_progress", "confirmed"]);
  if (filters.assignee === "none") query = query.is("assigned_to", null);
  else if (filters.assignee) query = query.eq("assigned_to", filters.assignee);
  return paged<RequestRow>(await query, filters.page);
}

export async function getRequest(kind: RequestKind, id: string) {
  const client = await db();
  const request = must<(RequestRow & { customer_id: string; dealership_id: string }) | null>(
    await client.from(REQUEST_KINDS[kind].table).select(requestSelect(kind)).eq("id", id).maybeSingle(),
  );
  if (!request) return null;
  const [events, lead] = await Promise.all([
    client.from("request_events").select("id, kind, from_status, to_status, body, actor_id, created_at").eq("request_kind", kind).eq("request_id", id).order("created_at", { ascending: false }),
    client.from("leads").select("id, stage").eq("customer_id", request.customer_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    request,
    events: must<{ id: number; kind: string; from_status: string | null; to_status: string | null; body: string | null; actor_id: string | null; created_at: string }[]>(events),
    lead: (lead.data ?? null) as { id: string; stage: string } | null,
  };
}

export async function getCalendar(dealershipId: string, from: Date, to: Date) {
  const client = await db();
  const range = { from: from.toISOString(), to: to.toISOString() };
  const [drives, service] = await Promise.all([
    client.from("test_drives").select("id, reference, starts_at, status, contact, assigned_to, vehicle:vehicles(make, model)").eq("dealership_id", dealershipId).gte("starts_at", range.from).lt("starts_at", range.to).in("status", ["new", "in_progress", "confirmed", "completed"]).order("starts_at"),
    client.from("service_appointments").select("id, reference, starts_at, status, contact, assigned_to, service_type").eq("dealership_id", dealershipId).gte("starts_at", range.from).lt("starts_at", range.to).in("status", ["new", "in_progress", "confirmed", "completed"]).order("starts_at"),
  ]);
  type Entry = { id: string; reference: string; starts_at: string; status: string; contact: { name?: string }; assigned_to: string | null };
  return [
    ...((drives.data ?? []) as unknown as (Entry & { vehicle: { make: string; model: string } | null })[]).map((row) => ({ ...row, kind: "test_drive" as const, label: row.vehicle ? `${row.vehicle.make} ${row.vehicle.model}` : "" })),
    ...((service.data ?? []) as unknown as (Entry & { service_type: string })[]).map((row) => ({ ...row, kind: "service" as const, label: row.service_type })),
  ].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

// Team, settings, audit, notifications -------------------------------------------------

export async function listMembers(dealershipId: string) {
  return must<{ user_id: string; email: string; full_name: string | null; role: StaffRole; status: "active" | "suspended"; created_at: string }[]>(
    await (await db()).rpc("list_members", { p_dealership: dealershipId }),
  );
}

export async function listInvitations(dealershipId: string) {
  return must<{ id: string; email: string; role: StaffRole; expires_at: string; created_at: string }[]>(
    await (await db()).rpc("list_invitations", { p_dealership: dealershipId }),
  );
}

export async function getRolePermissions(dealershipId: string) {
  const rows = must<{ role: StaffRole; permission: string }[]>(
    await (await db()).from("role_permissions").select("role, permission").eq("dealership_id", dealershipId),
  );
  const map = new Map<StaffRole, Set<string>>();
  for (const row of rows) map.set(row.role, (map.get(row.role) ?? new Set()).add(row.permission));
  return map;
}

export type Metrics = {
  financial: boolean;
  inventory: { active: number; draft: number; sold: number; archived: number; value: number | null; aging: Record<"d0_30" | "d31_60" | "d61_90" | "d90_plus", number> };
  turnoverDays: number | null;
  leads: { total: number; won: number; lost: number; open: number; byStage: Record<string, number>; bySource: Record<string, number> };
  appointments: { testDrives: Record<string, number>; service: Record<string, number> };
  reservations: Record<string, number>;
  requests: { inquiry: number; financing: number; trade_in: number };
  sales: { completed: number; pending: number; cancelled: number; value: number | null; average: number | null };
  team: { userId: string; name: string; role: StaffRole; leads: number; won: number; sales: number; value: number | null }[];
  popularVehicles: { id: string; slug: string; name: string; year: number; interest: number }[];
};

export async function getMetrics(dealershipId: string, from: Date, to: Date) {
  return must<Metrics>(await (await db()).rpc("dealership_metrics", { p_dealership: dealershipId, p_from: from.toISOString(), p_to: to.toISOString() }));
}

export async function listAudit(dealershipId: string, filters: { entity?: string; action?: string; page: number }) {
  let query = (await db())
    .from("audit_logs")
    .select("id, actor_id, action, entity, record_id, changes, created_at", { count: "exact" })
    .eq("dealership_id", dealershipId)
    .order("created_at", { ascending: false })
    .range(...pageRange(filters.page));
  if (filters.entity) query = query.eq("entity", filters.entity);
  if (filters.action) query = query.eq("action", filters.action);
  return paged<{ id: number; actor_id: string | null; action: string; entity: string; record_id: string | null; changes: Record<string, unknown>; created_at: string }>(await query, filters.page);
}

export async function listNotifications(userId: string, page = 1) {
  return paged<{ id: number; kind: string; payload: Record<string, unknown>; read_at: string | null; created_at: string }>(
    await (await db())
      .from("notifications")
      .select("id, kind, payload, read_at, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(...pageRange(page)),
    page,
  );
}

export async function unreadNotifications(userId: string) {
  const { count } = await (await db()).from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
  return count ?? 0;
}

export type AdminSettings = {
  id: string;
  name: string;
  legal_name: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: Partial<Record<"en" | "ru" | "kk", { line1?: string; line2?: string }>>;
  maps_url: string | null;
  hours: Partial<Record<"weekdays" | "saturday" | "sunday", string>>;
  socials: { label: string; href: string }[];
  services: string[];
  currency: string;
  timezone: string;
  show_sold_vehicles: boolean;
  price_approval_required: boolean;
  booking_slots: string[];
  booking_window_days: number;
  reservation_hold_hours: number;
  service_capacity: number;
  service_enabled: boolean;
  test_drive_enabled: boolean;
  notify_new_leads: boolean;
  notification_email: string | null;
  retention_months: number;
  updated_at: string;
};

export async function getAdminSettings(dealershipId: string) {
  return must<AdminSettings>(await (await db()).rpc("dealership_admin_settings", { p_dealership: dealershipId }));
}
