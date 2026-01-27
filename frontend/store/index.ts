import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CartItem, Product, Address, Order, Review } from "@/types";
import { paymentMethods, PaymentMethod } from "@/data/user";
import {
  authApi,
  RegisterData,
  LoginData,
  VerifyEmailData,
  ForgotPasswordData,
  ResetPasswordData,
  User as ApiUser,
} from "@/services/api";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  avatar: string | null;
  language: "en" | "ar";
  role: "customer" | "admin";
  is_verified: boolean;
}

interface StoreState {
  // App State
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  resetApp: () => void;

  // Auth
  isAuthenticated: boolean;
  user: User | null;
  pendingUser: { phone: string; email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    data: RegisterData,
  ) => Promise<{ requiresVerification: boolean; email: string }>;
  verifyEmail: (data: VerifyEmailData) => Promise<void>;
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  fetchProfile: () => Promise<void>;
  checkAuthStatus: () => Promise<void>; // Check if user has valid token

  // Social Login
  socialLogin: (
    provider: "google" | "apple",
    token: string,
    userData?: any,
  ) => Promise<{ requiresPhoneVerification: boolean }>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, otp: string) => Promise<void>;

  // Cart (integrated with backend)
  cart: any | null;
  cartLoading: boolean;
  cartError: string | null;
  setCart: (cart: any) => void;
  fetchCart: () => Promise<void>;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyPromoCodeToCart: (code: string) => Promise<void>;
  removePromoCodeFromCart: () => Promise<void>;

  // Favorites
  favorites: string[];
  toggleFavorite: (productId: string) => void;

  // Addresses
  addresses: Address[];
  addAddress: (address: Address) => void;
  removeAddress: (addressId: string) => void;
  updateAddress: (addressId: string, address: Partial<Address>) => void;
  setDefaultAddress: (addressId: string) => void;

  // Payment Methods
  paymentMethods: PaymentMethod[];
  addPaymentMethod: (method: PaymentMethod) => void;
  removePaymentMethod: (methodId: string) => void;
  setDefaultPaymentMethod: (methodId: string) => void;

  // Orders
  orders: Order[];
  addOrder: (order: Order) => void;
  cancelOrder: (orderId: string) => void;

  // Checkout
  selectedAddress: string | null;
  selectedPaymentMethod: string | null;
  promoCode: string | null;
  setSelectedAddress: (addressId: string | null) => void;
  setSelectedPaymentMethod: (methodId: string | null) => void;
  applyPromoCode: (code: string) => void;
  removePromoCode: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // App State
      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (value: boolean) =>
        set({ hasCompletedOnboarding: value }),

      // Reset all persisted data (for development/testing)
      resetApp: () => {
        set({
          hasCompletedOnboarding: false,
          isAuthenticated: false,
          user: null,
          pendingUser: null,
          cart: null,
          cartLoading: false,
          cartError: null,
          favorites: [],
          selectedAddress: null,
          selectedPaymentMethod: null,
          promoCode: null,
        });
      },

      // Auth
      isAuthenticated: false,
      user: null,
      pendingUser: null,

      login: async (email: string, password: string) => {
        try {
          const response = await authApi.login({ email, password });

          set({
            isAuthenticated: true,
            user: response.data.user,
            pendingUser: null,
          });
        } catch (error: any) {
          // If user needs verification, store pending user data
          if (error.requires_verification) {
            set({
              pendingUser: { phone: error.phone || "", email },
            });
          }
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          set({
            isAuthenticated: false,
            user: null,
            pendingUser: null,
            cart: [],
            selectedAddress: null,
            selectedPaymentMethod: null,
            promoCode: null,
          });
        }
      },

      register: async (data: RegisterData) => {
        const response = await authApi.register(data);

        // Store pending user data for verification step
        set({
          pendingUser: {
            phone: response.data.user.phone,
            email: response.data.user.email,
          },
        });

        return {
          requiresVerification: true,
          email: response.data.user.email,
        };
      },

      verifyEmail: async (data: VerifyEmailData) => {
        const response = await authApi.verifyEmail(data);

        set({
          isAuthenticated: true,
          user: response.data.user,
          pendingUser: null,
        });
      },

      forgotPassword: async (data: ForgotPasswordData) => {
        await authApi.forgotPassword(data);
      },

      resetPassword: async (data: ResetPasswordData) => {
        await authApi.resetPassword(data);
      },

      updateProfile: async (data: Partial<User>) => {
        const response = await authApi.updateProfile(data);
        set((state) => ({
          user: state.user ? { ...state.user, ...response.data.user } : null,
        }));
      },

      fetchProfile: async () => {
        const response = await authApi.getProfile();
        set({
          user: response.data,
        });
      },

      // Check authentication status on app startup
      checkAuthStatus: async () => {
        try {
          const response = await authApi.getProfile();
          set({
            isAuthenticated: true,
            user: response.data,
          });
        } catch (error) {
          // Token is invalid or expired
          set({
            isAuthenticated: false,
            user: null,
          });
        }
      },

      // Social Login
      socialLogin: async (
        provider: "google" | "apple",
        token: string,
        userData?: any,
      ) => {
        const apiCall =
          provider === "google"
            ? authApi.socialGoogle({ token })
            : authApi.socialApple({ token, user: userData });

        const response = await apiCall;

        set({
          isAuthenticated: true,
          user: response.data.user,
          pendingUser: null,
        });

        return {
          requiresPhoneVerification:
            response.data.requires_phone_verification || false,
        };
      },

      sendPhoneOtp: async (phone: string) => {
        await authApi.sendPhoneOtp({ phone });
      },

      verifyPhoneOtp: async (phone: string, otp: string) => {
        const response = await authApi.verifyPhoneOtp({ phone, otp });

        // Update user with verified phone
        set((state) => ({
          user: state.user
            ? { ...state.user, ...response.data.user }
            : response.data.user,
        }));
      },

      // Cart (integrated with backend API)
      cart: null,
      cartLoading: false,
      cartError: null,

      setCart: (cart: any) => {
        set({ cart, cartLoading: false, cartError: null });
      },

      fetchCart: async () => {
        set({ cartLoading: true, cartError: null });
        try {
          const { getCart, getSessionId } = await import("@/services/api/cartApi");
          const sessionId = await getSessionId();
          console.log("🛒 [STORE] Fetching cart with session ID:", sessionId);
          const response = await getCart();
          console.log(
            "🛒 [STORE] Cart fetched successfully:",
            {
              items_count: response.data.cart?.items?.length || 0,
              subtotal: response.data.cart?.subtotal || 0,
              session_id: sessionId
            }
          );
          set({ cart: response.data.cart, cartLoading: false });
        } catch (error: any) {
          set({
            cartError: error.message || "Failed to load cart",
            cartLoading: false,
          });
          throw error;
        }
      },

      addToCart: async (productId: number, quantity: number = 1) => {
        // Don't block UI with loading state for better responsiveness
        set({ cartError: null });
        try {
          const { addToCart: addToCartApi } =
            await import("@/services/api/cartApi");
          const response = await addToCartApi(productId, quantity);
          set({ cart: response.data.cart });
        } catch (error: any) {
          set({
            cartError: error.message || "Failed to add item to cart",
          });
          throw error;
        }
      },

      removeFromCart: async (itemId: number) => {
        set({ cartError: null });
        try {
          const { removeCartItem } = await import("@/services/api/cartApi");
          const response = await removeCartItem(itemId);
          // Update cart directly from response - no need for double fetch
          set({ cart: response.data.cart });
        } catch (error: any) {
          set({
            cartError: error.message || "Failed to remove item",
          });
          throw error;
        }
      },

      updateQuantity: async (itemId: number, quantity: number) => {
        set({ cartError: null });
        try {
          const { updateCartItem } = await import("@/services/api/cartApi");
          const response = await updateCartItem(itemId, quantity);
          set({ cart: response.data.cart });
        } catch (error: any) {
          set({
            cartError: error.message || "Failed to update quantity",
          });
          throw error;
        }
      },

      clearCart: async () => {
        set({ cartError: null });
        try {
          const { clearCart: clearCartApi } =
            await import("@/services/api/cartApi");
          await clearCartApi();
          set({ cart: null });
        } catch (error: any) {
          set({
            cartError: error.message || "Failed to clear cart",
          });
          throw error;
        }
      },

      applyPromoCodeToCart: async (code: string) => {
        set({ cartError: null });
        try {
          const { applyPromoCode } = await import("@/services/api/cartApi");
          const response = await applyPromoCode(code);
          set({ cart: response.data.cart });
        } catch (error: any) {
          set({
            cartError: error.message || "Failed to apply promo code",
          });
          throw error;
        }
      },

      removePromoCodeFromCart: async () => {
        set({ cartError: null });
        try {
          const { removePromoCode } = await import("@/services/api/cartApi");
          const response = await removePromoCode();
          set({ cart: response.data.cart });
        } catch (error: any) {
          set({
            cartError: error.message || "Failed to remove promo code",
          });
          throw error;
        }
      },

      // Favorites
      favorites: [],

      toggleFavorite: (productId) =>
        set((state) => {
          if (state.favorites.includes(productId)) {
            return {
              favorites: state.favorites.filter((id) => id !== productId),
            };
          }
          return {
            favorites: [...state.favorites, productId],
          };
        }),

      // Addresses
      addresses: [
        {
          id: "1",
          label: "Home",
          street: "123 Main Street",
          apartment: "Apt 4B",
          city: "Cairo",
          state: "Cairo Governorate",
          postalCode: "11511",
          phone: "+20 123 456 7890",
          isDefault: true,
        },
        {
          id: "2",
          label: "Work",
          street: "456 Oak Avenue",
          apartment: "Suite 12",
          city: "Cairo",
          state: "Cairo Governorate",
          postalCode: "11512",
          phone: "+20 123 456 7890",
          isDefault: false,
        },
      ],

      addAddress: (address) =>
        set((state) => ({
          addresses: [...state.addresses, address],
        })),

      removeAddress: (addressId) =>
        set((state) => ({
          addresses: state.addresses.filter((addr) => addr.id !== addressId),
        })),

      updateAddress: (addressId, updates) =>
        set((state) => ({
          addresses: state.addresses.map((addr) =>
            addr.id === addressId ? { ...addr, ...updates } : addr,
          ),
        })),

      setDefaultAddress: (addressId) =>
        set((state) => ({
          addresses: state.addresses.map((addr) => ({
            ...addr,
            isDefault: addr.id === addressId,
          })),
        })),

      // Payment Methods
      paymentMethods: paymentMethods,

      addPaymentMethod: (method) =>
        set((state) => ({
          paymentMethods: [...state.paymentMethods, method],
        })),

      removePaymentMethod: (methodId) =>
        set((state) => ({
          paymentMethods: state.paymentMethods.filter((m) => m.id !== methodId),
        })),

      setDefaultPaymentMethod: (methodId) =>
        set((state) => ({
          paymentMethods: state.paymentMethods.map((m) => ({
            ...m,
            isDefault: m.id === methodId,
          })),
        })),

      // Orders
      orders: [],

      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
        })),

      cancelOrder: (orderId) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, status: "cancelled" as const }
              : order,
          ),
        })),

      // Checkout
      selectedAddress: null,
      selectedPaymentMethod: null,
      promoCode: null,

      setSelectedAddress: (addressId) => set({ selectedAddress: addressId }),
      setSelectedPaymentMethod: (methodId) =>
        set({ selectedPaymentMethod: methodId }),
      applyPromoCode: (code) => set({ promoCode: code }),
      removePromoCode: () => set({ promoCode: null }),
    }),
    {
      name: "elbaraka-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isAuthenticated: state.isAuthenticated,
        // DO NOT persist user object - fetch from server on app start
        // user: state.user,  // REMOVED for security
        // DO NOT persist cart - always fetch from server
        // cart: state.cart,  // REMOVED - cart should be fetched from API
        favorites: state.favorites,
        addresses: state.addresses,
        paymentMethods: state.paymentMethods,
        orders: state.orders,
      }),
      version: 2, // Increment version to trigger migration
      migrate: (persistedState: any, version: number) => {
        // Migration to handle old cart structure
        if (version < 2) {
          return {
            ...persistedState,
            cart: null, // Reset cart to null for API-based cart
            cartLoading: false,
            cartError: null,
          };
        }
        return persistedState;
      },
    },
  ),
);
