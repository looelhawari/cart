import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Review } from "@/types";
import { getProductReviews as apiGetProductReviews } from "@/services/api/reviewsApi";

const CACHE_PREFIX = "reviews_";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface CachedReviewsData {
  reviews: Review[];
  timestamp: number;
}

/**
 * Get reviews for a product with caching support
 * - First tries to load from cache if online and cache is fresh
 * - Falls back to API if cache is stale or doesn't exist
 * - Returns cached data if offline and cache exists
 */
export const getProductReviewsCached = async (
  productId: string | number,
  isOnline: boolean = true,
): Promise<Review[]> => {
  const cacheKey = `${CACHE_PREFIX}${productId}`;

  try {
    // Try to get from cache
    const cachedData = await AsyncStorage.getItem(cacheKey);

    if (cachedData) {
      const parsed: CachedReviewsData = JSON.parse(cachedData);
      const isFresh = Date.now() - parsed.timestamp < CACHE_EXPIRY_MS;

      // If offline, always return cached data
      if (!isOnline) {
        console.log("[ReviewsCache] Offline mode - returning cached reviews");
        return parsed.reviews;
      }

      // If online and cache is fresh, return cached data
      if (isFresh) {
        console.log("[ReviewsCache] Fresh cache found - returning");
        return parsed.reviews;
      }
    }

    // If online and cache is stale or doesn't exist, fetch from API
    if (isOnline) {
      console.log("[ReviewsCache] Fetching fresh reviews from API");
      const response = await apiGetProductReviews(productId);
      const reviews = response.data || [];

      // Cache the new data
      const cacheData: CachedReviewsData = {
        reviews,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

      return reviews;
    }

    // If offline and no cache exists, return empty array
    console.log("[ReviewsCache] Offline with no cache - returning empty array");
    return [];
  } catch (error) {
    console.error("[ReviewsCache] Error:", error);

    // On error, try to return cached data if it exists
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed: CachedReviewsData = JSON.parse(cachedData);
        console.log("[ReviewsCache] Error occurred - returning stale cache");
        return parsed.reviews;
      }
    } catch (cacheError) {
      console.error("[ReviewsCache] Cache read error:", cacheError);
    }

    return [];
  }
};

/**
 * Clear reviews cache for a specific product
 */
export const clearProductReviewsCache = async (
  productId: string | number,
): Promise<void> => {
  const cacheKey = `${CACHE_PREFIX}${productId}`;
  try {
    await AsyncStorage.removeItem(cacheKey);
    console.log("[ReviewsCache] Cache cleared for product:", productId);
  } catch (error) {
    console.error("[ReviewsCache] Failed to clear cache:", error);
  }
};

/**
 * Clear all reviews caches
 */
export const clearAllReviewsCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const reviewKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(reviewKeys);
    console.log("[ReviewsCache] All reviews cache cleared");
  } catch (error) {
    console.error("[ReviewsCache] Failed to clear all cache:", error);
  }
};
