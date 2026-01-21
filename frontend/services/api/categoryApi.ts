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
 * Get categories with featured products for home page
 */
export const getFeaturedCategoriesWithProducts =
  async (): Promise<FeaturedCategoriesResponse> => {
    try {
      console.log(
        "📡 Fetching featured categories from:",
        `${API_BASE_URL}/categories/featured-with-products`,
      );

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

      console.log("📡 Featured categories response status:", response.status);

      if (!response.ok) {
        console.error("Featured categories API error:", response.status);
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

/**
 * Get all categories
 */
export const getCategories = async (
  useCache: boolean = true,
): Promise<CategoriesResponse> => {
  const fetchFn = async () => {
    try {
      console.log("📡 Fetching categories from:", `${API_BASE_URL}/categories`);

      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json; charset=utf-8",
        },
      });

      console.log(
        "📡 Categories response status:",
        response.status,
        "OK:",
        response.ok,
      );

      if (!response.ok) {
        console.error(
          "Categories API error:",
          response.status,
          response.statusText,
        );
        return { success: false, data: { categories: [] } };
      }

      const data = await safeResponseJson(response);
      console.log(
        "📡 Categories data parsed:",
        data.success,
        "Count:",
        data.data?.categories?.length || 0,
      );

      if (!data.success) {
        console.error("Categories API returned success=false");
        return { success: false, data: { categories: [] } };
      }
      return data;
    } catch (error) {
      console.error("getCategories error:", error);
      return { success: false, data: { categories: [] } };
    }
  };

  if (useCache) {
    return await cacheFirstFetch("categories:all", fetchFn, {
      ttl: 10 * 60 * 1000, // 10 minutes
      forceRefresh: false, // Allow cache but it will be fresh from server if expired
    });
  }

  return await fetchFn();
};

/**
 * Get single category
 */
export const getCategory = async (
  categoryId: number,
  useCache: boolean = true,
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
        throw new Error(`Category not found: ${categoryId}`);
      }

      const data = await safeResponseJson(response);
      if (!data.success) {
        throw new Error(`Failed to load category: ${categoryId}`);
      }
      return data;
    } catch (error) {
      console.error(`getCategory(${categoryId}) error:`, error);
      throw error;
    }
  };

  if (useCache) {
    return await cacheFirstFetch(`category:${categoryId}`, fetchFn, {
      ttl: 10 * 60 * 1000, // 10 minutes
    });
  }

  return await fetchFn();
};

/**
 * Get category with its products
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
  useCache: boolean = true,
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
        throw new Error(`API Error: ${response.status}`);
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

  if (useCache) {
    return await networkFirstFetch(cacheKey, fetchFn, 5 * 60 * 1000); // 5 minutes
  }

  return await fetchFn();
};
