import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { as, createDatabase, createUser, dealershipId, futureDate, rejects, staff } from "./harness";

let db: PGlite;
let dealer: string;
let owner: string;
let manager: string;
let inventory: string;
let rep: string;

const vehicle = async (slug: string) =>
  (await db.query<{ id: string; version: number; status: string; published: boolean }>("select id, version, status, published from public.vehicles where slug = $1", [slug])).rows[0];

beforeAll(async () => {
  db = await createDatabase();
  dealer = await dealershipId(db);
  owner = await staff(db, dealer, "owner");
  manager = await staff(db, dealer, "sales_manager");
  inventory = await staff(db, dealer, "inventory_manager");
  rep = await staff(db, dealer, "sales_rep");
});

describe("inventory workflow", () => {
  it("creates a draft, publishes it and keeps publication rules", async () => {
    const created = await as(db, inventory, () =>
      db.query<{ id: string }>(
        "insert into public.vehicles (dealership_id, slug, make, model, year, price, fuel, transmission, horsepower, drivetrain, body_type, engine, exterior_color) values ($1, 'new-arrival', 'Toyota', 'Land Cruiser 300', 2024, 70000000, 'Diesel', 'Automatic', 305, '4WD', 'SUV', '3.3L V6 Diesel', 'White') returning id",
        [dealer],
      ),
    );
    const id = created.rows[0].id;
    await as(db, inventory, async () => {
      await rejects(db.query("update public.vehicles set published = true where id = $1", [id]), "check");
      await db.query("select public.transition_vehicle($1, 'available', 1)", [id]);
      await db.query("update public.vehicles set published = true, featured = true where id = $1", [id]);
    });
    const row = await vehicle("new-arrival");
    expect(row).toMatchObject({ status: "available", published: true });
    await as(db, null, async () => expect((await db.query("select id from public.vehicles where slug = 'new-arrival'")).rows).toHaveLength(1));
    await as(db, inventory, () => db.query("select public.transition_vehicle($1, 'archived', $2)", [id, row.version]));
    const archived = await db.query<{ published: boolean; featured: boolean }>("select published, featured from public.vehicles where id = $1", [id]);
    expect(archived.rows[0]).toEqual({ published: false, featured: false });
    await as(db, null, async () => expect((await db.query("select id from public.vehicles where slug = 'new-arrival'")).rows).toHaveLength(0));
  });

  it("reorders media and replaces equipment atomically", async () => {
    const car = await vehicle("tesla-model-s-plaid");
    const ids = (await db.query<{ id: string }>("select id from public.vehicle_media where vehicle_id = $1 order by position", [car.id])).rows.map((r) => r.id);
    await as(db, inventory, async () => {
      await db.query("select public.reorder_vehicle_media($1, $2::uuid[])", [car.id, [...ids].reverse()]);
      await rejects(db.query("select public.reorder_vehicle_media($1, $2::uuid[])", [car.id, ids.slice(1)]), "invalid");
      await db.query("select public.replace_vehicle_equipment($1, $2::jsonb)", [car.id, JSON.stringify([{ en: "Yoke steering", ru: "Штурвал", kk: "Штурвал" }])]);
    });
    const first = (await db.query<{ id: string }>("select id from public.vehicle_media where vehicle_id = $1 order by position limit 1", [car.id])).rows[0].id;
    expect(first).toBe(ids[ids.length - 1]);
    expect((await db.query("select id from public.vehicle_equipment where vehicle_id = $1", [car.id])).rows).toHaveLength(1);
    await as(db, rep, () => rejects(db.query("select public.reorder_vehicle_media($1, $2::uuid[])", [car.id, ids]), "forbidden"));
  });
});

