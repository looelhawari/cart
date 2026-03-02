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
  RegisterVerifyData,
  ForgotPasswordData,
  ResetPasswordData,
  User as ApiUser,
} from "@/services/api";
import { TOKEN_CONFIG } from "@/config/app.config";
import * as favoritesApi from "@/services/api/favoritesApi";
import { profileApi } from "@/services/api/profileApi";
import {
  getCart as getCartApi,
  addToCart as addToCartApi,
  removeCartItem,
  updateCartItem,
  clearCart as clearCartApi,
  applyPromoCode,
  removePromoCode,
  getSessionId,
} from "@/services/api/cartApi";

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
  role: "customer" | "admin" | "driver";
  is_verified: boolean;
  is_social_only: boolean;
  has_google: boolean;
  has_apple: boolean;
  email_verified_at: string | null;
  registration_source: string | null;
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
  deleteAccount: (password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{
    requiresVerification: boolean;
    email: string;
    emailSent: boolean;
  }>;
  registerVerify: (data: RegisterVerifyData) => Promise<void>;
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
  ) => Promise<void>;

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
  favoritesLoading: boolean;
  toggleFavorite: (productId: number | string) => Promise<void>;
  fetchFavorites: () => Promise<void>;

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

  // Search
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
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
          favoritesLoading: false,
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

      deleteAccount: async (password: string) => {
        await profileApi.deleteAccount(password);
        // Clear all local state after successful deletion
        set({
          isAuthenticated: false,
          user: null,
          pendingUser: null,
          cart: [],
          favorites: [],
          selectedAddress: null,
          selectedPaymentMethod: null,
          promoCode: null,
        });
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
          emailSent: response.data.email_sent ?? true,
        };
      },

      registerVerify: async (data: RegisterVerifyData) => {
        const response = await authApi.registerVerify(data);

        set({
          isAuthenticated: true,
          user: response.data.user,
          pendingUser: null,
        });
      },

      verifyEmail: async (data: VerifyEmailData) => {
        const response = await authApi.verifyEmail(data);

        // CRITICAL: Set isAuthenticated to true and persist it
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
        // Read token outside try/catch so it's accessible in the catch block
        const token = await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);

        try {
          if (!token) {
            // No token, definitely not authenticated
            set({
              isAuthenticated: false,
              user: null,
            });
            return;
          }

          // Try to fetch profile - this will auto-refresh token if expired
          const response = await authApi.getProfile();
          set({
            isAuthenticated: true,
            user: response.data,
          });
        } catch (error: any) {
          // Only clear auth if it's a definitive token expired error.
          // IMPORTANT: Do NOT clear on generic 401s — a concurrent
          // socialLogin may have revoked the old token and issued a new one.
          // Clearing here would wipe the NEW valid tokens.
          if (error?.error_code === "TOKEN_EXPIRED") {
            // Double-check: re-read the token from AsyncStorage.
            // If a socialLogin ran concurrently, a fresh token may now exist.
            const freshToken = await AsyncStorage.getItem(
              TOKEN_CONFIG.ACCESS_TOKEN_KEY,
            );
            if (!freshToken || freshToken === token) {
              // Token hasn't changed — it's genuinely expired
              set({
                isAuthenticated: false,
                user: null,
              });
            }
            // else: a new token was written by socialLogin — keep auth state
          }
          // For other errors (network, etc), keep existing auth state
          // This prevents logging out users due to temporary network issues
        }
      },

      // Social Login
      socialLogin: async (
        provider: "google" | "apple",
        token: string,
        userData?: any,
      ) => {
        // Google sends id_token (JWT), Apple sends identity token
        const apiCall =
          provider === "google"
            ? authApi.socialGoogle({ id_token: token })
            : authApi.socialApple({ token, user: userData });

        const response = await apiCall;

        // Tokens are already saved by authApi.socialGoogle/socialApple
        // Set user from response immediately
        set({
          isAuthenticated: true,
          user: response.data.user,
          pendingUser: null,
        });

        // Double-check: verify tokens were saved and fetch profile
        // This ensures the auth flow is complete before navigation
        const savedToken = await AsyncStorage.getItem(
          TOKEN_CONFIG.ACCESS_TOKEN_KEY,
        );
        if (__DEV__) {
          console.log("[socialLogin] Token saved:", savedToken ? "YES" : "NO");
          console.log("[socialLogin] User set:", response.data.user?.email);
        }

        // Fetch fresh profile to ensure everything is in sync
        try {
          const profileResponse = await authApi.getProfile();
          set({
            user: profileResponse.data,
          });
        } catch (error) {
          // If profile fetch fails but we have tokens, keep the user from login response
          if (__DEV__) {
            console.log(
              "[socialLogin] Profile fetch failed (using login response user):",
              error,
            );
          }
        }
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
          const response = await getCartApi();
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
        set({ cartError: null });

        // Optimistic update: immediately add to local cart for instant UI feedback
        const currentCart = get().cart;
        let optimisticCart = currentCart ? { ...currentCart } : null;

        if (optimisticCart) {
          const existingItem = optimisticCart.items?.find(
            (item: any) => item.product_id === productId,
          );

          if (existingItem) {
            // Update existing item quantity
            optimisticCart.items = optimisticCart.items?.map((item: any) =>
              item.product_id === productId
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            );
          }

          set({ cart: optimisticCart });
        }

        try {
          const response = await addToCartApi(productId, quantity);
          set({ cart: response.data.cart });
        } catch (error: any) {
          // Revert optimistic update on error
          set({ cart: currentCart });
          const message =
            error?.message ||
            error?.error ||
            (typeof error === "string" ? error : "Failed to add item to cart");
          set({
            cartError: message,
          });
          throw new Error(message);
        }
      },

      removeFromCart: async (itemId: number) => {
        set({ cartError: null });
        try {
          const response = await removeCartItem(itemId);
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

        // Optimistic update: immediately update local cart for instant UI feedback
        const currentCart = get().cart;
        let optimisticCart = currentCart ? { ...currentCart } : null;

        if (optimisticCart && optimisticCart.items) {
          optimisticCart.items = optimisticCart.items.map((item: any) =>
            item.id === itemId ? { ...item, quantity } : item,
          );
          set({ cart: optimisticCart });
        }

        try {
          const response = await updateCartItem(itemId, quantity);
          set({ cart: response.data.cart });
        } catch (error: any) {
          // Revert optimistic update on error
          set({ cart: currentCart });
          const message =
            error?.message ||
            error?.error ||
            (typeof error === "string" ? error : "Failed to update quantity");
          set({
            cartError: message,
          });
          throw new Error(message);
        }
      },

      clearCart: async () => {
        set({ cartError: null });
        try {
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
      favoritesLoading: false,

      fetchFavorites: async () => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) return;

        try {
          set({ favoritesLoading: true });
          const response = await favoritesApi.listFavorites();
          // Response structure: { data: { favorites: [...] } }
          const favoritesData = response.data?.favorites || [];
          const favoriteIds = favoritesData.map((fav: any) =>
            String(fav.product?.barcode || fav.product?.id || fav.product_id),
          );
          set({ favorites: favoriteIds, favoritesLoading: false });
        } catch (error) {
          console.error("Failed to fetch favorites:", error);
          set({ favoritesLoading: false });
        }
      },

      toggleFavorite: async (productId) => {
        const { isAuthenticated, favorites } = get();
        const productIdStr = String(productId);
        const isFavorite = favorites.includes(productIdStr);

        // Optimistic update
        if (isFavorite) {
          set({ favorites: favorites.filter((id) => id !== productIdStr) });
        } else {
          set({ favorites: [...favorites, productIdStr] });
        }

        // Only sync with backend if authenticated
        if (isAuthenticated) {
          try {
            if (isFavorite) {
              await favoritesApi.removeFavorite(Number(productId));
            } else {
              await favoritesApi.addFavorite(Number(productId));
            }
          } catch (error) {
            console.error("Failed to sync favorite:", error);
            // Revert optimistic update on error
            if (isFavorite) {
              set({ favorites: [...get().favorites, productIdStr] });
            } else {
              set({
                favorites: get().favorites.filter((id) => id !== productIdStr),
              });
            }
          }
        }
      },

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

      // Search — persisted across sessions, max 20 items
      recentSearches: [],
      addRecentSearch: (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        set((state) => {
          const filtered = state.recentSearches.filter(
            (s) => s.toLowerCase() !== trimmed.toLowerCase(),
          );
          return { recentSearches: [trimmed, ...filtered].slice(0, 20) };
        });
      },
      removeRecentSearch: (query: string) =>
        set((state) => ({
          recentSearches: state.recentSearches.filter((s) => s !== query),
        })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: "elbaraka-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isAuthenticated: state.isAuthenticated, // PERSIST authentication status
        // DO NOT persist user object - fetch from server on app start
        // user: state.user,  // REMOVED for security
        // DO NOT persist cart - always fetch from server
        // cart: state.cart,  // REMOVED - cart should be fetched from API
        favorites: state.favorites,
        addresses: state.addresses,
        paymentMethods: state.paymentMethods,
        orders: state.orders,
        recentSearches: state.recentSearches, // Persist recent searches
      }),
      version: 3, // Increment version to trigger migration
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
        // Version 3: Ensure isAuthenticated is properly migrated
        if (version < 3) {
          return {
            ...persistedState,
            // Keep existing isAuthenticated value if present
            isAuthenticated: persistedState.isAuthenticated ?? false,
          };
        }
        return persistedState;
      },
    },
  ),
);
