import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { as, createDatabase, createDealership, createUser, dealershipId, futureDate, rejects, staff } from "./harness";

let db: PGlite;
let dealer: string;
let rival: string;
let owner: string;
let manager: string;
let salesManager: string;
let rep: string;
let inventory: string;
let finance: string;
let reception: string;
let rivalStaff: string;
let customer: { id: string; email: string };
let stranger: { id: string; email: string };
let vehicle: string;

const vehicleBySlug = async (slug: string) =>
  (await db.query<{ id: string; version: number }>("select id, version from public.vehicles where slug = $1", [slug])).rows[0];

const submitTestDrive = (car: string, email: string, date = futureDate(), slot = "11:30") =>
  db.query<{ ref: string }>(
    "select public.submit_test_drive('autolux', $1, $2::date, $3, 'Aida Customer', $4, '+7 701 000 00 00', '', 'en', $5, true) ref",
    [car, date, slot, email, email],
  );

beforeAll(async () => {
  db = await createDatabase();
  dealer = await dealershipId(db);
  rival = await createDealership(db, "rival");
  owner = await staff(db, dealer, "owner");
  manager = await staff(db, dealer, "general_manager");
  salesManager = await staff(db, dealer, "sales_manager");
  rep = await staff(db, dealer, "sales_rep");
  inventory = await staff(db, dealer, "inventory_manager");
  finance = await staff(db, dealer, "finance_manager");
  reception = await staff(db, dealer, "receptionist");
  rivalStaff = await staff(db, rival, "owner");
  customer = await createUser(db, "customer");
  stranger = await createUser(db, "stranger");
  vehicle = (await vehicleBySlug("porsche-911-carrera-s")).id;
});

describe("unauthenticated and customer access", () => {
  it("hides every business table from guests", async () => {
    await as(db, null, async () => {
      await submitTestDrive(vehicle, "guest@example.com");
      for (const table of ["customers", "leads", "sales", "test_drives", "financing_requests", "audit_logs", "memberships", "vehicle_private"]) {
        const { rows } = await db.query<{ n: number }>(`select count(*)::int n from public.${table}`);
        expect(rows[0].n, table).toBe(0);
      }
      await rejects(db.query("select public.dealership_overview($1)", [dealer]), "permission denied");
      await rejects(db.query("select public.list_members($1)", [dealer]), "permission denied");
    });
  });

  it("only shows published vehicles to the public", async () => {
    await db.query("update public.vehicles set published = false where slug = 'ferrari-roma'");
    await as(db, null, async () => {
      const { rows } = await db.query("select slug from public.vehicles where slug = 'ferrari-roma'");
      expect(rows).toHaveLength(0);
    });
    await as(db, rep, async () => {
      const { rows } = await db.query("select slug from public.vehicles where slug = 'ferrari-roma'");
      expect(rows).toHaveLength(1);
    });
    await db.query("update public.vehicles set published = true where slug = 'ferrari-roma'");
  });

  it("keeps the notification e-mail column private", async () => {
    await as(db, null, () => rejects(db.query("select notification_email from public.dealerships"), "permission denied"));
  });

  it("blocks customers from admin RPCs and other customers' requests", async () => {
    await as(db, customer.id, () => submitTestDrive(vehicle, customer.email, futureDate(3)));
    await as(db, stranger.id, async () => {
      const { rows } = await db.query("select id from public.test_drives");
      expect(rows).toHaveLength(0);
      await rejects(db.query("select public.dealership_overview($1)", [dealer]), "forbidden");
      await rejects(db.query("select public.dealership_metrics($1, now() - interval '30 days', now())", [dealer]), "forbidden");
    });
    await as(db, customer.id, async () => {
      const { rows } = await db.query<{ user_id: string }>("select user_id from public.test_drives");
      expect(rows.length).toBe(1);
      expect(rows[0].user_id).toBe(customer.id);
      const own = await db.query("select id from public.customers");
      expect(own.rows).toHaveLength(1);
    });
  });

  it("does not link a customer record to an account with a different e-mail", async () => {
    await as(db, stranger.id, () => submitTestDrive(vehicle, customer.email, futureDate(4), "13:00"));
    const { rows } = await db.query<{ user_id: string | null }>("select user_id from public.customers where lower(email) = $1", [customer.email]);
    expect(rows[0].user_id).toBe(customer.id);
  });

  it("requires consent and enforces rate limits on public forms", async () => {
    await as(db, null, async () => {
      await rejects(
        db.query("select public.submit_inquiry('autolux', 'Spam', 'spam@example.com', '', 'general', 'hello there', null, 'en', 'fp-consent', false)"),
        "consent_required",
      );
      for (let i = 0; i < 3; i += 1) {
        await db.query("select public.submit_inquiry('autolux', 'Spam Bot', 'bot@example.com', '', 'general', 'buy now please', null, 'en', $1, true)", [`fp-${i}`]);
      }
      await rejects(
        db.query("select public.submit_inquiry('autolux', 'Spam Bot', 'bot@example.com', '', 'general', 'buy now please', null, 'en', 'fp-9', true)"),
        "rate_limited",
      );
    });
  });

  it("rejects test drives for past or unknown slots and unpublished vehicles", async () => {
    await as(db, null, async () => {
      await rejects(submitTestDrive(vehicle, "late@example.com", "2020-01-01"), "invalid_date");
      await rejects(submitTestDrive(vehicle, "odd@example.com", futureDate(), "09:15"), "invalid_date");
    });
    const hidden = (await vehicleBySlug("bmw-i7-xdrive60")).id;
    await db.query("update public.vehicles set published = false where id = $1", [hidden]);
    await as(db, null, () => rejects(submitTestDrive(hidden, "hidden@example.com"), "vehicle_unavailable"));
    await db.query("update public.vehicles set published = true where id = $1", [hidden]);
  });
});

