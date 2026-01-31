export interface Product {
  barcode: number;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en?: string;
  description_ar?: string;
  price: number;
  sale_price?: number;
  cost_price?: number;
  stock_quantity: number;
  is_in_stock?: boolean;
  image?: string;
  weight?: number;
  unit?: string;
  nutrition_facts?: string | object; // JSON field from database
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  is_active: boolean;
  sales_count?: number;
  created_at?: string;
  updated_at?: string;
  categories?: Category[];
  // Computed properties for backwards compatibility
  id?: number;
  name?: string;
  nameAr?: string;
  description?: string;
  salePrice?: number;
  image_url?: string;
  images?: string[];
  category?: string;
  inStock?: boolean;
  stock?: number;
  nutritionFacts?: any;
  ingredients?: string;
  allergens?: string[];
}

export interface Category {
  id: number;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  slug: string;
  parent_id?: number | null;
  image?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  subcategories?: Category[];
  products_count?: number;
  // Computed properties for backwards compatibility
  name?: string;
  nameAr?: string;
  productCount?: number;
  parentId?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status:
  | "processing"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  total: number;
  items: OrderItem[];
  deliveryAddress: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  deliveryInstructions?: string;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  estimatedDelivery?: string;
  driverInfo?: DriverInfo;
  timeline?: OrderTimeline[];
}

export interface DriverInfo {
  name: string;
  phone: string;
  photo: string;
  rating: number;
  vehicleNumber: string;
}

export interface OrderTimeline {
  status: string;
  timestamp: string;
  note?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  created_at?: string;
  updated_at?: string;
  product: Product;
}

export interface Cart {
  id: number;
  user_id?: number;
  session_id?: string;
  promo_code?: string | null;
  discount?: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  delivery_fee: number;
  total: number;
  items_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface Address {
  id: number;
  user_id: number;
  label: "Home" | "Work" | "Other";
  recipient_name: string;
  phone: string;
  street: string;
  building?: string;
  floor?: string;
  apartment?: string;
  city: string;
  area?: string;
  landmark?: string;
  notes?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: number;
  productId?: string;
  product_id: number;
  userId?: string;
  user_id: number;
  order_id: number;
  userName?: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date?: string;
  created_at: string;
  updated_at?: string;
  verified?: boolean;
  is_verified?: boolean;
  images?: string[];
  helpful?: number;
  helpful_count?: number;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    avatar?: string;
  };
  product?: Product;
}

export interface Banner {
  id: string;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  image: string;
  linkType: "product" | "category" | "url" | "none";
  linkValue?: string;
  backgroundColor: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  type: "percentage" | "fixed" | "free_delivery";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
}

export interface Notification {
  id: string;
  type: "order" | "offer" | "account" | "general";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: any;
}

export type SortOption =
  | "price"
  | "rating"
  | "created_at"
  | "popularity"
  | "name_en";

export type SortOrder = "asc" | "desc";

export interface FilterOptions {
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  subcategoryId?: number;
  sortBy?: SortOption;
  sortOrder?: SortOrder;
}

// ═══════════════════════════════════════════════════════
// PAYMENT METHODS (Phase 5 - Frontend Integration)
// ═══════════════════════════════════════════════════════

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "card";

export interface PaymentMethod {
  id: number;
  type: "card";
  card_brand: CardBrand;
  card_last_four: string;
  masked_card: string;
  is_default: boolean;
  is_verified: boolean;
  is_expired: boolean;
  expires_at: string | null; // Format: "12/27" (m/y)
}

export interface PaymentMethodsResponse {
  success: boolean;
  data: {
    payment_methods: PaymentMethod[];
  };
}

export interface SetDefaultResponse {
  success: boolean;
  message: string;
  data: {
    payment_method: {
      id: number;
      card_last_four: string;
      card_brand: CardBrand;
      is_default: boolean;
    };
  };
}

export interface DeletePaymentMethodResponse {
  success: boolean;
  message: string;
  data: {
    new_default: {
      id: number;
      card_last_four: string;
      card_brand: CardBrand;
    } | null;
  };
}

export interface InitiatePaymentRequest {
  order_id: number;
  payment_method: "CARD" | "WALLET";
  payment_method_id?: number; // ✅ Saved card ID for dual-flow
  save_card?: boolean; // ✅ New flag for saving card
  billing_data: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    city: string;
    street: string;
  };
}

export interface InitiatePaymentResponse {
  success: boolean;
  message: string;
  data: {
    payment_token: string;
    iframe_url: string;
    order_id: number;
    amount_cents: number;
  };
}

export interface InitiateSavedCardPaymentRequest {
  order_id: number;
  payment_method_id: number;
}

export interface InitiateSavedCardPaymentResponse {
  success: boolean;
  message: string;
  data: {
    payment_token: string;
    iframe_url: string; // ✅ May require 3DS challenge
    card_last_four: string;
    card_brand: CardBrand;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}
