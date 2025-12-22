/**
 * Cache Services Export
 * Central export for all caching utilities
 */

// Image Caching
export {
  getCachedImage,
  preloadImages,
  clearImageCache,
  getCacheStats as getImageCacheStats,
  initImageCache,
} from "./imageCache";

// API Response Caching
export {
  setCacheData,
  getCacheData,
  removeCacheData,
  clearAllCache,
  getCacheStats as getApiCacheStats,
  cacheFirstFetch,
  networkFirstFetch,
} from "./apiCache";

// Network Detection
export {
  checkNetworkState,
  isOnline,
  isOffline,
  useNetworkState,
  useIsOnline,
  getNetworkTypeDescription,
} from "./networkDetector";

export type { NetworkState } from "./networkDetector";
