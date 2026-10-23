import { REQUEST_KINDS, type RequestKind } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rowToCar, VEHICLE_SELECT, type VehicleRow } from "./vehicles";

export type MyRequest = {
  kind: RequestKind;
  id: string;
  reference: string;
  status: string;
  created_at: string;
  starts_at?: string | null;
  hold_until?: string | null;
  vehicle?: { make: string; model: string; slug: string } | null;
};

const ACCOUNT_KINDS: RequestKind[] = ["test_drive", "reservation", "financing", "trade_in", "service", "inquiry"];
const WITH_VEHICLE: RequestKind[] = ["test_drive", "reservation", "financing", "inquiry"];

export async function getMyRequests(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const results = await Promise.all(
    ACCOUNT_KINDS.map(async (kind) => {
      const extra = REQUEST_KINDS[kind].appointment ? ", starts_at" : kind === "reservation" ? ", hold_until" : "";
      const vehicle = WITH_VEHICLE.includes(kind) ? ", vehicle:vehicles(make, model, slug)" : "";
      const { data, error } = await supabase
        .from(REQUEST_KINDS[kind].table)
        .select(`id, reference, status, created_at${extra}${vehicle}`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data as unknown as Omit<MyRequest, "kind">[]).map((row) => ({ ...row, kind }));
    }),
  );
  return results.flat().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getMyFavorites(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("favorites")
    .select(`created_at, vehicles(${VEHICLE_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as { vehicles: VehicleRow | null }[])
    .map((row) => row.vehicles)
    .filter((row): row is VehicleRow => Boolean(row))
    .map(rowToCar);
}
