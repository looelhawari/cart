/**
 * Centralized HTTP Client (Phase 5.5 - Stage 1)
 *
 * Single source of truth for all API requests with:
 * - Automatic auth token injection
 * - Consistent error handling
 * - 401 detection for logout flow
 *
 * Usage:
 *   import httpClient from '@/services/httpClient';
 *   const response = await httpClient.get('/api/v1/endpoint');
 */

import {
  getAuthToken,
  clearAuthData,
  API_BASE_URL,
  getCommonHeaders,
} from "./api/base";

/**
 * Enhanced fetch wrapper with auth and error handling
 */
async function httpRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    ...getCommonHeaders(),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - session expired
  if (response.status === 401) {
    // Before clearing auth, check if the token has changed since we sent
    // this request. A concurrent socialLogin may have revoked the old token
    // (causing this 401) and issued a new one. If so, do NOT wipe it.
    const currentToken = await getAuthToken();
    if (!currentToken || currentToken === token) {
      // Token hasn't changed — genuinely expired, safe to clear
      await clearAuthData();
    }

    throw new Error("Session expired. Please login again.");
  }

  // Handle other HTTP errors
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // If parsing fails, use default message
    }

    throw new Error(errorMessage);
  }

  // Parse successful response
  const data = await response.json();
  return data as T;
}

/**
 * HTTP Client with common methods
 */
const httpClient = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    return httpRequest<T>(endpoint, { ...options, method: "GET" });
  },

  /**
   * POST request
   */
  post: <T>(
    endpoint: string,
    body?: any,
    options?: RequestInit,
  ): Promise<T> => {
    return httpRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PUT request
   */
  put: <T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> => {
    return httpRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PATCH request
   */
  patch: <T>(
    endpoint: string,
    body?: any,
    options?: RequestInit,
  ): Promise<T> => {
    return httpRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    return httpRequest<T>(endpoint, { ...options, method: "DELETE" });
  },
};

export default httpClient;
