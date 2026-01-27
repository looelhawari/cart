# Sales & Promotions Admin System - Frontend Requirements

## Overview
This document specifies what the **mobile app frontend** needs to display sales, offers, and promotions controlled by the admin dashboard.

---

## 📱 Mobile App Screens to Build

### 1. **Offers/Promotions Page** (`frontend/app/(tabs)/offers.tsx`)
A dedicated tab/screen showing all active promotions and sales.

**Required Features:**
- Display featured/hero promotion banner (large card at top)
- Grid of active promotion cards
- Filter by category
- Search promotions
- Pull-to-refresh
- Tap to view promotion details

**Expected Data Structure:**
```typescript
interface Promotion {
  id: number;
  title: string;
  description: string;
  image_url: string;
  banner_image_url?: string; // For hero banner
  discount_type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_featured: boolean; // Shows in hero banner
  applies_to: 'all' | 'category' | 'products';
  category_ids?: number[];
  product_barcodes?: string[];
  min_purchase?: number;
  max_discount?: number;
  terms_conditions?: string;
}
```

### 2. **Homepage Hero Banner** (`frontend/app/(tabs)/index.tsx`)
Update existing homepage to show admin-controlled hero promotion card.

**Required Features:**
- Large banner/card at top of homepage
- Auto-rotate multiple featured promotions (carousel)
- Tap to view promotion details or navigate to products
- Fallback image if no active promotions

**API Call:**
```typescript
GET /api/v1/promotions/featured
Response: { data: { promotion: Promotion } }
```

### 3. **Promotion Details Screen** (`frontend/app/promotions/[id].tsx`)
Full details when user taps on a promotion.

**Required Features:**
- Promotion banner image
- Title, description, terms & conditions
- Countdown timer (time remaining)
- "Shop Now" button
- List of products/categories included
- Share promotion button

### 4. **Updated Product Card Component** (`frontend/components/ProductCard.tsx`)
Show sale badges and discounted prices.

**Required Features:**
- Sale badge (e.g., "30% OFF", "SALE")
- Original price (strikethrough)
- Discounted price (highlighted)
- Promotion label/tag
- Visual indicator for flash deals

**Expected Product Data Structure:**
```typescript
interface Product {
  // ... existing fields
  on_sale: boolean;
  original_price?: number; // Price before discount
  sale_price?: number; // Discounted price
  discount_percentage?: number;
  promotion_id?: number;
  promotion_label?: string; // e.g., "Flash Sale", "Weekend Deal"
  sale_ends_at?: string; // Countdown
}
```

### 5. **Category Sales Badge** (`frontend/app/categories/[id].tsx`)
Show promotion badges on category pages.

**Required Features:**
- Banner at top if category has active sale
- "X% OFF All Items" badge
- Sale countdown timer
- Filter to show only discounted items

---

## 🔌 API Endpoints Needed (Backend)

### **Promotions Management**
```typescript
// Get all active promotions
GET /api/v1/promotions
Query: ?type=all|category|product&category_id=X

// Get featured promotion (for homepage hero)
GET /api/v1/promotions/featured

// Get promotion details
GET /api/v1/promotions/{id}

// Get products in promotion
GET /api/v1/promotions/{id}/products
```

### **Products with Sales**
```typescript
// Products endpoint should include promotion data
GET /api/v1/products
Response: {
  data: {
    products: [{
      barcode: "123",
      name: "Product",
      price: 100,
      on_sale: true,
      original_price: 150,
      sale_price: 100,
      discount_percentage: 33,
      promotion_id: 5,
      promotion_label: "Weekend Sale"
    }]
  }
}

// Flash deals / sales products
GET /api/v1/products/on-sale
GET /api/v1/products/flash-deals
```

### **Categories with Promotions**
```typescript
// Categories should include active promotions
GET /api/v1/categories
Response: {
  data: {
    categories: [{
      id: 1,
      name: "Electronics",
      has_active_promotion: true,
      promotion: {
        id: 10,
        title: "Tech Week Sale",
        discount_percentage: 25,
        ends_at: "2026-02-01"
      }
    }]
  }
}
```

