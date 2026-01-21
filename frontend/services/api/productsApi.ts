import { API_BASE_URL, safeResponseJson } from "./base";
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
 * Get all products with optional filters
 */
export const getProducts = async (
  filters?: ProductFilters,
  useCache: boolean = true,
): Promise<ProductsResponse> => {
  const queryString = buildQueryString(filters);
  const cacheKey = `products:all${queryString}`;

  const fetchFn = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products${queryString}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
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

  if (useCache) {
    return await networkFirstFetch(cacheKey, fetchFn, 5 * 60 * 1000); // 5 minutes
  }

  return await fetchFn();
};

/**
 * Get single product by barcode
 */
export const getProduct = async (
  barcode: number | string,
  useCache: boolean = true,
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
        throw new Error(`Product not found: ${barcode}`);
      }

      const data = await safeResponseJson(response);
      if (!data.success) {
        throw new Error(`Failed to load product: ${barcode}`);
      }
      return data;
    } catch (error) {
      console.error(`getProduct(${barcode}) error:`, error);
      throw error;
    }
  };

  if (useCache) {
    return await cacheFirstFetch(`product:${barcode}`, fetchFn, {
      ttl: 15 * 60 * 1000, // 15 minutes
    });
  }

  return await fetchFn();
};

/**
 * Get featured products
 */
export const getFeaturedProducts = async (): Promise<ProductsResponse> => {
  try {
    console.log(
      "📡 Fetching featured products from:",
      `${API_BASE_URL}/products/featured`,
    );

    const response = await fetch(`${API_BASE_URL}/products/featured`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
    });

    console.log(
      "📡 Featured products response:",
      response.status,
      "OK:",
      response.ok,
    );

    if (!response.ok) {
      console.error(
        "Featured products API error:",
        response.status,
        response.statusText,
      );
      return { success: false, data: { products: [] } };
    }

    const data = await safeResponseJson(response);
    console.log(
      "📡 Featured products parsed:",
      data.success,
      "Count:",
      data.data?.products?.length || 0,
    );

    if (!data.success) {
      console.error("Featured products API returned success=false");
      return { success: false, data: { products: [] } };
    }
    return data;
  } catch (error) {
    console.error("getFeaturedProducts error:", error);
    return { success: false, data: { products: [] } };
  }
};

/**
 * Get flash deals (products on sale)
 */
export const getFlashDeals = async (): Promise<ProductsResponse> => {
  try {
    console.log(
      "📡 Fetching flash deals from:",
      `${API_BASE_URL}/products/flash-deals`,
    );

    const response = await fetch(`${API_BASE_URL}/products/flash-deals`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
    });

    console.log(
      "📡 Flash deals response:",
      response.status,
      "OK:",
      response.ok,
    );

    if (!response.ok) {
      console.error(
        "Flash deals API error:",
        response.status,
        response.statusText,
      );
      return { success: false, data: { products: [] } };
    }

    const data = await safeResponseJson(response);
    console.log(
      "📡 Flash deals parsed:",
      data.success,
      "Count:",
      data.data?.products?.length || 0,
    );

    if (!data.success) {
      console.error("Flash deals API returned success=false");
      return { success: false, data: { products: [] } };
    }
    return data;
  } catch (error) {
    console.error("getFlashDeals error:", error);
    return { success: false, data: { products: [] } };
  }
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
