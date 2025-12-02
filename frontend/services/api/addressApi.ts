import { apiRequest } from "./base";
import { Address, AddressData } from "./types";

// Address Management API
export const addressApi = {
  // Get all addresses
  async getAddresses() {
    return apiRequest<{ success: boolean; data: Address[] }>("/addresses", {
      method: "GET",
    });
  },

  // Get single address
  async getAddress(id: number) {
    return apiRequest<{ success: boolean; data: Address }>(`/addresses/${id}`, {
      method: "GET",
    });
  },

  // Create new address
  async createAddress(data: AddressData) {
    return apiRequest<{ success: boolean; data: Address }>("/addresses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update address
  async updateAddress(id: number, data: Partial<AddressData>) {
    return apiRequest<{ success: boolean; data: Address }>(`/addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete address
  async deleteAddress(id: number) {
    return apiRequest<{ success: boolean; message: string }>(
      `/addresses/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  // Set address as default
  async setDefaultAddress(id: number) {
    return apiRequest<{ success: boolean; data: Address }>(
      `/addresses/${id}/default`,
      {
        method: "POST",
      }
    );
  },
};
