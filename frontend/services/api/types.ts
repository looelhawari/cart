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
    requires_phone_verification?: boolean;
    is_new_user?: boolean;
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
  is_in_stock?: boolean;
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface PromoSummary {
  applied_code: string;
  promo_id: number | null;
  promo_code: string;
  type: "percentage" | "fixed_amount" | "free_delivery" | "bogo" | null;
  applies_to: "order" | "category" | "product" | null;
  discount_amount: number;
  discount_type: "order" | "category" | "product" | "bogo" | null;
  breakdown: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_per_unit: number;
    discount_total: number;
  }>;
  validation_state: "valid" | "pending" | "invalid";
  invalid_reason: string | null;
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
  promo_summary?: PromoSummary | null;
}

export interface OfferTargetCategory {
  id: number;
  name_en: string;
  name_ar: string;
  include_subcategories: boolean;
}

export interface OfferTargetProduct {
  id: number;
  name_en: string;
  name_ar: string;
  image: string;
  price: number;
  sale_price: number | null;
}

export interface OfferBogoRule {
  id: number;
  buy_scope: "product" | "category";
  buy_product_id: number | null;
  buy_category_id: number | null;
  buy_qty: number;
  buy_label: string;
  get_scope: "product" | "category";
  get_product_id: number | null;
  get_category_id: number | null;
  get_qty: number;
  get_discount_type: "free" | "percentage" | "fixed_amount";
  get_discount_value: number;
  get_label: string;
  max_applications_per_order: number | null;
}

export interface OfferEligibility {
  state: "valid" | "pending" | "invalid" | "login_required";
  reason: string | null;
  message: string;
  can_apply: boolean;
  requires_login: boolean;
  user_usage_count: number | null;
}

export interface Offer {
  id: number;
  code: string;
  type: "percentage" | "fixed_amount" | "free_delivery" | "bogo";
  applies_to: "order" | "category" | "product";
  value: number;
  minimum_order: number;
  maximum_discount: number | null;
  usage_limit: number | null;
  usage_per_user: number;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  first_order_only: boolean;
  status: "active" | "upcoming" | "expired" | "ended";
  ending_soon: boolean;
  badge: string;
  title: string;
  subtitle: string;
  restrictions: string[];
  targets: {
    categories: OfferTargetCategory[];
    products: OfferTargetProduct[];
    bogo_rules: OfferBogoRule[];
  };
  eligibility: OfferEligibility;
}

export interface OffersResponse {
  success: boolean;
  data: {
    offers: Offer[];
    meta: {
      count: number;
    };
  };
}

export interface OffersSummaryResponse {
  success: boolean;
  data: {
    active_count: number;
    ending_soon_count: number;
    eligible_count: number;
    has_offers: boolean;
    max_percentage?: number | null;
    max_value?: number | null;
  };
}