---

## 🎨 UI Components to Create

### 1. **PromotionCard Component**
```typescript
// frontend/components/PromotionCard.tsx
<PromotionCard 
  promotion={promotion}
  onPress={() => router.push(`/promotions/${promotion.id}`)}
/>
```

### 2. **SaleBadge Component**
```typescript
// frontend/components/SaleBadge.tsx
<SaleBadge 
  discount={30}
  type="percentage" // or "fixed", "flash"
/>
```

### 3. **CountdownTimer Component**
```typescript
// frontend/components/CountdownTimer.tsx
<CountdownTimer 
  endDate={promotion.end_date}
  onExpire={() => refetchPromotions()}
/>
```

### 4. **HeroBanner Component** (Carousel)
```typescript
// frontend/components/HeroBanner.tsx
<HeroBanner 
  promotions={featuredPromotions}
  autoPlay={true}
  interval={5000}
/>
```

---

## 📊 Database Schema Needed (Backend)

### **Promotions Table**
```sql
CREATE TABLE promotions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  banner_image_url VARCHAR(500),
  discount_type ENUM('percentage', 'fixed', 'buy_x_get_y') DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false, -- Shows in homepage hero
  applies_to ENUM('all', 'category', 'products') DEFAULT 'all',
  min_purchase DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2) NULL,
  terms_conditions TEXT,
  created_by INT, -- Admin user ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **Promotion Categories (Many-to-Many)**
```sql
CREATE TABLE promotion_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  promotion_id BIGINT NOT NULL,
  category_id INT NOT NULL,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

### **Promotion Products (Many-to-Many)**
```sql
CREATE TABLE promotion_products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  promotion_id BIGINT NOT NULL,
  product_barcode VARCHAR(50) NOT NULL,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_barcode) REFERENCES products(barcode) ON DELETE CASCADE
);
```

---

## 🎯 Admin Dashboard Features to Implement

Tell the admin dashboard AI to create these features:

### **1. Promotions Management Page**
- Create new promotion
- Edit existing promotions
- Delete/deactivate promotions
- Set featured promotion (homepage hero)
- Preview promotion in mobile view
- Schedule start/end dates
- Set discount type and value

### **2. Promotion Creation Form**
**Fields:**
- Title & Description
- Upload banner image (for hero)
- Upload card image (for grid)
- Discount Type: Percentage / Fixed Amount / Buy X Get Y
- Discount Value
- Start Date & End Date
- Apply To: All Products / Specific Categories / Specific Products
- Category Selector (multi-select dropdown)
- Product Selector (search & add products)
- Minimum Purchase Amount
- Maximum Discount Cap
- Terms & Conditions
- Featured (Show on Homepage)
- Active Status

### **3. Sales Analytics Dashboard**
- Total revenue from promotions
- Most popular promotions
- Conversion rate per promotion
- Products sold through promotions
- Category performance during sales

### **4. Quick Actions**
- Duplicate existing promotion
- Extend promotion end date
- Apply same discount to multiple categories
- Bulk activate/deactivate
- Create flash sale (1-4 hours)
- Schedule recurring promotions

---

## 🔄 Real-Time Updates

### **Mobile App Behavior:**
- Refresh promotions when app opens
- Check for expired promotions on homepage
- Show countdown timers
- Auto-hide expired promotions
- Cache active promotions for offline viewing

### **Admin Dashboard:**
- Live preview of mobile app view
- Auto-expire promotions at end date
- Send notifications when promotion is about to end
- Analytics update in real-time

---

## 📝 Business Rules to Implement

1. **Multiple Promotions on Same Product:**
   - Only the best discount applies (highest percentage)
   - Show "Best Deal" badge

2. **Category + Product Promotions:**
   - If product is in promoted category AND has individual promotion
   - Apply whichever is better

3. **Minimum Purchase:**
   - Promotion only valid if cart total >= min_purchase
   - Show progress bar in cart

4. **Maximum Discount:**
   - Cap discount at max_discount amount
   - Example: 50% off, max $100 discount

