export interface Product {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  price: number;
  salePrice?: number;
  image: string;
  images?: string[];
  category: string;
  inStock: boolean;
  stock?: number;
  rating: number;
  reviews: number;
  unit: string;
  brand?: string;
  weight?: string;
  ingredients?: string;
  allergens?: string[];
  nutritionFacts?: NutritionFacts;
}

export interface NutritionFacts {
  servingSize: string;
  calories: number;
  totalFat: string;
  saturatedFat: string;
  cholesterol: string;
  sodium: string;
  totalCarbohydrate: string;
  protein: string;
}

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  image: string;
  productCount: number;
  parentId?: string;
  subcategories?: Category[];
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: 'processing' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
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
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
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

export interface CartItem extends Product {
  quantity: number;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  apartment?: string;
  city: string;
  state?: string;
  postalCode?: string;
  landmark?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
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
  linkType: 'product' | 'category' | 'url' | 'none';
  linkValue?: string;
  backgroundColor: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed' | 'free_delivery';
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
  type: 'order' | 'offer' | 'account' | 'general';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: any;
}
