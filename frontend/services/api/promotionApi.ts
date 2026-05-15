import { API_BASE_URL, getAuthToken, getCommonHeaders, apiRequest } from "./base";
import type {
  Promotion,
  PromotionListResponse,
  PromotionDetailResponse,
  PromotionProductsResponse,
} from "@/types/promotion";

interface PromotionFetchOptions {
  /** Pull-to-refresh path — skip the AsyncStorage cache, hit the network. */
  forceRefresh?: boolean;
}

// Promotions change rarely from the customer's perspective — 10 min default.
// Pull-to-refresh forces a network hit anyway.
const PROMOTIONS_CACHE_TTL = 10 * 60 * 1000;

/**
 * Get all active promotions (cache-first via apiRequest cacheKey).
 */
export const getPromotions = async (
  params?: {
    applies_to?: "all" | "category" | "products";
    category_id?: number;
  },
  options: PromotionFetchOptions = {},
): Promise<PromotionListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.applies_to) queryParams.append("applies_to", params.applies_to);
  if (params?.category_id)
    queryParams.append("category_id", params.category_id.toString());

  const qs = queryParams.toString();
  const cacheKey = `promotions:list${qs ? `:${qs}` : ""}`;

  return apiRequest<PromotionListResponse>(
    `/promotions${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      cacheKey,
      cacheTtlMs: PROMOTIONS_CACHE_TTL,
      forceRefresh: options.forceRefresh,
    },
  );
};

/**
 * Get featured promotion for homepage hero banner (with cache).
 */
export const getFeaturedPromotion = async (
  options: PromotionFetchOptions = {},
): Promise<PromotionDetailResponse> => {
  return apiRequest<PromotionDetailResponse>(`/promotions/featured`, {
    method: "GET",
    cacheKey: "promotions:featured",
    cacheTtlMs: PROMOTIONS_CACHE_TTL,
    forceRefresh: options.forceRefresh,
  });
};

/**
 * Get single promotion details
 */
export const getPromotion = async (
  id: number,
): Promise<PromotionDetailResponse> => {
  const response = await fetch(`${API_BASE_URL}/promotions/${id}`, {
    method: "GET",
    headers: getCommonHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch promotion details");
  }

  return response.json();
};

/**
 * Get products in a promotion
 */
export const getPromotionProducts = async (
  id: number,
  page: number = 1,
): Promise<PromotionProductsResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/promotions/${id}/products?page=${page}`,
    {
      method: "GET",
      headers: getCommonHeaders(),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch promotion products");
  }

  return response.json();
};
