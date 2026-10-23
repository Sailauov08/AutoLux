export const VEHICLE_STATUSES = ["draft", "available", "reserved", "sold", "archived"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const REQUEST_STATUSES = ["new", "in_progress", "confirmed", "completed", "cancelled", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const LEAD_STAGES = ["new", "contacted", "qualified", "negotiation", "won", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const TIME_SLOTS = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30"] as const;
export const CONTACT_TOPICS = ["general", "financing", "tradeIn", "availability", "delivery"] as const;
export const TRADE_IN_CONDITIONS = ["excellent", "good", "fair"] as const;
export const SERVICE_TYPES = ["maintenance", "inspection", "detailing", "tyres", "repair"] as const;
export const LOAN_TERMS = [12, 24, 36, 48, 60, 72, 84] as const;

export const FUELS = ["Gasoline", "Diesel", "Electric", "Hybrid"] as const;
export const TRANSMISSIONS = ["Automatic", "Manual"] as const;
export const DRIVETRAINS = ["AWD", "RWD", "FWD", "4WD"] as const;
export const BODY_TYPES = ["Sedan", "Coupe", "SUV", "Convertible", "GT"] as const;
export const BADGES = ["Certified", "Low Mileage", "New Arrival", "Rare"] as const;

export const CONDITIONS = ["new", "used", "certified"] as const;
export const SALE_STATUSES = ["pending", "completed", "cancelled"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];
export const LEAD_SOURCES = ["inquiry", "test_drive", "reservation", "financing", "trade_in", "service", "manual", "phone", "walk_in", "whatsapp", "referral"] as const;
export const MANUAL_LEAD_SOURCES = ["manual", "phone", "walk_in", "whatsapp", "referral"] as const;
export const ACTIVITY_KINDS = ["note", "call", "email", "meeting", "whatsapp"] as const;
export const MEDIA_KINDS = ["exterior", "interior", "detail"] as const;

export const REQUEST_KINDS = {
  inquiry: { table: "inquiries", permission: "inquiries", slug: "inquiries", appointment: false },
  test_drive: { table: "test_drives", permission: "bookings", slug: "test-drives", appointment: true },
  reservation: { table: "reservations", permission: "reservations", slug: "reservations", appointment: false },
  financing: { table: "financing_requests", permission: "finance", slug: "financing", appointment: false },
  trade_in: { table: "trade_in_requests", permission: "tradein", slug: "trade-ins", appointment: false },
  service: { table: "service_appointments", permission: "bookings", slug: "service", appointment: true },
} as const;
export type RequestKind = keyof typeof REQUEST_KINDS;
export const REQUEST_KIND_LIST = Object.keys(REQUEST_KINDS) as RequestKind[];
export const isRequestKind = (value: string): value is RequestKind => value in REQUEST_KINDS;
export const requestKindFromSlug = (slug: string) => REQUEST_KIND_LIST.find((kind) => REQUEST_KINDS[kind].slug === slug) ?? null;
