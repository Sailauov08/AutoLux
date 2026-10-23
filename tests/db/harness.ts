import { readdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../supabase/", import.meta.url);

const PLATFORM_STUB = `
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text not null,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid
);
alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
`;

export type StaffRole =
  | "owner"
  | "general_manager"
  | "sales_manager"
  | "sales_rep"
  | "inventory_manager"
  | "finance_manager"
  | "receptionist";

export async function createDatabase({ seed = true } = {}) {
  const db = new PGlite();
  await db.exec(PLATFORM_STUB);
  for (const file of readdirSync(new URL("migrations/", root)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(`migrations/${file}`, root), "utf8"));
  }
  if (seed) await db.exec(readFileSync(new URL("seed.sql", root), "utf8"));
  return db;
}

export async function createUser(db: PGlite, label = "user", { confirmed = true } = {}) {
  const id = randomUUID();
  const email = `${label}-${id.slice(0, 8)}@example.com`;
  await db.query("insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values ($1, $2, $3, $4)", [
    id,
    email,
    confirmed ? new Date().toISOString() : null,
    JSON.stringify({ full_name: `${label} person`, locale: "en" }),
  ]);
  return { id, email };
}

export async function dealershipId(db: PGlite, slug = "autolux") {
  const { rows } = await db.query<{ id: string }>("select id from public.dealerships where slug = $1", [slug]);
  return rows[0].id;
}

export async function createDealership(db: PGlite, slug: string) {
  const { rows } = await db.query<{ id: string }>("insert into public.dealerships (slug, name) values ($1, $2) returning id", [slug, `${slug} motors`]);
  return rows[0].id;
}

export async function staff(db: PGlite, dealership: string, role: StaffRole) {
  const user = await createUser(db, role);
  await db.query("insert into public.memberships (dealership_id, user_id, role) values ($1, $2, $3)", [dealership, user.id, role]);
  return user.id;
}

export async function as<T>(db: PGlite, userId: string | null, run: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.exec(`set role ${userId ? "authenticated" : "anon"}`);
  try {
    return await run();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

export async function rejects(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (error) {
    const message = String((error as Error).message ?? error);
    if (message.includes(code)) return true;
    throw new Error(`expected "${code}" but got "${message}"`);
  }
  throw new Error(`expected "${code}" but the statement succeeded`);
}

export const futureDate = (days = 2) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
