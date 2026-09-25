import { apiGet, apiPost, type ListParams } from "@/services/api/client";
import type { Location, LocationCreate, MaybePaginated } from "@/services/api/types";
import { toList } from "@/services/api/types";

/** GET /api/locations — section/station/line catalogue. */
export async function fetchLocations(params?: ListParams): Promise<Location[]> {
  return toList(await apiGet<MaybePaginated<Location>>("/api/locations", params));
}

/** POST /api/locations — create a location record. */
export async function createLocation(body: LocationCreate): Promise<Location> {
  return apiPost<Location>("/api/locations", body);
}