import { z } from "zod";
import { PERMISSIONS, STAFF_ROLES } from "@/lib/auth/permissions";
import {
  ACTIVITY_KINDS,
  BADGES,
  BODY_TYPES,
  CONDITIONS,
  DRIVETRAINS,
  FUELS,
  LEAD_STAGES,
  MANUAL_LEAD_SOURCES,
  MEDIA_KINDS,
  REQUEST_KIND_LIST,
  REQUEST_STATUSES,
  SERVICE_TYPES,
  TRANSMISSIONS,
  VEHICLE_STATUSES,
} from "@/lib/domain";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;

const text = (max: number, key = "required") => z.string().trim().min(1, key).max(max, key);
const optionalText = (max: number) => z.string().trim().max(max, "tooLong");
const int = (key: string, min: number, max: number) => z.coerce.number(key).int(key).min(min, key).max(max, key);
const optionalUuid = z.union([z.uuid(), z.literal("")]).transform((value) => value || null);
const optionalEmail = z.string().trim().refine((value) => value === "" || EMAIL.test(value), "email");
const optionalPhone = z.string().trim().refine((value) => value === "" || PHONE.test(value), "phone");
const localized = (max: number) => z.object({ en: optionalText(max), ru: optionalText(max), kk: optionalText(max) });
const version = z.coerce.number().int().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date");
const dateTimeLocal = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "date"), z.literal("")]);

export const vehicleFields = z.object({
  slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{2,79}$/, "slug"),
  make: text(60),
  model: text(80),
  generation: optionalText(60),
  trimLevel: optionalText(80),
  year: int("year", 1950, 2100),
  mileage: int("mileage", 0, 2_000_000),
  fuel: z.enum(FUELS, { error: "required" }),
  transmission: z.enum(TRANSMISSIONS, { error: "required" }),
  drivetrain: z.enum(DRIVETRAINS, { error: "required" }),
  bodyType: z.enum(BODY_TYPES, { error: "required" }),
  engine: text(80),
  horsepower: int("horsepower", 1, 3000),
  exteriorColor: text(60),
  interiorColor: optionalText(60),
  condition: z.enum(CONDITIONS, { error: "required" }),
  badges: z.array(z.enum(BADGES)).max(BADGES.length),
  description: localized(4000),
  equipment: z.array(localized(160).refine((value) => value.en.length > 0, "required")).max(60),
});

export const createVehicleSchema = vehicleFields.extend({ price: int("price", 1, 100_000_000_000) });
export const updateVehicleSchema = vehicleFields.extend({ id: z.uuid(), version });

export const vehiclePrivateSchema = z.object({
  vehicleId: z.uuid(),
  vin: z.string().trim().toUpperCase().refine((value) => value === "" || /^[A-HJ-NPR-Z0-9]{17}$/.test(value), "vin"),
  stockNumber: optionalText(40),
  internalNotes: optionalText(4000),
});

export const transitionSchema = z.object({ id: z.uuid(), status: z.enum(VEHICLE_STATUSES), version });
export const publicationSchema = z.object({ id: z.uuid(), published: z.boolean(), featured: z.boolean(), version });
export const priceSchema = z.object({ id: z.uuid(), price: int("price", 1, 100_000_000_000), reason: optionalText(500), version });
export const bulkSchema = z.object({ action: z.enum(["publish", "unpublish", "archive"]), ids: z.array(z.uuid()).min(1).max(100) });
export const mediaOrderSchema = z.object({ vehicleId: z.uuid(), ids: z.array(z.uuid()).max(40) });
export const mediaMetaSchema = z.object({ kind: z.enum(MEDIA_KINDS), source: z.enum(["dealer", "representative"]) });

export const manualLeadSchema = z.object({
  name: text(120, "name"),
  email: optionalEmail,
  phone: optionalPhone,
  vehicleId: optionalUuid,
  source: z.enum(MANUAL_LEAD_SOURCES),
  assignee: optionalUuid,
  note: optionalText(4000),
}).refine((value) => value.email !== "" || value.phone !== "", { path: ["email"], message: "contactRequired" });

export const leadUpdateSchema = z.object({
  id: z.uuid(),
  version,
  stage: z.enum(LEAD_STAGES).refine((value) => value !== "won", "useSale"),
  followUpAt: dateTimeLocal,
  vehicleId: optionalUuid,
  negotiationPrice: z.union([int("price", 1, 100_000_000_000), z.literal("")]),
  lostReason: optionalText(500),
}).refine((value) => value.stage !== "lost" || value.lostReason.length > 0, { path: ["lostReason"], message: "required" });