describe("booking workflow", () => {
  it("enforces service bay capacity and reschedules within the booking window", async () => {
    await db.query("update public.dealerships set service_capacity = 1 where id = $1", [dealer]);
    const date = futureDate(6);
    await as(db, null, async () => {
      for (const email of ["a@example.com", "b@example.com"]) {
        await db.query(
          "select public.submit_service('autolux', 'BMW X5 2020', 'maintenance', $1::date, '10:00', 'Client', $2, '+7 701 111 11 11', '', 'en', $2, true)",
          [date, email],
        );
      }
    });
    const rows = (await db.query<{ id: string; version: number }>("select id, version from public.service_appointments order by created_at")).rows;
    await as(db, manager, async () => {
      await db.query("select public.set_request_status('service', $1, 'confirmed', $2, null)", [rows[0].id, rows[0].version]);
      await rejects(db.query("select public.set_request_status('service', $1, 'confirmed', $2, null)", [rows[1].id, rows[1].version]), "slot_taken");
      await rejects(db.query("select public.reschedule_appointment('service', $1, $2::date, '10:00', $3)", [rows[1].id, "2020-01-01", rows[1].version]), "invalid_date");
      await db.query("select public.reschedule_appointment('service', $1, $2::date, '11:30', $3)", [rows[1].id, date, rows[1].version]);
      await db.query("select public.set_request_status('service', $1, 'confirmed', $2, 'moved')", [rows[1].id, rows[1].version + 1]);
    });
    const events = await db.query<{ kind: string }>("select kind from public.request_events where request_id = $1 order by id", [rows[1].id]);
    expect(events.rows.map((e) => e.kind)).toEqual(["created", "reschedule", "status"]);
  });

  it("releases expired reservation holds", async () => {
    const car = await vehicle("lamborghini-huracan-evo");
    const buyer = await createUser(db, "holder");
    await as(db, buyer.id, () => db.query("select public.request_reservation('autolux', $1, '', '', 'en', true)", [car.id]));
    const reservation = (await db.query<{ id: string; version: number }>("select id, version from public.reservations where vehicle_id = $1", [car.id])).rows[0];
    await as(db, manager, () => db.query("select public.set_request_status('reservation', $1, 'confirmed', $2, null)", [reservation.id, reservation.version]));
    expect((await vehicle("lamborghini-huracan-evo")).status).toBe("reserved");
    await db.query("update public.reservations set hold_until = now() - interval '1 minute' where id = $1", [reservation.id]);
    const released = await as(db, rep, () => db.query<{ n: number }>("select public.release_expired_reservations($1) n", [dealer]));
    expect(released.rows[0].n).toBe(1);
    expect((await vehicle("lamborghini-huracan-evo")).status).toBe("available");
    await as(db, buyer.id, async () => {
      const own = await db.query<{ status: string }>("select status from public.reservations where id = $1", [reservation.id]);
      expect(own.rows[0].status).toBe("cancelled");
    });
  });

  it("lets assignment target only employees allowed to see the request", async () => {
    await as(db, null, () =>
      db.query("select public.submit_financing('autolux', null, 50000000, 10000000, 48::smallint, 'Erlan', 'erlan@example.com', '+7 701 333 33 33', 'ru', 'fp-w', true)"),
    );
    const request = (await db.query<{ id: string }>("select id from public.financing_requests where contact->>'email' = 'erlan@example.com'")).rows[0];
    const finance = await staff(db, dealer, "finance_manager");
    await as(db, finance, async () => {
      await rejects(db.query("select public.assign_request('financing', $1, $2)", [request.id, rep]), "invalid_assignee");
      await db.query("select public.assign_request('financing', $1, $2)", [request.id, finance]);
    });
  });
});

describe("team and tasks", () => {
  it("rejects revoked invitations and limits task assignment", async () => {
    const token = (await as(db, owner, () => db.query<{ t: string }>("select public.create_invitation($1, 'late@example.com', 'receptionist') t", [dealer]))).rows[0].t;
    const invitation = (await db.query<{ id: string }>("select id from public.staff_invitations where email = 'late@example.com'")).rows[0].id;
    await as(db, owner, () => db.query("select public.revoke_invitation($1)", [invitation]));
    await db.query("insert into auth.users (id, email, email_confirmed_at) values (gen_random_uuid(), 'late@example.com', now())");
    const late = (await db.query<{ id: string }>("select id from auth.users where email = 'late@example.com'")).rows[0].id;
    await as(db, late, () => rejects(db.query("select public.accept_invitation($1)", [token]), "invitation_invalid"));

    await as(db, rep, async () => {
      await db.query("insert into public.staff_tasks (dealership_id, assigned_to, title) values ($1, $2, 'Call back Aida')", [dealer, rep]);
      await rejects(db.query("insert into public.staff_tasks (dealership_id, assigned_to, title) values ($1, $2, 'Do my job')", [dealer, manager]), "forbidden");
    });
    await as(db, manager, () => db.query("insert into public.staff_tasks (dealership_id, assigned_to, title) values ($1, $2, 'Prepare car')", [dealer, rep]));
    await as(db, rep, async () => {
      const mine = await db.query<{ title: string }>("select title from public.staff_tasks order by title");
      expect(mine.rows.map((r) => r.title)).toEqual(["Call back Aida", "Prepare car"]);
    });
    expect((await db.query<{ n: number }>("select count(*)::int n from public.notifications where user_id = $1 and kind = 'task.assigned'", [rep])).rows[0].n).toBe(1);
  });
});

describe("dashboard data", () => {
  it("returns role-shaped overview and metrics", async () => {
    const ownerView = await as(db, owner, () => db.query<{ o: Record<string, unknown> }>("select public.dealership_overview($1) o", [dealer]));
    expect(ownerView.rows[0].o).toHaveProperty("inventory");
    expect(ownerView.rows[0].o).toHaveProperty("pendingPrices");
    expect(ownerView.rows[0].o).toHaveProperty("salesThisMonth");
    const repView = await as(db, rep, () => db.query<{ o: Record<string, unknown> }>("select public.dealership_overview($1) o", [dealer]));
    expect(repView.rows[0].o).not.toHaveProperty("salesThisMonth");
    expect(repView.rows[0].o).not.toHaveProperty("pendingPrices");
    expect((repView.rows[0].o.requests as Record<string, number>).financing).toBeUndefined();

    const metrics = await as(db, owner, () =>
      db.query<{ m: { financial: boolean; leads: { total: number }; inventory: { aging: Record<string, number> }; popularVehicles: unknown[] } }>(
        "select public.dealership_metrics($1, now() - interval '30 days', now() + interval '1 day') m",
        [dealer],
      ),
    );
    expect(metrics.rows[0].m.financial).toBe(true);
    expect(metrics.rows[0].m.leads.total).toBeGreaterThan(0);
    expect(Object.keys(metrics.rows[0].m.inventory.aging)).toEqual(["d0_30", "d31_60", "d61_90", "d90_plus"]);
    await as(db, owner, () => rejects(db.query("select public.dealership_metrics($1, now(), now() - interval '1 day')", [dealer]), "invalid"));
  });
});
