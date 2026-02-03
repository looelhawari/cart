// Main API exports - organized by feature
export * from "./types";
export * from "./base";
export { authApi } from "./authApi";
export { profileApi } from "./profileApi";
export { addressApi } from "./addressApi";
export { cartApi } from "./cartApi";
export * as offersApi from "./offersApi";
export * as favoritesApi from "./favoritesApi";
export * as complaintsApi from "./complaintsApi";
export * as storeApi from "./storeApi";
export * as reviewsApi from "./reviewsApi";

// Default export for backward compatibility
import { authApi } from "./authApi";
export default authApi;