5. **Featured Promotion:**
   - Only ONE promotion can be featured at a time
   - Setting new featured auto-unfeatured previous

---

## 🎨 Design Specifications

### **Promotion Card (Grid View)**
- Size: 160x200 dp
- Border radius: 12dp
- Shadow: elevation 2
- Badge: Top-right corner
- Image: Full width, 120dp height
- Text: Title (2 lines max), discount (bold, large)

### **Hero Banner (Homepage)**
- Size: Full width, 180dp height
- Border radius: 16dp
- Overlay gradient for text readability
- CTA button: "Shop Now"
- Auto-rotate every 5 seconds

### **Sale Badge**
- Colors: Red for flash sales, Orange for regular sales, Green for category sales
- Font: Bold, 12sp
- Position: Top-left on product card

---

## 📦 Additional Files to Create

### **Mobile App:**
1. `frontend/app/(tabs)/offers.tsx` - Main offers page
2. `frontend/app/promotions/[id].tsx` - Promotion details
3. `frontend/components/PromotionCard.tsx` - Card component
4. `frontend/components/HeroBanner.tsx` - Homepage carousel
5. `frontend/components/SaleBadge.tsx` - Sale indicator
6. `frontend/components/CountdownTimer.tsx` - Time remaining
7. `frontend/services/api/promotionApi.ts` - API calls
8. `frontend/types/promotion.ts` - TypeScript interfaces

### **Backend (Admin Dashboard AI will create):**
1. `app/Http/Controllers/Api/PromotionController.php`
2. `app/Models/Promotion.php`
3. `app/Services/PromotionService.php`
4. `database/migrations/create_promotions_tables.php`
5. `routes/api.php` - Add promotion routes

---

## 🚀 Implementation Priority

### **Phase 1 - Core Features** (Week 1)
1. Database schema & migrations
2. Basic promotion CRUD API
3. Mobile: Offers page with grid
4. Mobile: Product card sale badges

### **Phase 2 - Homepage Integration** (Week 2)
5. Featured promotion API
6. Mobile: Hero banner carousel
7. Admin: Promotion creation form
8. Category-wide sales

### **Phase 3 - Advanced Features** (Week 3)
9. Countdown timers
10. Promotion analytics
11. Scheduled promotions
12. Buy X Get Y logic

---

## 📞 API Summary for Admin Dashboard AI

**Tell the admin dashboard AI to create these endpoints:**

```
POST   /api/v1/admin/promotions          - Create promotion
GET    /api/v1/admin/promotions          - List all promotions
GET    /api/v1/admin/promotions/{id}     - Get promotion details
PUT    /api/v1/admin/promotions/{id}     - Update promotion
DELETE /api/v1/admin/promotions/{id}     - Delete promotion
POST   /api/v1/admin/promotions/{id}/feature - Set as featured
GET    /api/v1/admin/promotions/analytics - Get analytics

// Public endpoints for mobile app
GET /api/v1/promotions                   - Active promotions
GET /api/v1/promotions/featured          - Featured promotion
GET /api/v1/promotions/{id}              - Promotion details
GET /api/v1/promotions/{id}/products     - Products in promotion
```

---

## ✅ Testing Checklist

- [ ] Create promotion applies discount to products
- [ ] Featured promotion shows on homepage
- [ ] Expired promotions auto-hide
- [ ] Countdown timer accurate
- [ ] Multiple promotions = best discount applies
- [ ] Category sale affects all products
- [ ] Product search filters sale items
- [ ] Cart applies promotion discounts
- [ ] Analytics track promotion usage
- [ ] Images upload and display correctly

---

## 🎯 Summary

**The admin dashboard AI needs to build:**
- Promotion management CRUD system
- Image upload for banners
- Category/product selector
- Analytics dashboard
- Schedule management

**The mobile app will have:**
- Offers page showing all sales
- Hero banner on homepage
- Sale badges on products
- Countdown timers
- Promotion detail screens

All controlled by admin, consumed by mobile app via REST APIs.
