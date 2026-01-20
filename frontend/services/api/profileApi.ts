import { apiRequest, API_BASE_URL, getAuthToken, safeJsonParse } from "./base";
import { UpdateProfileData, ChangePasswordData } from "./types";

// Profile Management API
export const profileApi = {
  // Get user profile
  async getProfile() {
    return apiRequest("/profile", { method: "GET" });
  },

  // Update user profile
  async updateProfile(data: UpdateProfileData) {
    return apiRequest("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Upload avatar
  async uploadAvatar(uri: string) {
    const token = await getAuthToken();
    const formData = new FormData();

    // Extract filename from URI
    const filename = uri.split("/").pop() || "avatar.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("avatar", {
      uri,
      name: filename,
      type,
    } as any);

    const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await safeJsonParse(response);
      throw error;
    }

    return await safeJsonParse(response);
  },

  // Delete avatar
  async deleteAvatar() {
    return apiRequest("/profile/avatar", { method: "DELETE" });
  },

  // Change password
  async changePassword(data: ChangePasswordData) {
    return apiRequest("/profile/change-password", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};
