import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, API_BASE_URL } from "./base";
import { Cart, CartItem } from "./types";

// Session ID management for guest carts
const SESSION_ID_KEY = "guest_session_id";

// Helper: Get or create session ID for guest users
const getSessionId = async (): Promise<string> => {
  let sessionId = await AsyncStorage.getItem(SESSION_ID_KEY);

  if (!sessionId) {
    // Generate UUID v4
    sessionId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
    await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
};

// Helper: Clear session ID
export const clearSessionId = async () => {
  await AsyncStorage.removeItem(SESSION_ID_KEY);
};

/**
 * Get cart (guest or authenticated)
 * GET /api/v1/cart
 */
export const getCart = async (): Promise<{
  success: boolean;
  data: { cart: Cart };
}> => {
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return await response.json();
};

/**
 * Add item to cart
 * POST /api/v1/cart/items
 */
export const addToCart = async (
  productId: number,
  quantity: number = 1
): Promise<{ success: boolean; message: string; data: any }> => {
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
    },
    body: JSON.stringify({
      product_id: productId,
      quantity,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return await response.json();
};

/**
 * Update cart item quantity
 * PUT /api/v1/cart/items/{id}
 */
export const updateCartItem = async (
  itemId: number,
  quantity: number
): Promise<{ success: boolean; message: string; data: { cart: Cart } }> => {
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
    },
    body: JSON.stringify({ quantity }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return await response.json();
};

/**
 * Remove item from cart
 * DELETE /api/v1/cart/items/{id}
 */
export const removeCartItem = async (
  itemId: number
): Promise<{ success: boolean; message: string }> => {
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return await response.json();
};

/**
 * Clear all items from cart
 * DELETE /api/v1/cart/clear
 */
export const clearCart = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/clear`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return await response.json();
};

/**
 * Apply promo code to cart
 * POST /api/v1/cart/apply-promo
 */
export const applyPromoCode = async (
  code: string
): Promise<{ success: boolean; message: string; data: any }> => {
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/apply-promo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return await response.json();
};

/**
 * Remove promo code from cart
 * DELETE /api/v1/cart/remove-promo
 */
export const removePromoCode = async (): Promise<{
  success: boolean;
  message: string;
  data: { cart: Cart };
}> => {
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/remove-promo`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return await response.json();
};

// Export all cart operations
export const cartApi = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyPromoCode,
  removePromoCode,
};
