import { describe, expect, it } from "vitest";
import { DEFAULT_PERMISSIONS, PERMISSIONS, ROLE_RANK, STAFF_ROLES } from "@/lib/auth/permissions";
import { createDatabase } from "./harness";

describe("permission matrix", () => {
  it("matches the database defaults exactly", async () => {
    const db = await createDatabase({ seed: false });
    const catalogue = (await db.query<{ key: string }>("select key from public.permissions order by key")).rows.map((row) => row.key);
    expect(catalogue).toEqual([...PERMISSIONS].sort());
    const rows = (await db.query<{ role: string; permission: string }>("select role::text, permission from public.default_role_permissions")).rows;
    for (const role of STAFF_ROLES) {
      expect(rows.filter((row) => row.role === role).map((row) => row.permission).sort(), role).toEqual([...DEFAULT_PERMISSIONS[role]].sort());
    }
    const ranks = (await db.query<{ role: string; rank: number }>("select role::text, rank from public.role_rank")).rows;
    expect(Object.fromEntries(ranks.map((row) => [row.role, row.rank]))).toEqual(ROLE_RANK);
  });
});
