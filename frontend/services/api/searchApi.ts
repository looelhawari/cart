import { API_BASE_URL, safeResponseJson, getCommonHeaders } from "./base";

// === Types ===

export interface SearchSuggestionProduct {
  barcode: string;
  name_en: string;
  name_ar: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  unit: string;
}

export interface SearchSuggestionCategory {
  id: number;
  name_en: string;
  name_ar: string;
  image: string | null;
  product_count: number;
}

export interface SearchSuggestionOffer {
  id: number;
  title_en: string;
  title_ar: string;
  discount_type: string;
  discount_value: number;
  image: string | null;
}

export interface SearchSuggestionsResponse {
  success: boolean;
  data: {
    products: SearchSuggestionProduct[];
    categories: SearchSuggestionCategory[];
    offers: SearchSuggestionOffer[];
  };
}

export interface PopularSearchData {
  top_categories: {
    id: number;
    name_en: string;
    name_ar: string;
    image: string | null;
    product_count: number;
  }[];
  trending_searches: {
    term_en: string;
    term_ar: string;
  }[];
  active_offers_count: number;
}

export interface PopularSearchResponse {
  success: boolean;
  data: PopularSearchData;
}

// === API Functions ===

/**
 * Get typeahead search suggestions (products, categories, offers)
 * Returns lightweight data for autocomplete dropdown
 */
export const getSearchSuggestions = async (
  query: string,
): Promise<SearchSuggestionsResponse> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/search/suggestions?q=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: getCommonHeaders(),
      },
    );
    return await safeResponseJson(response);
  } catch (error) {
    console.error("Search suggestions error:", error);
    return {
      success: false,
      data: { products: [], categories: [], offers: [] },
    };
  }
};

/**
 * Get popular/trending searches — cached for 30 min on backend
 */
export const getPopularSearches = async (): Promise<PopularSearchResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/search/popular`, {
      method: "GET",
      headers: getCommonHeaders(),
    });
    return await safeResponseJson(response);
  } catch (error) {
    console.error("Popular searches error:", error);
    return {
      success: false,
      data: {
        top_categories: [],
        trending_searches: [],
        active_offers_count: 0,
      },
    };
  }
};
