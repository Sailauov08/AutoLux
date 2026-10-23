import { z } from "zod";

const envSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  key: z.string().min(20),
});

const decodeRole = (key: string) => {
  const payload = key.split(".")[1];
  if (!payload) return null;
  try {
    return (JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
};

export function assertPublicKey(key: string) {
  if (key.startsWith("sb_secret_") || decodeRole(key) === "service_role") {
    throw new Error("A secret Supabase key was supplied as a public key. Use the publishable (or anon) key only.");
  }
}

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url && !key) return null;
  const parsed = envSchema.safeParse({ url, key });
  if (!parsed.success) {
    throw new Error("Supabase is partly configured: set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  assertPublicKey(parsed.data.key);
  return parsed.data;
}

export const isSupabaseConfigured = () => supabaseEnv() !== null;

export const dealershipSlug = () => {
  const slug = process.env.NEXT_PUBLIC_DEALERSHIP_SLUG || "autolux";
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) throw new Error("NEXT_PUBLIC_DEALERSHIP_SLUG is invalid.");
  return slug;
};

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
