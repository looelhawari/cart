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
import {
  createSafeApiError,
  normalizeApiErrorPayload,
} from "./api/errors";

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

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw createSafeApiError(
      "Please check your internet connection and try again.",
      0,
      "NETWORK_ERROR",
    );
  }

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

    throw createSafeApiError(
      "Your session has expired. Please log in again.",
      401,
      "TOKEN_EXPIRED",
    );
  }

  // Handle other HTTP errors
  if (!response.ok) {
    let errorData: unknown = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = {};
    }

    throw normalizeApiErrorPayload(errorData, response.status);
  }

  // Parse successful response
  const data = await response.json().catch(() => {
    throw createSafeApiError("Something went wrong. Please try again later.", response.status);
  });
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
