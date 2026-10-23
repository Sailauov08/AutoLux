import { unstable_cache } from "next/cache";
import { cache } from "react";
import { TIME_SLOTS } from "@/lib/domain";
import { DEALERSHIP } from "@/lib/site";
import { dealershipSlug } from "@/lib/supabase/config";
import { createSupabasePublicClient } from "@/lib/supabase/server";

type Address = { line1?: string; line2?: string };
type HoursKey = "weekdays" | "saturday" | "sunday";

export type DealershipInfo = {
  id: string | null;
  name: string;
  phone: string;
  phoneHref: string;
  email: string;
  whatsapp: string | null;
  address: Partial<Record<"en" | "ru" | "kk", Address>> | null;
  mapsUrl: string;
  logoUrl: string | null;
  hours: { key: HoursKey; time: string }[];
  socials: { label: string; href: string }[];
  services: string[];
  bookingSlots: string[];
  bookingWindowDays: number;
  serviceEnabled: boolean;
  testDriveEnabled: boolean;
  currency: string;
  timezone: string;
};

const PUBLIC_COLUMNS =
  "id, name, phone, email, whatsapp, address, maps_url, logo_url, hours, socials, services, booking_slots, booking_window_days, service_enabled, test_drive_enabled, currency, timezone";

const HOURS: HoursKey[] = ["weekdays", "saturday", "sunday"];

const FALLBACK: DealershipInfo = {
  id: null,
  name: DEALERSHIP.name,
  phone: DEALERSHIP.phone,
  phoneHref: DEALERSHIP.phoneHref,
  email: DEALERSHIP.email,
  whatsapp: null,
  address: null,
  mapsUrl: DEALERSHIP.mapsUrl,
  logoUrl: null,
  hours: DEALERSHIP.hours.map((slot) => ({ key: slot.key as HoursKey, time: slot.time })),
  socials: DEALERSHIP.socials,
  services: ["maintenance", "inspection", "detailing", "tyres", "repair"],
  bookingSlots: [...TIME_SLOTS],
  bookingWindowDays: 90,
  serviceEnabled: true,
  testDriveEnabled: true,
  currency: "KZT",
  timezone: "Asia/Almaty",
};

const fetchDealership = unstable_cache(
  async (slug: string) => {
    const client = createSupabasePublicClient();
    if (!client) return null;
    const { data, error } = await client.from("dealerships").select(PUBLIC_COLUMNS).eq("slug", slug).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
  ["dealership"],
  { revalidate: 300, tags: ["dealership"] },
);

export const getDealership = cache(async (): Promise<DealershipInfo> => {
  if (!createSupabasePublicClient()) return FALLBACK;
  const data = await fetchDealership(dealershipSlug());
  if (!data) throw new Error(`Dealership "${dealershipSlug()}" does not exist. Run supabase/seed.sql or create it.`);
  const hours = (data.hours ?? {}) as Partial<Record<HoursKey, string>>;
  return {
    id: data.id,
    name: data.name,
    phone: data.phone ?? "",
    phoneHref: (data.phone ?? "").replace(/[^+\d]/g, ""),
    email: data.email ?? "",
    whatsapp: data.whatsapp,
    address: data.address && Object.keys(data.address).length ? data.address : null,
    mapsUrl: data.maps_url ?? "",
    logoUrl: data.logo_url,
    hours: HOURS.filter((key) => hours[key]).map((key) => ({ key, time: hours[key]! })),
    socials: Array.isArray(data.socials) ? data.socials : [],
    services: data.services ?? [],
    bookingSlots: data.booking_slots ?? [],
    bookingWindowDays: data.booking_window_days ?? 90,
    serviceEnabled: data.service_enabled,
    testDriveEnabled: data.test_drive_enabled,
    currency: data.currency,
    timezone: data.timezone,
  };
});

export const getDealershipId = cache(async () => (await getDealership()).id);
