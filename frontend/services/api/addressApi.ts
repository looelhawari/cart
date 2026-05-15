import { apiRequest } from "./base";
import { Address, AddressData } from "./types";

/**
 * Pull-to-refresh on the addresses screen passes forceRefresh=true so the
 * cached list is overwritten with fresh data. Mutations declare
 * invalidatePrefixes: ["addresses"] so apiRequest auto-wipes the cache
 * after a successful create/update/delete/set-default.
 */
interface AddressFetchOptions {
  forceRefresh?: boolean;
}

const ADDRESSES_LIST_TTL = 24 * 60 * 60 * 1000; // 24h — addresses rarely change
const ADDRESSES_INVALIDATE = ["addresses"];

// Address Management API
export const addressApi = {
  // Get all addresses (cache-first, persists across app restarts)
  async getAddresses(options: AddressFetchOptions = {}) {
    return apiRequest<{ success: boolean; data: Address[] }>("/addresses", {
      method: "GET",
      cacheKey: "addresses:list",
      cacheTtlMs: ADDRESSES_LIST_TTL,
      forceRefresh: options.forceRefresh,
    });
  },

  // Get single address (cache-first)
  async getAddress(id: number, options: AddressFetchOptions = {}) {
    return apiRequest<{ success: boolean; data: Address }>(`/addresses/${id}`, {
      method: "GET",
      cacheKey: `addresses:detail:${id}`,
      cacheTtlMs: ADDRESSES_LIST_TTL,
      forceRefresh: options.forceRefresh,
    });
  },

  // Create new address — invalidates address cache so next list refetches
  async createAddress(data: AddressData) {
    return apiRequest<{ success: boolean; data: Address }>("/addresses", {
      method: "POST",
      body: JSON.stringify(data),
      invalidatePrefixes: ADDRESSES_INVALIDATE,
    });
  },

  // Update address — invalidates address cache
  async updateAddress(id: number, data: Partial<AddressData>) {
    return apiRequest<{ success: boolean; data: Address }>(`/addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      invalidatePrefixes: ADDRESSES_INVALIDATE,
    });
  },

  // Delete address — invalidates address cache
  async deleteAddress(id: number) {
    return apiRequest<{ success: boolean; message: string }>(
      `/addresses/${id}`,
      {
        method: "DELETE",
        invalidatePrefixes: ADDRESSES_INVALIDATE,
      },
    );
  },

  // Set address as default — invalidates so other items lose is_default flag
  async setDefaultAddress(id: number) {
    return apiRequest<{ success: boolean; data: Address }>(
      `/addresses/${id}/default`,
      {
        method: "POST",
        invalidatePrefixes: ADDRESSES_INVALIDATE,
      },
    );
  },
};
