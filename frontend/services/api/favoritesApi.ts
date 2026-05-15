import { apiRequest } from "./base";
import type { Product } from "@/types";

export interface FavoriteItem {
  id: number;
  product: Product;
  created_at: string;
}

export interface FavoritesResponse {
  success: boolean;
  data: {
    favorites: FavoriteItem[];
    pagination?: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  };
}

export interface FavoriteResponse {
  success: boolean;
  message: string;
  data?: {
    favorite?: FavoriteItem;
  };
}

/**
 * Pull-to-refresh on the favorites screen passes forceRefresh=true so the
 * cached snapshot is replaced with fresh data. add/remove mutations
 * invalidate the favorites:* prefix automatically.
 */
interface FavoritesFetchOptions {
  forceRefresh?: boolean;
}

const FAVORITES_TTL = 24 * 60 * 60 * 1000;
const FAVORITES_INVALIDATE = ["favorites"];

export const listFavorites = async (
  perPage: number = 50,
  options: FavoritesFetchOptions = {},
): Promise<FavoritesResponse> => {
  return await apiRequest<FavoritesResponse>(`/favorites?per_page=${perPage}`, {
    cacheKey: `favorites:list:${perPage}`,
    cacheTtlMs: FAVORITES_TTL,
    forceRefresh: options.forceRefresh,
  });
};

export const addFavorite = async (
  productId: number,
): Promise<FavoriteResponse> => {
  return await apiRequest<FavoriteResponse>("/favorites", {
    method: "POST",
    body: JSON.stringify({ product_id: productId }),
    invalidatePrefixes: FAVORITES_INVALIDATE,
  });
};

export const removeFavorite = async (
  productId: number,
): Promise<FavoriteResponse> => {
  return await apiRequest<FavoriteResponse>(`/favorites/${productId}`, {
    method: "DELETE",
    invalidatePrefixes: FAVORITES_INVALIDATE,
  });
};
