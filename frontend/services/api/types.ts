// API Types
export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  language: "en" | "ar";
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyEmailData {
  email: string;
  otp: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  password: string;
  password_confirmation: string;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  avatar: string | null;
  language: "en" | "ar";
  role: "customer" | "admin" | "super_admin";
  is_verified: boolean;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: true;
  message: string;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
    token_type: "Bearer";
    expires_in: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  error_code?: string;
}

export interface Address {
  id: number;
  user_id: number;
  label: string;
  street: string;
  city: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressData {
  label: string;
  street: string;
  city: string;
  is_default?: boolean;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

// Cart Types
export interface Product {
  id: number;
  name_en: string;
  name_ar: string;
  image: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface PromoCode {
  code: string;
  type: "percentage" | "fixed_amount" | "free_delivery" | "bogo";
  applies_to?: "order" | "category" | "product";
  value: number;
  discount_amount: number;
}

export interface Cart {
  id: number;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  tax: number;
  total: number;
  items_count: number;
  promo_code?: PromoCode | null;
}