describe("role and permission boundaries", () => {
  it("prevents sales representatives from changing permissions or roles", async () => {
    await as(db, rep, async () => {
      await rejects(db.query("select public.update_role_permissions($1, 'sales_rep', array['team.manage'])", [dealer]), "forbidden");
      await rejects(db.query("select public.set_member_role($1, $2, 'general_manager')", [dealer, rep]), "forbidden");
      await rejects(db.query("select public.create_invitation($1, 'friend@example.com', 'sales_rep')", [dealer]), "forbidden");
      await rejects(db.query("insert into public.role_permissions values ($1, 'sales_rep', 'team.manage')", [dealer]), "permission denied");
      const { rows } = await db.query("update public.memberships set role = 'owner' where user_id = $1 returning user_id", [rep]);
      expect(rows).toHaveLength(0);
    });
  });

  it("prevents inventory managers from changing owner settings", async () => {
    await as(db, inventory, async () => {
      const { rows } = await db.query("update public.dealerships set name = 'Hijacked' where id = $1 returning id", [dealer]);
      expect(rows).toHaveLength(0);
      await rejects(db.query("select public.set_member_status($1, $2, 'suspended')", [dealer, owner]), "forbidden");
    });
    expect((await db.query<{ name: string }>("select name from public.dealerships where id = $1", [dealer])).rows[0].name).toBe("AutoLux");
  });

  it("stops role escalation even for managers with team permissions", async () => {
    await as(db, manager, async () => {
      await rejects(db.query("select public.create_invitation($1, 'boss@example.com', 'owner')", [dealer]), "forbidden");
      await rejects(db.query("select public.create_invitation($1, 'peer@example.com', 'general_manager')", [dealer]), "forbidden");
      await rejects(db.query("select public.set_member_role($1, $2, 'owner')", [dealer, rep]), "forbidden");
      await rejects(db.query("select public.set_member_role($1, $2, 'sales_rep')", [dealer, manager]), "forbidden");
      await rejects(db.query("select public.update_role_permissions($1, 'sales_rep', array['team.manage'])", [dealer]), "forbidden");
      await db.query("select public.set_member_role($1, $2, 'sales_manager')", [dealer, reception]);
      await db.query("select public.set_member_role($1, $2, 'receptionist')", [dealer, reception]);
    });
  });

  it("does not expose the owner bootstrap to application users", async () => {
    await as(db, customer.id, () => rejects(db.query("select public.bootstrap_owner('autolux', $1)", [customer.email]), "permission denied"));
    await rejects(db.query("select public.bootstrap_owner('autolux', $1)", [customer.email]), "owner_exists");
  });

  it("never leaves a dealership without an active owner", async () => {
    await rejects(db.query("update public.memberships set status = 'suspended' where user_id = $1", [owner]), "last_owner");
  });

  it("removes all access immediately after suspension", async () => {
    const temp = await staff(db, dealer, "sales_manager");
    await as(db, temp, async () => {
      expect((await db.query("select id from public.leads")).rows.length).toBeGreaterThan(0);
    });
    await as(db, owner, () => db.query("select public.set_member_status($1, $2, 'suspended')", [dealer, temp]));
    await as(db, temp, async () => {
      expect((await db.query("select id from public.leads")).rows).toHaveLength(0);
      expect((await db.query("select id from public.customers")).rows).toHaveLength(0);
      await rejects(db.query("select public.dealership_overview($1)", [dealer]), "forbidden");
    });
  });

  it("lets the owner customise role permissions", async () => {
    await as(db, owner, () => db.query("select public.update_role_permissions($1, 'receptionist', array['inquiries.read', 'inquiries.update'])", [dealer]));
    await as(db, reception, async () => {
      expect((await db.query("select id from public.test_drives")).rows).toHaveLength(0);
      expect((await db.query("select id from public.inquiries")).rows.length).toBeGreaterThan(0);
    });
    await db.query(
      "insert into public.role_permissions select $1, role, permission from public.default_role_permissions where role = 'receptionist' on conflict do nothing",
      [dealer],
    );
  });
});

