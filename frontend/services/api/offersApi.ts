import { apiRequest } from "./base";
import { getSessionId } from "./cartApi";
import type { Offer, OffersResponse, OffersSummaryResponse } from "./types";

export interface OffersQueryParams {
  status?: "all" | "active" | "upcoming" | "expired" | "ended";
  type?: "percentage" | "fixed_amount" | "free_delivery" | "bogo";
  applies_to?: "order" | "category" | "product";
  ending_soon?: boolean;
  for_you?: boolean;
  search?: string;
  sort?: "recommended" | "ending_soon" | "biggest_savings" | "newest";
}

export interface FetchOptions {
  /** Pull-to-refresh path — skip the AsyncStorage cache, hit the network. */
  forceRefresh?: boolean;
}

/**
 * Stable cache key from the params object. Order-independent and bounded —
 * different filter combinations cache to different keys, but the same
 * filters always produce the same key (no spurious cache misses from
 * object-identity changes).
 */
const buildOffersCacheKey = (params: OffersQueryParams): string => {
  const parts: string[] = [];
  if (params.status) parts.push(`s=${params.status}`);
  if (params.type) parts.push(`t=${params.type}`);
  if (params.applies_to) parts.push(`a=${params.applies_to}`);
  if (params.ending_soon) parts.push(`es=1`);
  if (params.for_you) parts.push(`fy=1`);
  if (params.search) parts.push(`q=${params.search}`);
  if (params.sort) parts.push(`o=${params.sort}`);
  return `offers:list:${parts.sort().join(":")}`;
};

export const getOffers = async (
  params: OffersQueryParams = {},
  options: FetchOptions = {},
): Promise<OffersResponse> => {
  const sessionId = await getSessionId();

  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.type) query.set("type", params.type);
  if (params.applies_to) query.set("applies_to", params.applies_to);
  if (params.ending_soon) query.set("ending_soon", "1");
  if (params.for_you) query.set("for_you", "1");
  if (params.search) query.set("search", params.search);
  if (params.sort) query.set("sort", params.sort);

  return apiRequest<OffersResponse>(`/offers?${query.toString()}`, {
    method: "GET",
    headers: { "X-Session-ID": sessionId },
    // Offers change rarely from the customer's perspective — 10 min TTL.
    // Pull-to-refresh forces a network hit anyway.
    cacheKey: buildOffersCacheKey(params),
    cacheTtlMs: 10 * 60 * 1000,
    forceRefresh: options.forceRefresh,
  });
};

export const getOffersSummary = async (
  options: FetchOptions = {},
): Promise<OffersSummaryResponse> => {
  const sessionId = await getSessionId();

  return apiRequest<OffersSummaryResponse>(`/offers/summary`, {
    method: "GET",
    headers: { "X-Session-ID": sessionId },
    cacheKey: "offers:summary",
    cacheTtlMs: 10 * 60 * 1000,
    forceRefresh: options.forceRefresh,
  });
};

export type { Offer };
