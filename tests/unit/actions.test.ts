import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7", "user-agent": "vitest" }),
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

describe("public form actions", () => {
  it("rejects invalid input on the server with field errors", async () => {
    const { submitContact } = await import("@/lib/actions/submissions");
    const result = await submitContact({ name: "", email: "bad", phone: "", topic: "general", message: "short" }, "kk");
    expect(result).toMatchObject({ ok: false, error: "invalid", fields: { name: "name", email: "email", message: "message" } });
  });

  it("reports an unconfigured backend instead of faking success", async () => {
    const { submitContact, submitTradeIn } = await import("@/lib/actions/submissions");
    const contact = await submitContact({ name: "Aida", email: "aida@example.com", phone: "", topic: "general", message: "Is the S 580 available?", consent: true }, "ru");
    expect(contact).toEqual({ ok: false, error: "unconfigured", fields: undefined });
    const tradeIn = await submitTradeIn(
      { brand: "Toyota", model: "Camry", year: "2020", mileage: "60000", condition: "good", name: "Dana", email: "dana@example.com", phone: "+7 701 222 22 22", consent: true },
      "en",
    );
    expect(tradeIn.ok).toBe(false);
  });

  it("does not allow admin actions without a configured backend and session", async () => {
    const { saveSettings, setMemberRole, inviteStaff } = await import("@/lib/actions/team");
    const { createVehicle, uploadVehicleMedia } = await import("@/lib/actions/inventory");
    const { recordSale } = await import("@/lib/actions/operations");
    expect(await saveSettings({})).toEqual({ ok: false, error: "unconfigured", fields: undefined });
    expect(await setMemberRole({ userId: "00000000-0000-4000-8000-000000000000", role: "owner" })).toMatchObject({ ok: false });
    expect(await inviteStaff({ email: "a@example.com", role: "sales_rep" }, "en")).toMatchObject({ ok: false });
    expect(await createVehicle({})).toMatchObject({ ok: false });
    expect(await uploadVehicleMedia(new FormData())).toMatchObject({ ok: false });
    expect(await recordSale({})).toMatchObject({ ok: false });
  });

  it("does not allow sign-in without a configured backend", async () => {
    const { signIn } = await import("@/lib/actions/account");
    expect(await signIn({ email: "owner@example.com", password: "secret-password" })).toEqual({ ok: false, error: "unconfigured", fields: undefined });
  });
});
