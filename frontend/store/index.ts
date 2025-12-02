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
    data: RegisterData
  ) => Promise<{ requiresVerification: boolean; email: string }>;
  verifyEmail: (data: VerifyEmailData) => Promise<void>;
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  fetchProfile: () => Promise<void>;

  // Social Login
  socialLogin: (
    provider: "google" | "apple",
    token: string,
    userData?: any
  ) => Promise<{ requiresPhoneVerification: boolean }>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, otp: string) => Promise<void>;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

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
          cart: [],
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

      updateProfile: (data: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));
      },

      fetchProfile: async () => {
        const response = await authApi.getProfile();
        set({
          user: response.data,
        });
      },

      // Social Login
      socialLogin: async (
        provider: "google" | "apple",
        token: string,
        userData?: any
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

      // Cart
      cart: [],

      addToCart: (product) =>
        set((state) => {
          const existing = state.cart.find((item) => item.id === product.id);
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          return {
            cart: [...state.cart, { ...product, quantity: 1 }],
          };
        }),

      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === productId ? { ...item, quantity } : item
          ),
        })),

      clearCart: () => set({ cart: [] }),

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
            addr.id === addressId ? { ...addr, ...updates } : addr
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
              : order
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
        cart: state.cart,
        favorites: state.favorites,
        addresses: state.addresses,
        paymentMethods: state.paymentMethods,
        orders: state.orders,
      }),
    }
  )
);
