export interface Product {
  barcode: number;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en?: string;
  description_ar?: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  image?: string;
  weight?: number;
  unit?: string;
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  is_active: boolean;
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
  rating?: number;
  reviews?: number;
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
  label: 'Home' | 'Work' | 'Other';
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
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  images?: string[];
  helpful: number;
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
