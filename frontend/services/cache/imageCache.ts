import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

/**
 * Image Cache Service
 * Downloads and caches images locally for offline access
 * Using legacy API for backward compatibility
 */

const CACHE_DIR = `${FileSystem.cacheDirectory}images/`;
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface CacheMetadata {
  url: string;
  localUri: string;
  timestamp: number;
  size: number;
}

const metadataCache = new Map<string, CacheMetadata>();

/**
 * Initialize cache directory
 */
export const initImageCache = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error("Failed to initialize image cache:", error);
  }
};

/**
 * Generate cache key from URL
 */
const getCacheKey = (url: string): string => {
  return url.replace(/[^a-zA-Z0-9]/g, "_");
};

/**
 * Get cached image URI or download if not cached
 */
export const getCachedImage = async (
  url: string | undefined
): Promise<string | undefined> => {
  if (!url) return undefined;

  // Return original URL for web platform
  if (Platform.OS === "web") {
    return url;
  }

  try {
    // Validate and fix URL
    let validUrl = url.trim();
    
    // Check if URL is malformed (missing 'h' in http/https)
    if (validUrl.startsWith('ttps://') || validUrl.startsWith('ttp://')) {
      console.warn(`⚠️ Fixing malformed URL: ${validUrl}`);
      validUrl = 'h' + validUrl;
      console.log(`✅ Fixed URL: ${validUrl}`);
    }
    
    // Validate URL scheme
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      console.error(`❌ Invalid URL scheme: ${validUrl}`);
      return url; // Return original as fallback
    }

    const cacheKey = getCacheKey(validUrl);
    const localUri = `${CACHE_DIR}${cacheKey}`;

    // Check if already in memory cache
    const metadata = metadataCache.get(validUrl);
    if (metadata) {
      const fileInfo = await FileSystem.getInfoAsync(metadata.localUri);
      if (fileInfo.exists) {
        // Check if cache is still valid
        const now = Date.now();
        if (now - metadata.timestamp < CACHE_EXPIRY) {
          return metadata.localUri;
        }
      }
    }

    // Check if file exists in cache directory
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      const stat = fileInfo as FileSystem.FileInfo & { size?: number };
      metadataCache.set(validUrl, {
        url: validUrl,
        localUri,
        timestamp: Date.now(),
        size: stat.size || 0,
      });
      return localUri;
    }

    // Download and cache the image
    await initImageCache();
    const downloadResult = await FileSystem.downloadAsync(validUrl, localUri);

    if (downloadResult.status === 200) {
      const downloadedFileInfo = await FileSystem.getInfoAsync(localUri);
      const stat = downloadedFileInfo as FileSystem.FileInfo & {
        size?: number;
      };

      metadataCache.set(validUrl, {
        url: validUrl,
        localUri,
        timestamp: Date.now(),
        size: stat.size || 0,
      });

      // Clean cache if size exceeds limit
      await cleanCacheIfNeeded();

      return localUri;
    }

    // Return original URL if download fails
    return url;
  } catch (error) {
    console.error("Image cache error:", error);
    // Return original URL as fallback
    return url;
  }
};

/**
 * Preload multiple images
 */
export const preloadImages = async (urls: string[]): Promise<void> => {
  const validUrls = urls.filter(Boolean);

  try {
    await Promise.all(
      validUrls.map((url) =>
        getCachedImage(url).catch((error) => {
          console.warn(`Failed to preload image ${url}:`, error);
          return null;
        })
      )
    );
  } catch (error) {
    console.error("Failed to preload images:", error);
  }
};

/**
 * Get total cache size
 */
const getCacheSize = async (): Promise<number> => {
  try {
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
      const stat = fileInfo as FileSystem.FileInfo & { size?: number };
      totalSize += stat.size || 0;
    }

    return totalSize;
  } catch (error) {
    console.error("Failed to calculate cache size:", error);
    return 0;
  }
};

/**
 * Clean cache if size exceeds limit
 */
const cleanCacheIfNeeded = async (): Promise<void> => {
  try {
    const totalSize = await getCacheSize();

    if (totalSize > MAX_CACHE_SIZE) {
      // Sort by timestamp (oldest first)
      const entries = Array.from(metadataCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );

      let freedSpace = 0;
      const targetSize = MAX_CACHE_SIZE * 0.8; // Free up to 80% of max size

      for (const [url, metadata] of entries) {
        if (totalSize - freedSpace <= targetSize) break;

        try {
          await FileSystem.deleteAsync(metadata.localUri, { idempotent: true });
          metadataCache.delete(url);
          freedSpace += metadata.size;
        } catch (error) {
          console.warn(`Failed to delete cached file ${metadata.localUri}`);
        }
      }
    }
  } catch (error) {
    console.error("Failed to clean cache:", error);
  }
};

/**
 * Clear entire image cache
 */
export const clearImageCache = async (): Promise<void> => {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    metadataCache.clear();
    await initImageCache();
  } catch (error) {
    console.error("Failed to clear image cache:", error);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<{
  size: number;
  count: number;
  maxSize: number;
}> => {
  const size = await getCacheSize();
  const count = metadataCache.size;

  return {
    size,
    count,
    maxSize: MAX_CACHE_SIZE,
  };
};