describe("dealership isolation", () => {
  it("hides one dealership's records from another dealership's staff", async () => {
    await as(db, rivalStaff, async () => {
      for (const table of ["leads", "customers", "test_drives", "inquiries", "sales"]) {
        expect((await db.query(`select id from public.${table}`)).rows, table).toHaveLength(0);
      }
      const { rows } = await db.query("update public.vehicles set mileage = 1 where id = $1 returning id", [vehicle]);
      expect(rows).toHaveLength(0);
      await rejects(db.query("select public.transition_vehicle($1, 'archived', 1)", [vehicle]), "forbidden");
      await rejects(db.query("select public.list_members($1)", [dealer]), "forbidden");
    });
  });

  it("rejects payloads that point at another dealership's records", async () => {
    const rivalCar = (
      await db.query<{ id: string }>(
        "insert into public.vehicles (dealership_id, slug, make, model, year, price, fuel, transmission, horsepower, drivetrain, body_type, engine, exterior_color) values ($1, 'rival-car', 'Kia', 'K5', 2024, 1000000, 'Gasoline', 'Automatic', 180, 'FWD', 'Sedan', '2.0L', 'White') returning id",
        [rival],
      )
    ).rows[0].id;
    await as(db, inventory, () =>
      rejects(
        db.query("insert into public.vehicle_media (dealership_id, vehicle_id, url) values ($1, $2, 'https://example.com/a.jpg')", [dealer, rivalCar]),
        "foreign key",
      ),
    );
    await as(db, salesManager, () =>
      rejects(db.query("select public.create_manual_lead($1, 'Test Lead', 'lead@example.com', '', $2, 'phone', null, '')", [dealer, rivalCar]), "not_found"),
    );
    await as(db, null, () => rejects(submitTestDrive(rivalCar, "x@example.com"), "vehicle_unavailable"));
  });

  it("guards storage paths by dealership, vehicle and file type", async () => {
    const path = (dealership: string, car: string, ext: string) => `${dealership}/${car}/${crypto.randomUUID()}.${ext}`;
    await as(db, inventory, async () => {
      await db.query("insert into storage.objects (bucket_id, name) values ('vehicle-media', $1)", [path(dealer, vehicle, "jpg")]);
      await rejects(db.query("insert into storage.objects (bucket_id, name) values ('vehicle-media', $1)", [path(dealer, vehicle, "exe")]), "row-level security");
      await rejects(db.query("insert into storage.objects (bucket_id, name) values ('vehicle-media', $1)", [path(rival, vehicle, "jpg")]), "row-level security");
      await rejects(db.query("insert into storage.objects (bucket_id, name) values ('vehicle-media', '../../etc/passwd')"), "row-level security");
    });
    await as(db, rep, () =>
      rejects(db.query("insert into storage.objects (bucket_id, name) values ('vehicle-media', $1)", [path(dealer, vehicle, "jpg")]), "row-level security"),
    );
    const { rows } = await db.query<{ id: string; file_size_limit: number; allowed_mime_types: string[] }>(
      "select id, file_size_limit, allowed_mime_types from storage.buckets order by id",
    );
    expect(rows.find((b) => b.id === "vehicle-media")).toMatchObject({ file_size_limit: 10485760, allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/avif"] });
    expect(rows.find((b) => b.id === "dealership-assets")?.allowed_mime_types).not.toContain("image/svg+xml");
  });
});

describe("inventory controls", () => {
  it("forces lifecycle and pricing changes through audited functions", async () => {
    await as(db, inventory, async () => {
      await rejects(db.query("update public.vehicles set price = 1 where id = $1", [vehicle]), "forbidden");
      await rejects(db.query("update public.vehicles set status = 'sold' where id = $1", [vehicle]), "invalid_transition");
      await rejects(
        db.query(
          "insert into public.vehicles (dealership_id, slug, make, model, year, price, fuel, transmission, horsepower, drivetrain, body_type, engine, exterior_color, status, published) values ($1, 'sneaky', 'BMW', 'X5', 2024, 1000, 'Gasoline', 'Automatic', 300, 'AWD', 'SUV', '3.0', 'Black', 'available', true)",
          [dealer],
        ),
        "invalid_transition",
      );
    });
    await as(db, rep, async () => {
      const { rows } = await db.query("update public.vehicles set mileage = 5 where id = $1 returning id", [vehicle]);
      expect(rows).toHaveLength(0);
      const v = await vehicleBySlug("porsche-911-carrera-s");
      await rejects(db.query("select public.change_vehicle_price($1, 1000, 'discount', $2)", [vehicle, v.version]), "forbidden");
    });
  });

  it("routes price changes through approval and blocks self-approval", async () => {
    const car = await vehicleBySlug("bmw-m5-competition");
    const result = await as(db, inventory, () =>
      db.query<{ r: string }>("select public.change_vehicle_price($1, 50000000, 'Market adjustment', $2) r", [car.id, car.version]),
    );
    expect(result.rows[0].r).toBe("requested");
    const request = (await db.query<{ id: string }>("select id from public.price_change_requests where vehicle_id = $1 and status = 'pending'", [car.id])).rows[0];
    await as(db, inventory, () => rejects(db.query("select public.decide_price_request($1, true)", [request.id]), "forbidden"));
    await as(db, manager, () => db.query("select public.decide_price_request($1, true)", [request.id]));
    const after = await db.query<{ price: string; n: number }>(
      "select v.price, (select count(*)::int from public.vehicle_price_history h where h.vehicle_id = v.id) n from public.vehicles v where id = $1",
      [car.id],
    );
    expect(Number(after.rows[0].price)).toBe(50_000_000);
    expect(after.rows[0].n).toBe(1);

    const again = await vehicleBySlug("bmw-m5-competition");
    await as(db, manager, () => db.query("select public.change_vehicle_price($1, 49000000, 'Retail promo', $2)", [again.id, again.version]));
    await as(db, inventory, async () => {
      const fresh = await vehicleBySlug("bmw-m5-competition");
      await db.query("select public.change_vehicle_price($1, 48000000, 'Clearance', $2)", [fresh.id, fresh.version]);
    });
    const pending = (await db.query<{ id: string }>("select id from public.price_change_requests where vehicle_id = $1 and status = 'pending'", [car.id])).rows[0];
    await db.query("update public.memberships set role = 'general_manager' where user_id = $1", [inventory]);
    await as(db, inventory, () => rejects(db.query("select public.decide_price_request($1, true)", [pending.id]), "self_approval"));
    await db.query("update public.memberships set role = 'inventory_manager' where user_id = $1", [inventory]);
  });

  it("detects stale edits with optimistic versions", async () => {
    const car = await vehicleBySlug("audi-rs-e-tron-gt");
    await as(db, inventory, async () => {
      await db.query("select public.transition_vehicle($1, 'draft', $2)", [car.id, car.version]);
      await rejects(db.query("select public.transition_vehicle($1, 'available', $2)", [car.id, car.version]), "conflict");
      const fresh = await vehicleBySlug("audi-rs-e-tron-gt");
      await db.query("select public.transition_vehicle($1, 'available', $2)", [car.id, fresh.version]);
    });
  });

  it("archives instead of deleting vehicles with history", async () => {
    await as(db, inventory, () => rejects(db.query("delete from public.vehicles where id = $1", [vehicle]), "archive_instead"));
  });
});

describe("bookings, reservations and sales integrity", () => {
  it("rejects duplicate and conflicting test drives", async () => {
    const car = (await vehicleBySlug("tesla-model-s-plaid")).id;
    const date = futureDate(5);
    await as(db, null, async () => {
      await submitTestDrive(car, "one@example.com", date, "10:00");
      await rejects(submitTestDrive(car, "one@example.com", date, "10:00"), "duplicate key");
      await submitTestDrive(car, "two@example.com", date, "10:00");
    });
    const rows = (await db.query<{ id: string; version: number }>("select id, version from public.test_drives where vehicle_id = $1 order by created_at", [car])).rows;
    await as(db, rep, async () => {
      await db.query("select public.set_request_status('test_drive', $1, 'confirmed', $2, null)", [rows[0].id, rows[0].version]);
      await rejects(db.query("select public.set_request_status('test_drive', $1, 'confirmed', $2, null)", [rows[1].id, rows[1].version]), "duplicate key");
    });
  });

  it("allows one open reservation per customer and one confirmed hold per vehicle", async () => {
    const car = (await vehicleBySlug("ferrari-roma")).id;
    const other = await createUser(db, "buyer");
    await as(db, customer.id, async () => {
      await db.query("select public.request_reservation('autolux', $1, '', '', 'en', true)", [car]);
      await rejects(db.query("select public.request_reservation('autolux', $1, '', '', 'en', true)", [car]), "duplicate key");
    });
    await as(db, other.id, () => db.query("select public.request_reservation('autolux', $1, '', '', 'en', true)", [car]));
    const list = (await db.query<{ id: string; version: number; user_id: string }>("select id, version, user_id from public.reservations where vehicle_id = $1", [car])).rows;
    const mine = list.find((r) => r.user_id === customer.id)!;
    const theirs = list.find((r) => r.user_id === other.id)!;
    await as(db, salesManager, async () => {
      await db.query("select public.set_request_status('reservation', $1, 'confirmed', $2, null)", [mine.id, mine.version]);
      await rejects(db.query("select public.set_request_status('reservation', $1, 'confirmed', $2, null)", [theirs.id, theirs.version]), "vehicle_unavailable");
    });
    expect((await db.query<{ status: string }>("select status from public.vehicles where id = $1", [car])).rows[0].status).toBe("reserved");
    const otherCustomer = (await db.query<{ id: string }>("select customer_id id from public.reservations where id = $1", [theirs.id])).rows[0].id;
    await as(db, salesManager, () =>
      rejects(db.query("select public.record_sale($1, $2, null, null, 90000000, current_date, 'completed', '')", [car, otherCustomer]), "vehicle_reserved"),
    );
    await as(db, customer.id, () => db.query("select public.cancel_my_request('reservation', $1)", [mine.id]));
    expect((await db.query<{ status: string }>("select status from public.vehicles where id = $1", [car])).rows[0].status).toBe("available");
  });

  it("prevents double sales and keeps sold vehicles out of bookings", async () => {
    const car = (await vehicleBySlug("porsche-718-cayman-gt4")).id;
    const buyer = (await db.query<{ id: string }>("select id from public.customers where dealership_id = $1 limit 1", [dealer])).rows[0].id;
    await as(db, rep, () =>
      rejects(db.query("select public.record_sale($1, $2, null, null, 70000000, current_date, 'completed', '')", [car, buyer]), "forbidden"),
    );
    await as(db, salesManager, async () => {
      await db.query("select public.record_sale($1, $2, null, null, 70000000, current_date, 'completed', '')", [car, buyer]);
      await rejects(db.query("select public.record_sale($1, $2, null, null, 70000000, current_date, 'completed', '')", [car, buyer]), "vehicle_unavailable");
    });
    await as(db, null, () => rejects(submitTestDrive(car, "late-buyer@example.com"), "vehicle_unavailable"));
    await as(db, customer.id, () => rejects(db.query("select public.request_reservation('autolux', $1, '', '', 'en', true)", [car]), "vehicle_unavailable"));

    const sale = (await db.query<{ id: string; version: number }>("select id, version from public.sales where vehicle_id = $1", [car])).rows[0];
    await as(db, salesManager, () => rejects(db.query("select public.cancel_sale($1, $2, 'customer withdrew')", [sale.id, sale.version]), "forbidden"));
    await as(db, manager, async () => {
      await rejects(db.query("select public.correct_sale($1, $2, 69000000, current_date, null, '', '')", [sale.id, sale.version]), "reason_required");
      await db.query("select public.correct_sale($1, $2, 69000000, current_date, null, '', 'Agreed discount')", [sale.id, sale.version]);
      await rejects(db.query("select public.cancel_sale($1, $2, 'stale')", [sale.id, sale.version]), "conflict");
      await db.query("select public.cancel_sale($1, $2, 'Customer withdrew')", [sale.id, sale.version + 1]);
    });
    expect((await db.query<{ status: string }>("select status from public.vehicles where id = $1", [car])).rows[0].status).toBe("available");
    expect((await db.query<{ n: number }>("select count(*)::int n from public.sale_events where sale_id = $1", [sale.id])).rows[0].n).toBe(3);
  });
});

describe("CRM visibility", () => {
  it("limits sales representatives to their own leads and blocks direct wins", async () => {
    const lead = (await db.query<{ id: string }>("select id from public.leads where dealership_id = $1 limit 1", [dealer])).rows[0].id;
    await as(db, rep, async () => {
      expect((await db.query("select id from public.leads")).rows).toHaveLength(0);
      expect((await db.query("select id from public.customers")).rows).toHaveLength(0);
    });
    await as(db, reception, () => db.query("update public.leads set assigned_to = $1 where id = $2", [rep, lead]));
    await as(db, rep, async () => {
      expect((await db.query("select id from public.leads")).rows).toHaveLength(1);
      expect((await db.query("select id from public.customers")).rows).toHaveLength(1);
      await rejects(db.query("update public.leads set assigned_to = $1 where id = $2", [salesManager, lead]), "forbidden");
      await rejects(db.query("update public.leads set stage = 'won' where id = $1", [lead]), "use_sale");
      await db.query("update public.leads set stage = 'contacted' where id = $1", [lead]);
      await db.query("insert into public.lead_activities (dealership_id, lead_id, actor_id, kind, body) values ($1, $2, $3, 'call', 'Called back')", [dealer, lead, rep]);
      await rejects(
        db.query("insert into public.lead_activities (dealership_id, lead_id, actor_id, kind, body) values ($1, $2, $3, 'note', 'spoofed')", [dealer, lead, salesManager]),
        "row-level security",
      );
    });
    const notes = await db.query<{ n: number }>("select count(*)::int n from public.notifications where user_id = $1 and kind = 'lead.assigned'", [rep]);
    expect(notes.rows[0].n).toBe(1);
  });

  it("restricts financing data and financial analytics", async () => {
    await as(db, null, () =>
      db.query("select public.submit_financing('autolux', null, 60000000, 12000000, 60::smallint, 'Dana', 'dana@example.com', '+7 701 222 22 22', 'en', 'fp-fin', true)"),
    );
    await as(db, rep, async () => expect((await db.query("select id from public.financing_requests")).rows).toHaveLength(0));
    await as(db, finance, async () => expect((await db.query("select id from public.financing_requests")).rows.length).toBeGreaterThan(0));
    const metrics = await as(db, inventory, () =>
      db.query<{ m: { financial: boolean; inventory: { value: number | null }; sales: { value: number | null } } }>(
        "select public.dealership_metrics($1, now() - interval '30 days', now()) m",
        [dealer],
      ),
    );
    expect(metrics.rows[0].m.financial).toBe(false);
    expect(metrics.rows[0].m.inventory.value).toBeNull();
    expect(metrics.rows[0].m.sales.value).toBeNull();
    await as(db, rep, () => rejects(db.query("select public.dealership_metrics($1, now() - interval '30 days', now())", [dealer]), "forbidden"));
  });

  it("anonymises customer personal data on request", async () => {
    const target = (await db.query<{ id: string }>("select id from public.customers where email = 'dana@example.com'")).rows[0].id;
    await as(db, salesManager, () => rejects(db.query("select public.anonymize_customer($1)", [target]), "forbidden"));
    await as(db, owner, () => db.query("select public.anonymize_customer($1)", [target]));
    const { rows } = await db.query<{ email: string | null; contact: Record<string, unknown> }>(
      "select c.email, f.contact from public.customers c join public.financing_requests f on f.customer_id = c.id where c.id = $1",
      [target],
    );
    expect(rows[0].email).toBeNull();
    expect(rows[0].contact).toEqual({});
  });
});

describe("staff invitations", () => {
  it("accepts an invitation only for the verified invited address, once", async () => {
    const invitee = await createUser(db, "invitee", { confirmed: false });
    const token = (await as(db, owner, () => db.query<{ t: string }>("select public.create_invitation($1, $2, 'sales_rep') t", [dealer, invitee.email]))).rows[0].t;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const stored = await db.query<{ token_hash: string }>("select token_hash from public.staff_invitations where email = $1", [invitee.email]);
    expect(stored.rows[0].token_hash).not.toBe(token);

    await as(db, stranger.id, () => rejects(db.query("select public.accept_invitation($1)", [token]), "invitation_email"));
    await as(db, invitee.id, () => rejects(db.query("select public.accept_invitation($1)", [token]), "email_not_confirmed"));
    await db.query("update auth.users set email_confirmed_at = now() where id = $1", [invitee.id]);
    await as(db, invitee.id, async () => {
      await rejects(db.query("select public.accept_invitation('not-a-real-token')"), "invitation_invalid");
      await db.query("select public.accept_invitation($1)", [token]);
      await rejects(db.query("select public.accept_invitation($1)", [token]), "invitation_invalid");
      const perms = await db.query<{ p: string[] }>("select public.my_permissions($1) p", [dealer]);
      expect(perms.rows[0].p).toContain("leads.read_own");
      expect(perms.rows[0].p).not.toContain("team.manage");
    });
  });

  it("records audit entries for role changes", async () => {
    const { rows } = await db.query<{ n: number }>("select count(*)::int n from public.audit_logs where entity = 'memberships' and action = 'update'");
    expect(rows[0].n).toBeGreaterThan(0);
  });
});

describe("internal helper exposure", () => {
  it("does not let clients create notifications directly", async () => {
    const call = () => db.query("select public.notify_user($1, $2, 'lead.assigned', '{}'::jsonb)", [dealer, owner]);
    await as(db, null, () => rejects(call(), "permission denied"));
    await as(db, customer.id, () => rejects(call(), "permission denied"));
    await as(db, rep, () => rejects(call(), "permission denied"));
  });

  it("answers membership checks only for staff of the same dealership", async () => {
    const check = () => db.query<{ ok: boolean }>("select public.is_active_member($1, $2) ok", [dealer, owner]);
    await as(db, null, () => rejects(check(), "permission denied"));
    await as(db, customer.id, async () => expect((await check()).rows[0].ok).toBe(false));
    await as(db, rivalStaff, async () => expect((await check()).rows[0].ok).toBe(false));
    await as(db, rep, async () => expect((await check()).rows[0].ok).toBe(true));
  });

  it("still accepts public requests for a customer whose open lead is assigned", async () => {
    const submit = (fp: string) =>
      db.query("select public.submit_inquiry('autolux', 'Assigned Client', 'assigned@example.com', '', 'general', 'Still interested in the car', null, 'en', $1, true)", [fp]);
    await as(db, null, () => submit("fp-assigned-1"));
    const lead = (await db.query<{ id: string }>("select l.id from public.leads l join public.customers c on c.id = l.customer_id where c.email = 'assigned@example.com'")).rows[0].id;
    await as(db, reception, () => db.query("update public.leads set assigned_to = $1 where id = $2", [rep, lead]));
    await as(db, null, () => submit("fp-assigned-2"));
    const rows = await db.query<{ id: string; assigned_to: string }>("select l.id, l.assigned_to from public.leads l join public.customers c on c.id = l.customer_id where c.email = 'assigned@example.com'");
    expect(rows.rows).toEqual([{ id: lead, assigned_to: rep }]);
  });
});
