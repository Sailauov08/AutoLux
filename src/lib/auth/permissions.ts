export const STAFF_ROLES = [
  "owner",
  "general_manager",
  "sales_manager",
  "sales_rep",
  "inventory_manager",
  "finance_manager",
  "receptionist",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_RANK: Record<StaffRole, number> = {
  owner: 0,
  general_manager: 1,
  sales_manager: 2,
  inventory_manager: 2,
  finance_manager: 2,
  receptionist: 3,
  sales_rep: 3,
};

export const PERMISSION_GROUPS = {
  inventory: ["inventory.read", "inventory.create", "inventory.update", "inventory.delete", "inventory.publish", "inventory.price", "inventory.price_request", "inventory.price_approve", "inventory.private", "media.update"],
  customers: ["customers.read", "customers.update", "customers.delete"],
  leads: ["leads.read_all", "leads.read_own", "leads.create", "leads.update", "leads.assign", "tasks.read_all", "tasks.manage"],
  sales: ["sales.read", "sales.create", "sales.update", "sales.cancel"],
  requests: ["bookings.read", "bookings.update", "reservations.read", "reservations.update", "inquiries.read", "inquiries.update", "finance.read", "finance.update", "tradein.read", "tradein.update"],
  administration: ["team.read", "team.manage", "settings.update", "analytics.read", "analytics.financial", "audit.read"],
} as const;

export type Permission = (typeof PERMISSION_GROUPS)[keyof typeof PERMISSION_GROUPS][number];
export const PERMISSIONS = Object.values(PERMISSION_GROUPS).flat() as Permission[];

const ALL = PERMISSIONS;

export const DEFAULT_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  owner: ALL,
  general_manager: ALL.filter((permission) => permission !== "settings.update"),
  sales_manager: [
    "inventory.read", "inventory.price_request", "customers.read", "customers.update",
    "leads.read_all", "leads.read_own", "leads.create", "leads.update", "leads.assign", "tasks.read_all", "tasks.manage",
    "sales.read", "sales.create", "sales.update", "bookings.read", "bookings.update", "reservations.read", "reservations.update",
    "inquiries.read", "inquiries.update", "finance.read", "tradein.read", "tradein.update", "team.read", "analytics.read", "analytics.financial",
  ],
  sales_rep: ["inventory.read", "leads.read_own", "leads.create", "leads.update", "bookings.read", "bookings.update", "reservations.read"],
  inventory_manager: [
    "inventory.read", "inventory.create", "inventory.update", "inventory.delete", "inventory.publish", "inventory.price",
    "inventory.price_request", "inventory.private", "media.update", "reservations.read", "analytics.read",
  ],
  finance_manager: ["inventory.read", "customers.read", "finance.read", "finance.update", "tradein.read", "tradein.update", "sales.read", "analytics.read", "analytics.financial"],
  receptionist: [
    "inventory.read", "customers.read", "leads.read_all", "leads.read_own", "leads.create", "leads.assign",
    "bookings.read", "bookings.update", "reservations.read", "inquiries.read", "inquiries.update",
  ],
};

export const isStaffRole = (value: string): value is StaffRole => (STAFF_ROLES as readonly string[]).includes(value);

export function manageableRoles(actor: StaffRole | null, permissions: ReadonlySet<string>): StaffRole[] {
  if (!actor || !permissions.has("team.manage")) return [];
  if (actor === "owner") return STAFF_ROLES.filter((role) => role !== "owner");
  return STAFF_ROLES.filter((role) => ROLE_RANK[role] > ROLE_RANK[actor]);
}