export const assignSchema = z.object({ id: z.uuid(), assignee: optionalUuid });
export const activitySchema = z.object({ leadId: z.uuid(), kind: z.enum(ACTIVITY_KINDS), body: text(4000) });
export const taskSchema = z.object({
  title: text(200),
  notes: optionalText(2000),
  dueAt: dateTimeLocal,
  assignee: optionalUuid,
  leadId: optionalUuid,
});
export const customerSchema = z.object({
  id: z.uuid(),
  version,
  fullName: text(120, "name"),
  email: optionalEmail,
  phone: optionalPhone,
  locale: z.enum(["kk", "ru", "en"]),
  notes: optionalText(4000),
});

export const saleSchema = z.object({
  vehicleId: z.uuid(),
  customerId: z.uuid(),
  leadId: optionalUuid,
  salespersonId: optionalUuid,
  price: int("price", 1, 100_000_000_000),
  saleDate: isoDate,
  status: z.enum(["pending", "completed"]),
  notes: optionalText(4000),
});
export const saleCorrectionSchema = z.object({
  id: z.uuid(),
  version,
  price: int("price", 1, 100_000_000_000),
  saleDate: isoDate,
  salespersonId: optionalUuid,
  notes: optionalText(4000),
  reason: z.string().trim().min(3, "reason").max(500, "reason"),
});
export const saleCancelSchema = z.object({ id: z.uuid(), version, reason: z.string().trim().min(3, "reason").max(500, "reason") });

export const requestStatusSchema = z.object({
  kind: z.enum(REQUEST_KIND_LIST),
  id: z.uuid(),
  status: z.enum(REQUEST_STATUSES),
  version,
  note: optionalText(2000),
});
export const requestAssignSchema = z.object({ kind: z.enum(REQUEST_KIND_LIST), id: z.uuid(), assignee: optionalUuid });
export const requestNoteSchema = z.object({ kind: z.enum(REQUEST_KIND_LIST), id: z.uuid(), body: text(2000) });
export const rescheduleSchema = z.object({
  kind: z.enum(["test_drive", "service"]),
  id: z.uuid(),
  date: isoDate,
  slot: z.string().regex(/^\d{2}:\d{2}$/, "time"),
  version,
});

export const inviteSchema = z.object({ email: z.string().trim().toLowerCase().max(254).regex(EMAIL, "email"), role: z.enum(STAFF_ROLES) });
export const memberRoleSchema = z.object({ userId: z.uuid(), role: z.enum(STAFF_ROLES) });
export const memberStatusSchema = z.object({ userId: z.uuid(), status: z.enum(["active", "suspended"]) });
export const rolePermissionsSchema = z.object({
  role: z.enum(STAFF_ROLES).refine((role) => role !== "owner", "forbidden"),
  permissions: z.array(z.enum(PERMISSIONS as [string, ...string[]])).max(PERMISSIONS.length),
});

const slot = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time");
const url = z.string().trim().refine((value) => value === "" || /^https:\/\/[^\s]+$/.test(value), "url");

export const settingsSchema = z.object({
  name: text(120),
  legalName: optionalText(160),
  phone: optionalPhone,
  email: optionalEmail,
  whatsapp: z.string().trim().refine((value) => value === "" || /^\+?[0-9]{7,15}$/.test(value), "phone"),
  address: z.object({
    en: z.object({ line1: optionalText(160), line2: optionalText(160) }),
    ru: z.object({ line1: optionalText(160), line2: optionalText(160) }),
    kk: z.object({ line1: optionalText(160), line2: optionalText(160) }),
  }),
  mapsUrl: url,
  hours: z.object({ weekdays: optionalText(40), saturday: optionalText(40), sunday: optionalText(40) }),
  socials: z.array(z.object({ label: text(40), href: z.string().trim().regex(/^https:\/\/[^\s]+$/, "url") })).max(8),
  services: z.array(z.enum(SERVICE_TYPES)),
  currency: z.string().regex(/^[A-Z]{3}$/, "currency"),
  timezone: z.string().trim().refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "timezone"),
  showSoldVehicles: z.boolean(),
  priceApprovalRequired: z.boolean(),
  bookingSlots: z.array(slot).min(1, "time").max(24),
  bookingWindowDays: int("number", 1, 365),
  reservationHoldHours: int("number", 1, 720),
  serviceCapacity: int("number", 1, 50),
  serviceEnabled: z.boolean(),
  testDriveEnabled: z.boolean(),
  notifyNewLeads: z.boolean(),
  notificationEmail: optionalEmail,
  retentionMonths: int("number", 6, 120),
});
