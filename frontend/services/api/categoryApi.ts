import { API_BASE_URL, safeResponseJson } from "./base";
import type { Category } from "@/types";
import { cacheFirstFetch, networkFirstFetch } from "../cache/apiCache";

export interface CategoriesResponse {
  success: boolean;
  data: {
    categories: Category[];
  };
}

export interface CategoryResponse {
  success: boolean;
  data: {
    category: Category;
  };
}

export interface CategoryProductsResponse {
  success: boolean;
  data: {
    category: Category;
    products: any[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  };
}

export interface CategoryWithProducts {
  id: number;
  name_en: string;
  name_ar: string;
  slug: string;
  icon: string | null;
  products_count: number;
  products: any[];
}

export interface FeaturedCategoriesResponse {
  success: boolean;
  data: {
    categories: CategoryWithProducts[];
  };
}

/**
 * Shared fetch options across all category endpoints.
 *
 *   forceRefresh: pull-to-refresh path — skip the cache read, hit the
 *   network, and overwrite the saved snapshot with the fresh body so the
 *   next cold app open sees current data.
 */
interface CategoryFetchOptions {
  forceRefresh?: boolean;
}

/**
 * Get categories with featured products for home page.
 *
 * Uses network-first: always tries the network, falls back to the cached
 * snapshot only when offline. forceRefresh is accepted for API symmetry but
 * has no practical effect here — network-first already bypasses the cache
 * read by design.
 */
export const getFeaturedCategoriesWithProducts = async (
  _options: CategoryFetchOptions = {},
): Promise<FeaturedCategoriesResponse> => {
  const fetchFn = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/categories/featured-with-products`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        return { success: false, data: { categories: [] } };
      }

      const data = await safeResponseJson(response);
      if (!data.success) {
        return { success: false, data: { categories: [] } };
      }
      return data;
    } catch (error) {
      console.error("getFeaturedCategoriesWithProducts error:", error);
      return { success: false, data: { categories: [] } };
    }
  };

  return await networkFirstFetch(
    "categories:featured-with-products",
    fetchFn,
    5 * 60 * 1000,
  );
};

/**
 * Get all categories. Cache-first by default; pull-to-refresh paths pass
 * forceRefresh=true so the cached snapshot is replaced with fresh data.
 */
export const getCategories = async (
  options: CategoryFetchOptions = {},
): Promise<CategoriesResponse> => {
  const fetchFn = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json; charset=utf-8",
        },
      });

      if (!response.ok) {
        return { success: false, data: { categories: [] } };
      }

      const data = await safeResponseJson(response);
      if (!data.success) {
        return { success: false, data: { categories: [] } };
      }
      return data;
    } catch (error) {
      console.error("getCategories error:", error);
      return { success: false, data: { categories: [] } };
    }
  };

  return await cacheFirstFetch("categories:all", fetchFn, {
    ttl: 10 * 60 * 1000,
    forceRefresh: options.forceRefresh ?? false,
  });
};

/**
 * Get single category. Cache-first; forceRefresh re-fetches and overwrites.
 */
export const getCategory = async (
  categoryId: number,
  options: CategoryFetchOptions = {},
): Promise<CategoryResponse> => {
  const fetchFn = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("The requested item could not be found.");
      }

      const data = await safeResponseJson(response);
      if (!data.success) {
        throw new Error("Could not load products. Please try again.");
      }
      return data;
    } catch (error) {
      console.error(`getCategory(${categoryId}) error:`, error);
      throw error;
    }
  };

  return await cacheFirstFetch(`category:${categoryId}`, fetchFn, {
    ttl: 10 * 60 * 1000,
    forceRefresh: options.forceRefresh ?? false,
  });
};

/**
 * Get category with its products (network-first; offline fallback to cache).
 */
export const getCategoryProducts = async (
  categoryId: number,
  filters?: {
    subcategory_id?: number;
    sort_by?: string;
    sort_order?: string;
    min_price?: number;
    max_price?: number;
    min_rating?: number;
    in_stock?: boolean;
    per_page?: number;
    page?: number;
  },
  _options: CategoryFetchOptions = {},
): Promise<CategoryProductsResponse> => {
  const queryParams = new URLSearchParams();
  if (filters?.subcategory_id)
    queryParams.append("subcategory_id", filters.subcategory_id.toString());
  if (filters?.sort_by) queryParams.append("sort_by", filters.sort_by);
  if (filters?.sort_order) queryParams.append("sort_order", filters.sort_order);
  if (filters?.min_price)
    queryParams.append("min_price", filters.min_price.toString());
  if (filters?.max_price)
    queryParams.append("max_price", filters.max_price.toString());
  if (filters?.min_rating)
    queryParams.append("min_rating", filters.min_rating.toString());
  if (filters?.in_stock !== undefined)
    queryParams.append("in_stock", filters.in_stock ? "1" : "0");
  if (filters?.per_page)
    queryParams.append("per_page", filters.per_page.toString());
  if (filters?.page) queryParams.append("page", filters.page.toString());

  const queryString = queryParams.toString();
  const cacheKey = `category:${categoryId}:products${queryString ? `:${queryString}` : ""}`;

  const fetchFn = async () => {
    try {
      const url = `${API_BASE_URL}/categories/${categoryId}/products${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Could not load products. Please try again.");
      }

      const data = await safeResponseJson(response);
      if (!data.success) {
        throw new Error("Failed to load category products");
      }
      return data;
    } catch (error) {
      console.error("getCategoryProducts error:", error);
      throw error;
    }
  };

  return await networkFirstFetch(cacheKey, fetchFn, 5 * 60 * 1000);
};
