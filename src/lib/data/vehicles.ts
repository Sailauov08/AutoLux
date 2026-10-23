import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { CARS, type Car, type CarBadge, getSimilarCars, type PhotoSource } from "@/lib/cars";
import type { VehicleStatus } from "@/lib/domain";
import { createSupabasePublicClient } from "@/lib/supabase/server";
import { getDealershipId } from "./dealership";

export type Localized = Partial<Record<"en" | "ru" | "kk", string>>;

export type VehicleRow = {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel: string;
  transmission: string;
  horsepower: number;
  drivetrain: string;
  body_type: string;
  exterior_color: string;
  engine: string;
  status: VehicleStatus;
  featured: boolean;
  badges: CarBadge[];
  description: Localized;
  vehicle_media: { url: string; source: "dealer" | "representative"; position: number }[];
  vehicle_equipment: { position: number; label: Localized }[];
};

export const VEHICLE_SELECT =
  "id, slug, make, model, year, price, mileage, fuel, transmission, horsepower, drivetrain, body_type, exterior_color, engine, status, featured, badges, description, vehicle_media(url, source, position), vehicle_equipment(position, label)";

export function rowToCar(row: VehicleRow): Car {
  const media = [...row.vehicle_media].sort((a, b) => a.position - b.position);
  const photoSource: PhotoSource = media.length === 0 ? "pending" : media[0].source === "dealer" ? "dealer" : "representative";
  return {
    id: row.slug,
    uuid: row.id,
    brand: row.make,
    model: row.model,
    year: row.year,
    price: Number(row.price),
    mileage: row.mileage,
    fuel: row.fuel,
    transmission: row.transmission,
    horsepower: row.horsepower,
    drivetrain: row.drivetrain,
    bodyType: row.body_type,
    color: row.exterior_color,
    engine: row.engine,
    images: media.map((item) => item.url),
    photoSource,
    badges: row.badges,
    featured: row.featured,
    status: row.status,
  };
}

// Published inventory is shared by every visitor, so it is cached across requests;
// staff writes call refreshSite(), which expires the "vehicles" tag immediately.
const fetchRows = unstable_cache(
  async (dealershipId: string | null) => {
    const client = createSupabasePublicClient();
    if (!client) return null;
    const { data, error } = await client
      .from("vehicles")
      .select(VEHICLE_SELECT)
      .eq("dealership_id", dealershipId)
      .eq("published", true)
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data as unknown as VehicleRow[];
  },
  ["vehicles"],
  { revalidate: 300, tags: ["vehicles"] },
);

const loadRows = cache(async () => (createSupabasePublicClient() ? fetchRows(await getDealershipId()) : null));

export async function getVehicles(): Promise<Car[]> {
  const rows = await loadRows();
  return rows ? rows.map(rowToCar) : CARS.map((car) => ({ ...car, status: "available" }));
}

export async function getVehicle(slug: string) {
  return (await getVehicles()).find((car) => car.id === slug) ?? null;
}

export async function getVehicleUuid(slug: string) {
  return (await getVehicle(slug))?.uuid ?? null;
}

export async function getFeaturedVehicles() {
  return (await getVehicles()).filter((car) => car.featured && car.status !== "sold").slice(0, 3);
}

export async function getSimilarVehicles(car: Car) {
  return getSimilarCars(car, (await getVehicles()).filter((item) => item.status !== "sold"));
}

export const pickLocale = (value: Localized | undefined, locale: string) => value?.[locale as keyof Localized] || value?.en || "";

export async function getVehicleCopy(slug: string, locale: string): Promise<{ description: string; features: string[] }> {
  const rows = await loadRows();
  if (!rows) {
    const t = await getTranslations({ locale, namespace: "cars" });
    return t.has(slug) ? { description: t(`${slug}.description`), features: t.raw(`${slug}.features`) as string[] } : { description: "", features: [] };
  }
  const row = rows.find((item) => item.slug === slug);
  return {
    description: pickLocale(row?.description, locale),
    features: [...(row?.vehicle_equipment ?? [])].sort((a, b) => a.position - b.position).map((item) => pickLocale(item.label, locale)),
  };
}
