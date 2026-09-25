import { apiGet, apiPost, type ListParams } from "@/services/api/client";
import type { Asset, AssetCreate, AssetParameter, MaybePaginated } from "@/services/api/types";
import { toList } from "@/services/api/types";

/** GET /api/assets — master asset register. */
export async function fetchAssets(params?: ListParams): Promise<Asset[]> {
  return toList(await apiGet<MaybePaginated<Asset>>("/api/assets", params));
}

/** POST /api/assets — register a new master asset. */
export async function createAsset(body: AssetCreate): Promise<Asset> {
  return apiPost<Asset>("/api/assets", body);
}

/** GET /api/assets/{id}/parameters — parameters recorded for a specific asset. */
export async function fetchAssetParameters(assetId: number): Promise<AssetParameter[]> {
  return toList(await apiGet<MaybePaginated<AssetParameter>>(`/api/assets/${assetId}/parameters`));
}