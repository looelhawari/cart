import { API_BASE_URL, safeResponseJson, getCommonHeaders } from "./base";
import type { Product } from "@/types";
import { cacheFirstFetch, networkFirstFetch } from "../cache/apiCache";

export interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination?: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  };
}

export interface ProductResponse {
  success: boolean;
  data: {
    product: Product;
  };
}

export interface ProductFilters {
  category_id?: number;
  search?: string;
  on_sale?: boolean;
  sort_by?: "created_at" | "price" | "name_en";
  sort_order?: "asc" | "desc";
  per_page?: number;
  page?: number;
}

/**
 * Pull-to-refresh path passes forceRefresh=true so the cached snapshot is
 * overwritten with the fresh body. Network-first endpoints accept the flag
 * for API symmetry but ignore it (they always hit the network first).
 */
interface ProductFetchOptions {
  forceRefresh?: boolean;
}

// Helper to build query string
const buildQueryString = (params?: Record<string, any>): string => {
  if (!params) return "";
  const query = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");
  return query ? `?${query}` : "";
};

/**
 * Get all products with optional filters (network-first; offline fallback).
 */
export const getProducts = async (
  filters?: ProductFilters,
  _options: ProductFetchOptions = {},
): Promise<ProductsResponse> => {
  const queryString = buildQueryString(filters);
  const cacheKey = `products:all${queryString}`;

  const fetchFn = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products${queryString}`, {
        method: "GET",
        headers: getCommonHeaders(),
      });

      if (!response.ok) {
        console.error("Products API error:", response.status);
        return { success: false, data: { products: [] } };
      }

      const data = await safeResponseJson(response);
      if (!data.success) {
        return { success: false, data: { products: [] } };
      }
      return data;
    } catch (error) {
      console.error("getProducts error:", error);
      return { success: false, data: { products: [] } };
    }
  };

  return await networkFirstFetch(cacheKey, fetchFn, 5 * 60 * 1000);
};

/**
 * Get single product by barcode. Cache-first; forceRefresh overwrites.
 */
export const getProduct = async (
  barcode: number | string,
  options: ProductFetchOptions = {},
): Promise<ProductResponse> => {
  const fetchFn = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${barcode}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Product is currently unavailable.");
      }

      const data = await safeResponseJson(response);
      if (!data.success) {
        throw new Error("Product is currently unavailable.");
      }
      return data;
    } catch (error) {
      console.error(`getProduct(${barcode}) error:`, error);
      throw error;
    }
  };

  return await cacheFirstFetch(`product:${barcode}`, fetchFn, {
    ttl: 15 * 60 * 1000,
    forceRefresh: options.forceRefresh ?? false,
  });
};

/**
 * Get featured products (network-first; offline fallback to cache).
 */
export const getFeaturedProducts = async (
  _options: ProductFetchOptions = {},
): Promise<ProductsResponse> => {
  const fetchFn = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/featured`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, data: { products: [] } };
      }

      const data = await safeResponseJson(response);
      if (!data.success) {
        return { success: false, data: { products: [] } };
      }
      return data;
    } catch (error) {
      console.error("getFeaturedProducts error:", error);
      return { success: false, data: { products: [] } };
    }
  };

  return await networkFirstFetch("products:featured", fetchFn, 5 * 60 * 1000);
};

/**
 * Get flash deals (network-first; offline fallback).
 */
export const getFlashDeals = async (
  _options: ProductFetchOptions = {},
): Promise<ProductsResponse> => {
  const fetchFn = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/flash-deals`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, data: { products: [] } };
      }

      const data = await safeResponseJson(response);
      if (!data.success) {
        return { success: false, data: { products: [] } };
      }
      return data;
    } catch (error) {
      console.error("getFlashDeals error:", error);
      return { success: false, data: { products: [] } };
    }
  };

  return await networkFirstFetch("products:flash-deals", fetchFn, 5 * 60 * 1000);
};

/**
 * Search products
 */
export const searchProducts = async (
  query: string,
  filters?: Partial<ProductFilters>,
): Promise<ProductsResponse> => {
  try {
    const queryString = buildQueryString({ search: query, ...filters });
    const response = await fetch(`${API_BASE_URL}/products${queryString}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { success: false, data: { products: [] } };
    }

    const data = await safeResponseJson(response);
    if (!data.success) {
      return { success: false, data: { products: [] } };
    }
    return data;
  } catch (error) {
    console.error("searchProducts error:", error);
    return { success: false, data: { products: [] } };
  }
};
