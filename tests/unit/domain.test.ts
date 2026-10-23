import { describe, expect, it } from "vitest";
import { DEFAULT_PERMISSIONS, manageableRoles } from "@/lib/auth/permissions";
import { CARS } from "@/lib/cars";
import { dbError } from "@/lib/actions/shared";
import { calculateLoan } from "@/lib/finance";
import { EMPTY_FILTERS, filterCars, sortCars } from "@/lib/inventory";
import { createVehicleSchema } from "@/lib/validation/admin";
import { contactSchema, financingSchema, testDriveSchema } from "@/lib/validation/schemas";

const isoDay = (offset: number) => new Date(Date.now() + offset * 86_400_000).toLocaleDateString("en-CA");

describe("role permissions", () => {
  it("limits which roles each actor can manage", () => {
    const manage = new Set(["team.manage"]);
    expect(manageableRoles("owner", manage)).not.toContain("owner");
    expect(manageableRoles("owner", manage)).toContain("general_manager");
    expect(manageableRoles("general_manager", manage)).toEqual(["sales_manager", "sales_rep", "inventory_manager", "finance_manager", "receptionist"]);
    expect(manageableRoles("sales_manager", manage)).toEqual(["sales_rep", "receptionist"]);
    expect(manageableRoles("sales_manager", new Set())).toEqual([]);
    expect(manageableRoles("sales_rep", manage)).toEqual([]);
  });

  it("keeps least-privilege defaults for front-line roles", () => {
    expect(DEFAULT_PERMISSIONS.sales_rep).not.toContain("leads.read_all");
    expect(DEFAULT_PERMISSIONS.sales_rep).not.toContain("finance.read");
    expect(DEFAULT_PERMISSIONS.inventory_manager).not.toContain("inventory.price_approve");
    expect(DEFAULT_PERMISSIONS.general_manager).not.toContain("settings.update");
    expect(DEFAULT_PERMISSIONS.receptionist).not.toContain("sales.read");
  });
});

describe("validation", () => {
  it("accepts a valid contact submission and rejects malformed input with translation keys", () => {
    expect(contactSchema.safeParse({ name: "Aida", email: "aida@example.com", phone: "", topic: "general", message: "Is it available?", consent: true }).success).toBe(true);
    expect(contactSchema.safeParse({ name: "Aida", email: "aida@example.com", phone: "", topic: "general", message: "Is it available?", consent: false }).error?.issues[0].message).toBe("consent");
    const result = contactSchema.safeParse({ name: "A", email: "nope", phone: "12", topic: "spam", message: "hi" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message).sort()).toEqual(["consent", "email", "message", "name", "phone", "topic"]);
  });

  it("rejects past and far-future test-drive dates", () => {
    const base = { vehicleId: "ferrari-roma", slot: "10:00", name: "Nurlan", email: "n@example.com", phone: "+7 701 000 00 00", notes: "", consent: true };
    expect(testDriveSchema.safeParse({ ...base, date: isoDay(1) }).success).toBe(true);
    expect(testDriveSchema.safeParse({ ...base, date: isoDay(-1) }).error?.issues[0].message).toBe("dateFuture");
    expect(testDriveSchema.safeParse({ ...base, date: isoDay(400) }).success).toBe(false);
    expect(testDriveSchema.safeParse({ ...base, date: isoDay(1), slot: "9:00" }).success).toBe(false);
  });

  it("requires the down payment to be lower than the price", () => {
    const base = { vehicleId: "", term: "60", name: "Dana", email: "d@example.com", phone: "+7 701 000 00 00", consent: true };
    expect(financingSchema.safeParse({ ...base, price: "60000000", downPayment: "12000000" }).success).toBe(true);
    expect(financingSchema.safeParse({ ...base, price: "60000000", downPayment: "60000000" }).error?.issues[0].message).toBe("down");
  });

  it("validates vehicle slugs and equipment", () => {
    const vehicle = {
      slug: "audi-rs-6",
      make: "Audi",
      model: "RS 6",
      generation: "C8",
      trimLevel: "",
      year: "2024",
      price: "80000000",
      mileage: "0",
      fuel: "Gasoline",
      transmission: "Automatic",
      drivetrain: "AWD",
      bodyType: "GT",
      engine: "4.0L V8",
      horsepower: "621",
      exteriorColor: "Grey",
      interiorColor: "",
      condition: "new",
      badges: ["Certified"],
      description: { en: "", ru: "", kk: "" },
      equipment: [{ en: "Night vision", ru: "", kk: "" }],
    };
    expect(createVehicleSchema.safeParse(vehicle).success).toBe(true);
    expect(createVehicleSchema.safeParse({ ...vehicle, slug: "Bad Slug!" }).error?.issues[0].message).toBe("slug");
    expect(createVehicleSchema.safeParse({ ...vehicle, equipment: [{ en: "", ru: "x", kk: "" }] }).success).toBe(false);
    expect(createVehicleSchema.safeParse({ ...vehicle, price: "0" }).success).toBe(false);
  });
});

describe("database error mapping", () => {
  it("maps Postgres and app errors to user-facing codes", () => {
    expect(dbError({ code: "P0001", message: "rate_limited", hint: "rate_limited" })).toBe("rate_limited");
    expect(dbError({ code: "23505", message: "duplicate key" }, "slot_taken")).toBe("slot_taken");
    expect(dbError({ code: "23514", message: "check constraint" })).toBe("invalid");
    expect(dbError({ code: "23503", message: "foreign key" })).toBe("in_use");
    expect(dbError({ code: "42501", message: "permission denied for table leads" })).toBe("forbidden");
    expect(dbError({ code: "P0001", message: "conflict", hint: "conflict" })).toBe("conflict");
    expect(dbError({ code: "XX000", message: "internal detail: relation secret_table at line 3" })).toBe("generic");
  });
});

describe("finance and inventory", () => {
  it("computes an amortised monthly payment", () => {
    const loan = calculateLoan({ price: 60_000_000, downPayment: 12_000_000, apr: 5.9, termMonths: 60 });
    expect(loan.principal).toBe(48_000_000);
    let balance = loan.principal;
    for (let month = 0; month < 60; month += 1) balance = balance * (1 + 0.059 / 12) - loan.monthly;
    expect(Math.abs(balance)).toBeLessThan(1);
    expect(loan.totalInterest).toBeCloseTo(loan.monthly * 60 - 48_000_000, 2);
    expect(calculateLoan({ price: 1_200_000, downPayment: 0, apr: 0, termMonths: 12 }).monthly).toBe(100_000);
  });

  it("filters and sorts the catalogue", () => {
    const porsches = filterCars(CARS, { ...EMPTY_FILTERS, brand: "Porsche" });
    expect(porsches).toHaveLength(4);
    expect(filterCars(CARS, { ...EMPTY_FILTERS, transmission: "Manual" }).map((car) => car.id)).toEqual(["porsche-718-cayman-gt4"]);
    const cheapest = sortCars(CARS, "price-asc")[0];
    expect(cheapest.price).toBe(Math.min(...CARS.map((car) => car.price)));
  });
});
