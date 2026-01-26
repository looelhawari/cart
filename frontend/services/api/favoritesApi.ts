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

export const listFavorites = async (
  perPage: number = 50,
): Promise<FavoritesResponse> => {
  return await apiRequest<FavoritesResponse>(`/favorites?per_page=${perPage}`);
};

export const addFavorite = async (
  productId: number,
): Promise<FavoriteResponse> => {
  return await apiRequest<FavoriteResponse>("/favorites", {
    method: "POST",
    body: JSON.stringify({ product_id: productId }),
  });
};

export const removeFavorite = async (
  productId: number,
): Promise<FavoriteResponse> => {
  return await apiRequest<FavoriteResponse>(`/favorites/${productId}`, {
    method: "DELETE",
  });
};
