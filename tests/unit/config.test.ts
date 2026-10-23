import { afterEach, describe, expect, it } from "vitest";
import { assertPublicKey, supabaseEnv } from "@/lib/supabase/config";

const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});

describe("Supabase environment validation", () => {
  it("refuses secret or service-role keys in the public configuration", () => {
    expect(() => assertPublicKey("sb_secret_abcdefghijklmnopqrstuvwxyz")).toThrow(/secret/);
    expect(() => assertPublicKey(jwt("service_role"))).toThrow(/secret/);
    expect(() => assertPublicKey(jwt("anon"))).not.toThrow();
    expect(() => assertPublicKey("sb_publishable_abcdefghijklmnopqrstuvwxyz")).not.toThrow();
  });

  it("reports partial configuration instead of silently running in demo mode", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(() => supabaseEnv()).toThrow(/partly configured/);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_abcdefghijklmnopqrstuvwxyz";
    expect(supabaseEnv()).toMatchObject({ url: "https://example.supabase.co" });
  });
});
