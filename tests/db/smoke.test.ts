import { describe, expect, it } from "vitest";
import { createDatabase, dealershipId } from "./harness";

describe("migrations", () => {
  it("apply cleanly with the seed", async () => {
    const db = await createDatabase();
    const id = await dealershipId(db);
    const { rows } = await db.query<{ n: number }>("select count(*)::int n from public.vehicles where dealership_id = $1", [id]);
    expect(rows[0].n).toBe(15);
  });
});
