# ELBARAKA API DOCUMENTATION

**Version:** 1.0  
**Base URL:** `https://api.elbaraka.com/api/v1`  
**Environment:** Production  
**Last Updated:** December 1, 2025

---

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Error Codes](#error-codes)
4. [Rate Limiting](#rate-limiting)
5. [Endpoints](#endpoints)
   - [Authentication](#auth-endpoints)
   - [User Profile](#user-profile-endpoints)
   - [Addresses](#address-endpoints)
   - [Categories & Brands](#category-brand-endpoints)
   - [Products](#product-endpoints)
   - [Shopping Cart](#cart-endpoints)
   - [Orders](#order-endpoints)
   - [Payments](#payment-endpoints)
   - [Favorites](#favorite-endpoints)
   - [Reviews](#review-endpoints)
   - [Complaints/Tickets](#complaint-endpoints)
   - [Notifications](#notification-endpoints)
   - [Banners & Promotions](#banner-endpoints)
6. [Admin Endpoints](#admin-endpoints)
7. [Security Best Practices](#security-best-practices)

---

## API Overview

### Base URL Structure

```
Development:   http://localhost:8000/api/v1
```

### Standard Response Format

**Success Response:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 150,
    "last_page": 8
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."]
  },
  "error_code": 1001
}
```

---

## Authentication

### Laravel Sanctum Configuration

- **Access Token Lifetime:** 30 minutes
- **Refresh Token Lifetime:** 30 days (with rotation)
- **Token Type:** Bearer
- **Header Format:** `Authorization: Bearer {token}`

### Token Management

- Access tokens expire after 30 minutes
- Refresh tokens are rotated on each use
- Refresh tokens are blacklisted on logout
- No JWT packages or Spatie Permission - use simple `role` ENUM

---

## Error Codes

| Code | Message             | HTTP Status |
| ---- | ------------------- | ----------- |
| 1001 | Validation Error    | 400         |
| 1002 | Unauthorized        | 401         |
| 1003 | Forbidden           | 403         |
| 1004 | Not Found           | 404         |
| 1005 | Out of Stock        | 409         |
| 1006 | Invalid Promo Code  | 422         |
| 1007 | Payment Failed      | 402         |
| 1008 | Rate Limit Exceeded | 429         |
| 1009 | Server Error        | 500         |

---

## Rate Limiting

| Endpoint Type      | Limit       | Window   |
| ------------------ | ----------- | -------- |
| Authentication     | 5 requests  | 1 minute |
| General API        | 60 requests | 1 minute |
| Search             | 30 requests | 1 minute |
| Cart Operations    | 60 requests | 1 minute |
| Payment Operations | 5 requests  | 1 minute |

**Rate Limit Headers:**

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 57
X-RateLimit-Reset: 1638360000
```

---

## Endpoints

### Auth Endpoints

#### 1. Register User

**Endpoint:** `POST /api/v1/auth/register`  
**Middleware:** `guest, throttle:10,1`  
**Description:** Register new user and send phone OTP

**Request Body:**

```json
{
  "first_name": "Ahmed",
  "last_name": "Hassan",
  "email": "ahmed@example.com",
  "phone": "+201234567890",
  "password": "SecurePass123!",
  "password_confirmation": "SecurePass123!",
  "language": "ar"
}
```

**Validation Rules:**

- `first_name`: required, string, max:255
- `last_name`: required, string, max:255
- `email`: required, email, unique:users
- `phone`: required, regex:/^\+?[0-9]{10,15}$/, unique:users
- `password`: required, min:8, confirmed
- `language`: required, in:ar,en

**Response (200):**

```json
{
  "success": true,
  "message": "Registration successful. Please verify your phone number.",
  "data": {
    "user": {
      "id": 1,
      "first_name": "Ahmed",
      "last_name": "Hassan",
      "email": "ahmed@example.com",
      "phone": "+201234567890",
      "language": "ar",
      "is_verified": false
    },
    "otp_sent": true
  }
}
```

---

#### 2. Verify Phone

**Endpoint:** `POST /api/v1/auth/verify-phone`  
**Middleware:** `guest`  
**Description:** Verify phone number with OTP, OTP is valid for 10 minutes. 

**Request Body:**

```json
{
  "phone": "+201234567890",
  "otp": "123456"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Phone verified successfully",
  "data": {
    "user": {
      "id": 1,
      "phone_verified_at": "2025-12-01T10:30:00Z"
    },
    "tokens": {
      "access_token": "1|xxxxxx",
      "refresh_token": "refresh_xxxxxx",
      "token_type": "Bearer",
      "expires_in": 3600
    }
  }
}
```

---

#### 3. Login

**Endpoint:** `POST /api/v1/auth/login`  
**Middleware:** `guest, throttle:10,1`  
**Description:** Login and get access + refresh tokens

**Request Body:**

```json
{
  "email": "ahmed@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "first_name": "Ahmed",
      "last_name": "Hassan",
      "email": "ahmed@example.com",
      "phone": "+201234567890",
      "avatar": "https://cdn.elbaraka.com/avatars/user-1.jpg",
      "role": "customer"
    },
    "tokens": {
      "access_token": "1|xxxxxx",
      "refresh_token": "refresh_xxxxxx",
      "token_type": "Bearer",
      "expires_in": 3600
    }
  }
}
```

**Cart Merge Logic (CRITICAL):**
When user logs in, the backend MUST execute `CartService@mergeGuestCart()`:

1. Find cart by session_id
2. Move all cart_items to user_id cart
3. Delete guest cart
4. Return merged cart

---

#### 4. Refresh Token

**Endpoint:** `POST /api/v1/auth/refresh`  
**Middleware:** `auth:sanctum`  
**Description:** Get new access token using refresh token

**Request Body:**

```json
{
  "refresh_token": "refresh_xxxxxx"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "access_token": "2|yyyyyy",
    "refresh_token": "refresh_yyyyyy",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

---

#### 5. Logout

**Endpoint:** `POST /api/v1/auth/logout`  
**Middleware:** `auth:sanctum`  
**Description:** Logout and blacklist refresh token

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### 6. Forgot Password

**Endpoint:** `POST /api/v1/auth/forgot-password`  
**Middleware:** `guest`  
**Description:** Send password reset OTP,

**Request Body:**

```json
{
  "email": "ahmed@example.com"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password reset OTP sent to your email"
}
```

---

#### 7. Reset Password

**Endpoint:** `POST /api/v1/auth/reset-password`  
**Middleware:** `guest`  
**Description:** Reset password with OTP, OTP is valid for 10 minutes. 

**Request Body:**

```json
{
  "email": "ahmed@example.com",
  "otp": "123456",
  "password": "NewSecurePass123!",
  "password_confirmation": "NewSecurePass123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### User Profile Endpoints

#### 8. Get Profile

**Endpoint:** `GET /api/v1/profile`  
**Middleware:** `auth:sanctum`  
**Cache:** None

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "first_name": "Ahmed",
    "last_name": "Hassan",
    "email": "ahmed@example.com",
    "phone": "+201234567890",
    "avatar": "https://cdn.elbaraka.com/avatars/user-1.jpg",
    "language": "ar",
    "is_verified": true,
    "created_at": "2025-11-01T10:00:00Z",
    "statistics": {
      "total_orders": 15,
      "completed_orders": 12,
      "total_spent": 2450.0
    }
  }
}
```

---

#### 9. Update Profile

**Endpoint:** `PUT /api/v1/profile`  
**Middleware:** `auth:sanctum`

**Request Body:**

```json
{
  "first_name": "Ahmed",
  "last_name": "Hassan",
  "email": "ahmed@example.com",
  "phone": "+201234567890",
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      /* updated user data */
    }
  }
}
```

---

#### 10. Upload Avatar

**Endpoint:** `POST /api/v1/profile/avatar`  
**Middleware:** `auth:sanctum`  
**Content-Type:** `multipart/form-data`

**Request:**

```
avatar: [file] (jpg, jpeg, png, webp - max 2MB)
```

**Validation:**

- File required
- Mime types: jpg, jpeg, png, webp 
- Max size: 2MB (2048 KB)
- Min dimensions: 100x100px

**Response (200):**

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar_url": "https://cdn.elbaraka.com/avatars/uuid.jpg"
  }
}
```

**Storage:** Cloudinary (NOT public folder)

---

#### 11. Delete Avatar

**Endpoint:** `DELETE /api/v1/profile/avatar`  
**Middleware:** `auth:sanctum`

**Response (200):**

```json
{
  "success": true,
  "message": "Avatar deleted successfully"
}
```

---

#### 12. Change Password

**Endpoint:** `PUT /api/v1/profile/change-password`  
**Middleware:** `auth:sanctum`

**Request Body:**

```json
{
  "current_password": "OldPass123!",
  "password": "NewSecurePass123!",
  "password_confirmation": "NewSecurePass123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Address Endpoints

#### 13. List Addresses

**Endpoint:** `GET /api/v1/addresses`  
**Middleware:** `auth:sanctum`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "label": "Home",
      "street": "123 Main Street, Apartment 4B",
      "appartment_floor_building": "",
      "nearby_landmark": "",
      "is_default": true,
      "created_at": "2025-11-01T10:00:00Z"
    }
  ]
}
```

---

#### 14. Create Address

**Endpoint:** `POST /api/v1/addresses`  
**Middleware:** `auth:sanctum`

**Request Body:**

```json
{
  "label": "Work",
  "street": "456 Office Building, Floor 5",
  "city": "Giza",
  "is_default": false
}
```

**Validation:**

- `label`: required, string, max:100
- `street`: required, string
- `city`: required, string, max:100
- `is_default`: boolean

**Response (201):**

```json
{
  "success": true,
  "message": "Address created successfully",
  "data": {
    "id": 2,
    "label": "Work",
    "street": "456 Office Building, Floor 5",
    "city": "Giza",
    "is_default": false
  }
}
```

---

#### 15. Update Address

**Endpoint:** `PUT /api/v1/addresses/{id}`  
**Middleware:** `auth:sanctum`

**Request Body:** Same as Create Address

**Response (200):**

```json
{
  "success": true,
  "message": "Address updated successfully",
  "data": {
    /* updated address */
  }
}
```

---

#### 16. Delete Address

**Endpoint:** `DELETE /api/v1/addresses/{id}`  
**Middleware:** `auth:sanctum`

**Response (200):**

```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

---

#### 17. Set Default Address

**Endpoint:** `POST /api/v1/addresses/{id}/default`  
**Middleware:** `auth:sanctum`  
**Description:** Set address as default (auto unsets others)

**Response (200):**

```json
{
  "success": true,
  "message": "Default address set successfully",
  "data": {
    /* updated address */
  }
}
```

---

### Category & Brand Endpoints

#### 18. List Categories (Hierarchical Tree)

**Endpoint:** `GET /api/v1/categories`  
**Middleware:** `throttle:60,1`  
**Cache:** 1 hour  
**Description:** Get full hierarchical category tree with subcategories

**Query Parameters:**

```
?include_subcategories=true  (default: true)
&parent_id=1                 (optional: filter by parent)
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "parent_id": null,
      "name_en": "Fruits & Vegetables",
      "name_ar": "الفواكه والخضروات",
      "slug": "fruits-vegetables",
      "image": "https://cdn.elbaraka.com/categories/fruits.jpg",
      "icon": "🍎",
      "sort_order": 1,
      "is_active": true,
      "products_count": 156,
      "subcategories": [
        {
          "id": 10,
          "parent_id": 1,
          "name_en": "Fresh Fruits",
          "name_ar": "فواكه طازجة",
          "slug": "fresh-fruits",
          "image": "https://cdn.elbaraka.com/categories/fresh-fruits.jpg",
          "icon": "🍓",
          "sort_order": 1,
          "is_active": true,
          "products_count": 45
        },
        {
          "id": 11,
          "parent_id": 1,
          "name_en": "Vegetables",
          "name_ar": "خضروات",
          "slug": "vegetables",
          "image": "https://cdn.elbaraka.com/categories/vegetables.jpg",
          "icon": "🥬",
          "sort_order": 2,
          "is_active": true,
          "products_count": 67
        }
      ]
    },
    {
      "id": 2,
      "parent_id": null,
      "name_en": "Dairy & Eggs",
      "name_ar": "منتجات الألبان والبيض",
      "slug": "dairy-eggs",
      "image": "https://cdn.elbaraka.com/categories/dairy.jpg",
      "icon": "🥛",
      "sort_order": 2,
      "is_active": true,
      "products_count": 89,
      "subcategories": [
        {
          "id": 12,
          "parent_id": 2,
          "name_en": "Milk",
          "name_ar": "حليب",
          "slug": "milk",
          "icon": "🥛",
          "sort_order": 1,
          "is_active": true,
          "products_count": 23
        },
        {
          "id": 13,
          "parent_id": 2,
          "name_en": "Cheese",
          "name_ar": "جبن",
          "slug": "cheese",
          "icon": "🧀",
          "sort_order": 2,
          "is_active": true,
          "products_count": 34
        },
        {
          "id": 14,
          "parent_id": 2,
          "name_en": "Eggs",
          "name_ar": "بيض",
          "slug": "eggs",
          "icon": "🥚",
          "sort_order": 3,
          "is_active": true,
          "products_count": 12
        }
      ]
    }
  ]
}
```

**Business Rules:**

- Main categories have `parent_id: null`
- Subcategories have `parent_id` referencing parent category
- `products_count` includes products in subcategories for main categories
- Ordered by `sort_order` ASC
- Only return `is_active: true` categories

---

#### 19. Get Category with Subcategories

**Endpoint:** `GET /api/v1/categories/{id}`  
**Middleware:** `throttle:60,1`  
**Cache:** 30 minutes  
**Description:** Get single category details with its subcategories

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "parent_id": null,
    "name_en": "Fruits & Vegetables",
    "name_ar": "الفواكه والخضروات",
    "slug": "fruits-vegetables",
    "description_en": "Fresh fruits and vegetables delivered daily",
    "description_ar": "فواكه وخضروات طازجة يتم توصيلها يوميًا",
    "image": "https://cdn.elbaraka.com/categories/fruits.jpg",
    "icon": "🍎",
    "sort_order": 1,
    "is_active": true,
    "products_count": 156,
    "subcategories": [
      {
        "id": 10,
        "parent_id": 1,
        "name_en": "Fresh Fruits",
        "name_ar": "فواكه طازجة",
        "slug": "fresh-fruits",
        "products_count": 45
      },
      {
        "id": 11,
        "parent_id": 1,
        "name_en": "Vegetables",
        "name_ar": "خضروات",
        "slug": "vegetables",
        "products_count": 67
      }
    ]
  }
}
```

---

#### 20. List Brands

**Endpoint:** `GET /api/v1/brands`  
**Middleware:** `throttle:60,1`  
**Cache:** 2 hours

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Fresh Farms",
      "slug": "fresh-farms",
      "logo": "https://cdn.elbaraka.com/brands/fresh-farms.png",
      "is_active": true
    }
  ]
}
```

---

### Product Endpoints

#### 21. Search Products

**Endpoint:** `GET /api/v1/products`  
**Middleware:** `throttle:60,1`  
**Cache:** 5 minutes

**Query Parameters:**

```
?page=1
&per_page=20
&search=apple
&category_id=1              (filters by category including all subcategories)
&subcategory_id=10          (filters by specific subcategory only)
&brand_id=2
&min_price=10
&max_price=500
&sort_by=price|name|created_at
&sort_order=asc|desc
&is_featured=1
```

**Important Filter Logic:**

- `category_id`: Returns products from category AND all its subcategories
- `subcategory_id`: Returns products ONLY from that specific subcategory
- Cannot use both `category_id` and `subcategory_id` together

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sku": "PRD-001",
      "name_en": "Fresh Apples",
      "name_ar": "تفاح طازج",
      "slug": "fresh-apples",
      "image": "https://cdn.elbaraka.com/products/apples.jpg",
      "price": 25.5,
      "sale_price": 22.0,
      "discount_percentage": 14,
      "unit": "kg",
      "stock_quantity": 150,
      "is_featured": true,
      "brand": {
        "id": 2,
        "name": "Fresh Farms"
      },
      "categories": [{ "id": 1, "name_en": "Fruits & Vegetables" }]
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 150,
    "last_page": 8
  }
}
```

---

#### 22. Featured Products

**Endpoint:** `GET /api/v1/products/featured`  
**Middleware:** `throttle:60,1`  
**Cache:** 30 minutes  
**Description:** Get featured products for home screen

**Response (200):**

```json
{
  "success": true,
  "data": [
    /* array of products */
  ]
}
```

---

#### 23. Search Suggestions

**Endpoint:** `GET /api/v1/search/suggestions`  
**Middleware:** `throttle:30,1`  
**Cache:** None

**Query Parameters:**

```
?q=app
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "suggestions": ["Apple", "Apples", "Applesauce"],
    "products": [
      {
        "id": 1,
        "name_en": "Fresh Apples",
        "image": "url"
      }
    ]
  }
}
```

---

### Cart Endpoints

**Note:** Cart supports both guest (session-based) and authenticated users.

#### 24. Get Cart

**Endpoint:** `GET /api/v1/cart`  
**Middleware:** `optional:sanctum`  
**Description:** Get cart for session or authenticated user

**Response (200):**

```json
{
  "success": true,
  "data": {
    "cart": {
      "id": 1,
      "items": [
        {
          "id": 1,
          "product": {
            "id": 15,
            "name_en": "Fresh Apples",
            "image": "url",
            "price": 25.5,
            "sale_price": 22.0,
            "stock_quantity": 150
          },
          "quantity": 2,
          "price": 22.0,
          "subtotal": 44.0
        }
      ],
      "subtotal": 44.0,
      "delivery_fee": 20.0,
      "discount": 0.0,
      "tax": 8.96,
      "total": 72.96,
      "items_count": 1
    }
  }
}
```

---

#### 25. Add Item to Cart

**Endpoint:** `POST /api/v1/cart/items`  
**Middleware:** `optional:sanctum`  
**Description:** Add product to cart (price is locked at add time)

**Request Body:**

```json
{
  "product_id": 15,
  "quantity": 2
}
```

**Validation:**

- `product_id`: required, exists:products,id
- `quantity`: required, integer, min:1

**Critical Logic:**

- Price is locked from products table at time of adding
- If product already in cart, update quantity
- Check stock availability before adding

**Response (201):**

```json
{
  "success": true,
  "message": "Product added to cart",
  "data": {
    "cart_item": {
      /* cart item data */
    },
    "cart": {
      /* updated cart with totals */
    }
  }
}
```

---

#### 26. Update Cart Item

**Endpoint:** `PUT /api/v1/cart/items/{id}`  
**Middleware:** `optional:sanctum`

**Request Body:**

```json
{
  "quantity": 3
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Cart updated",
  "data": {
    "cart": {
      /* updated cart */
    }
  }
}
```

---

#### 27. Remove Cart Item

**Endpoint:** `DELETE /api/v1/cart/items/{id}`  
**Middleware:** `optional:sanctum`

**Response (200):**

```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

---

#### 28. Clear Cart

**Endpoint:** `DELETE /api/v1/cart/clear`  
**Middleware:** `optional:sanctum`

**Response (200):**

```json
{
  "success": true,
  "message": "Cart cleared"
}
```

---

#### 29. Apply Promo Code

**Endpoint:** `POST /api/v1/cart/apply-promo`  
**Middleware:** `optional:sanctum`

**Request Body:**

```json
{
  "code": "WELCOME20"
}
```

**Validation Logic:**

- Code exists and is active
- Code is not expired (valid_from, valid_until)
- User hasn't exceeded usage_per_user limit
- Cart meets minimum_order requirement

**Response (200):**

```json
{
  "success": true,
  "message": "Promo code applied",
  "data": {
    "promo_code": {
      "code": "WELCOME20",
      "type": "percentage",
      "value": 20,
      "discount_amount": 8.8
    },
    "cart": {
      /* updated cart with discount */
    }
  }
}
```

---

#### 30. Remove Promo Code

**Endpoint:** `DELETE /api/v1/cart/remove-promo`  
**Middleware:** `optional:sanctum`

**Response (200):**

```json
{
  "success": true,
  "message": "Promo code removed",
  "data": {
    "cart": {
      /* updated cart */
    }
  }
}
```

---

### Order Endpoints

#### 31. Create Order (Checkout)

**Endpoint:** `POST /api/v1/checkout`  
**Middleware:** `auth:sanctum`  
**Description:** Create order from cart

**Request Body:**

```json
{
  "delivery_address_id": 5,
  "delivery_date": "2025-12-05",
  "delivery_time_slot": "12PM-3PM",
  "payment_method": "card",
  "notes": "Please ring the doorbell"
}
```

**Validation:**

- `delivery_address_id`: required, exists:addresses,id, belongs to user
- `delivery_date`: required, date, after:today
- `delivery_time_slot`: required, string
- `payment_method`: required, in:card,cash_on_delivery,wallet
- `notes`: nullable, string, max:500

**Critical Logic - MUST RUN IN TRANSACTION:**

1. Validate cart is not empty
2. Check stock availability for all items
3. Create order with unique order_number (ORD-YYYYMMDD-XXXXXX)
4. Create order_items (snapshot product_name, product_sku, price)
5. Create payment_transaction record
6. If payment_method is "card", create Paymob payment intent
7. Clear cart after successful order creation
8. Send order confirmation notification

**Response (201):**

```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "id": 150,
      "order_number": "ORD-20251201-789456",
      "status": "pending",
      "payment_status": "pending",
      "subtotal": 200.0,
      "delivery_fee": 20.0,
      "discount": 40.0,
      "tax": 28.0,
      "total": 208.0,
      "payment_method": "card",
      "delivery_date": "2025-12-05",
      "delivery_time_slot": "12PM-3PM",
      "items": [
        {
          "product_id": 15,
          "product_name": "Fresh Apples",
          "quantity": 2,
          "price": 22.0,
          "subtotal": 44.0
        }
      ],
      "delivery_address": {
        /* address details */
      }
    },
    "payment_intent": {
      "payment_key": "paymob_payment_key",
      "iframe_url": "https://payment-gateway.paymob.com/iframe"
    }
  }
}
```

---

#### 32. List Orders

**Endpoint:** `GET /api/v1/orders`  
**Middleware:** `auth:sanctum`

**Query Parameters:**

```
?page=1
&per_page=20
&status=pending,confirmed,delivered
&from_date=2025-01-01
&to_date=2025-12-31
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 150,
      "order_number": "ORD-20251201-789456",
      "status": "out_for_delivery",
      "payment_status": "completed",
      "total": 208.0,
      "items_count": 3,
      "created_at": "2025-12-01T10:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 15
  }
}
```

---

#### 33. Order Details

**Endpoint:** `GET /api/v1/orders/{id}`  
**Middleware:** `auth:sanctum`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 150,
    "order_number": "ORD-20251201-789456",
    "status": "out_for_delivery",
    "payment_status": "completed",
    "payment_method": "card",
    "subtotal": 200.0,
    "delivery_fee": 20.0,
    "discount": 40.0,
    "tax": 28.0,
    "total": 208.0,
    "delivery_date": "2025-12-05",
    "delivery_time_slot": "12PM-3PM",
    "notes": "Please ring the doorbell",
    "items": [
      {
        "id": 1,
        "product_id": 15,
        "product_name": "Fresh Apples",
        "product_sku": "PRD-001",
        "quantity": 2,
        "price": 22.0,
        "subtotal": 44.0
      }
    ],
    "delivery_address": {
      "label": "Home",
      "street": "123 Main Street",
      "city": "Cairo"
    },
    "status_history": [
      {
        "status": "pending",
        "created_at": "2025-12-01T10:30:00Z",
        "notes": "Order placed"
      },
      {
        "status": "confirmed",
        "created_at": "2025-12-01T10:45:00Z",
        "notes": "Payment confirmed"
      }
    ],
    "created_at": "2025-12-01T10:30:00Z"
  }
}
```

---

#### 34. Track Order

**Endpoint:** `GET /api/v1/orders/{id}/track`  
**Middleware:** `auth:sanctum`  
**Description:** Real-time order tracking

**Response (200):**

```json
{
  "success": true,
  "data": {
    "order_number": "ORD-20251201-789456",
    "status": "out_for_delivery",
    "estimated_delivery": "2025-12-05T15:00:00Z",
    "timeline": [
      {
        "status": "pending",
        "timestamp": "2025-12-01T10:30:00Z",
        "notes": "Order received"
      },
      {
        "status": "confirmed",
        "timestamp": "2025-12-01T10:45:00Z",
        "notes": "Payment confirmed"
      },
      {
        "status": "preparing",
        "timestamp": "2025-12-01T11:00:00Z",
        "notes": "Order is being prepared"
      },
      {
        "status": "out_for_delivery",
        "timestamp": "2025-12-01T14:00:00Z",
        "notes": "Order is on the way"
      }
    ]
  }
}
```

---

#### 35. Cancel Order

**Endpoint:** `POST /api/v1/orders/{id}/cancel`  
**Middleware:** `auth:sanctum`

**Request Body:**

```json
{
  "reason": "Changed my mind"
}
```

**Business Rules:**

- Can only cancel if status is "pending" or "confirmed"
- Cannot cancel if status is "preparing", "out_for_delivery", or "delivered"

**Response (200):**

```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

---

#### 36. Reorder

**Endpoint:** `POST /api/v1/orders/{id}/reorder`  
**Middleware:** `auth:sanctum`  
**Description:** Add all items from past order to current cart

**Response (200):**

```json
{
  "success": true,
  "message": "Items added to cart",
  "data": {
    "cart": {
      /* updated cart */
    }
  }
}
```

---

#### 37. Download Invoice

**Endpoint:** `GET /api/v1/orders/{id}/invoice`  
**Middleware:** `auth:sanctum`  
**Description:** Generate and download PDF invoice

**Response:** PDF file download

---

### Payment Endpoints

#### 38. Create Payment Intent (Paymob)

**Endpoint:** `POST /api/v1/payments/paymob/intent`  
**Middleware:** `auth:sanctum`  
**Description:** Create Paymob payment for order

**Request Body:**

```json
{
  "order_id": 150
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "payment_key": "paymob_payment_key_here",
    "iframe_url": "https://payment-gateway.paymob.com/iframe",
    "order_id": 150,
    "amount": 208.0
  }
}
```

---

#### 39. Paymob Webhook

**Endpoint:** `POST /api/v1/payments/paymob/webhook`  
**Middleware:** None (public endpoint)  
**Description:** Paymob callback for payment status

**Critical Security - MUST VERIFY HMAC SHA-512:**

```php
$calculatedHmac = hash_hmac('sha512', $payload, config('services.paymob.hmac_secret'));
if (!hash_equals($calculatedHmac, $request->header('HMAC'))) {
    abort(403, 'Invalid signature');
}
```

**Webhook Payload:**

```json
{
  "obj": {
    "id": "txn_67890",
    "order": {
      "id": 150
    },
    "success": true,
    "amount_cents": 20800,
    "currency": "EGP"
  }
}
```

**Processing Logic:**

1. Verify HMAC signature
2. Find order by ID
3. Update payment_status
4. Update order status
5. Create/update payment_transaction record
6. Send notification to customer
7. Return 200 OK to Paymob

**Response (200):**

```json
{
  "success": true,
  "message": "Webhook processed"
}
```

---

#### 40. Cash on Delivery

**Endpoint:** `POST /api/v1/payments/cod`  
**Middleware:** `auth:sanctum`  
**Description:** Confirm cash on delivery payment

**Request Body:**

```json
{
  "order_id": 150
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Order confirmed with cash on delivery",
  "data": {
    "order": {
      /* order data */
    }
  }
}
```

---

### Favorite Endpoints

#### 41. List Favorites

**Endpoint:** `GET /api/v1/favorites`  
**Middleware:** `auth:sanctum`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product": {
        "id": 15,
        "name_en": "Fresh Apples",
        "image": "url",
        "price": 25.5,
        "sale_price": 22.0,
        "stock_quantity": 150
      },
      "created_at": "2025-11-01T10:00:00Z"
    }
  ]
}
```

---

#### 42. Add to Favorites

**Endpoint:** `POST /api/v1/favorites`  
**Middleware:** `auth:sanctum`

**Request Body:**

```json
{
  "product_id": 15
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Added to favorites"
}
```

---

#### 43. Remove from Favorites

**Endpoint:** `DELETE /api/v1/favorites/{productId}`  
**Middleware:** `auth:sanctum`

**Response (200):**

```json
{
  "success": true,
  "message": "Removed from favorites"
}
```

---

### Review Endpoints

#### 44. Get Product Reviews

**Endpoint:** `GET /api/v1/products/{slug}/reviews`  
**Middleware:** `throttle:60,1`

**Query Parameters:**

```
?page=1
&per_page=10
&sort_by=recent|rating
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user": {
        "first_name": "Ahmed",
        "avatar": "url"
      },
      "rating": 5,
      "comment": "Excellent quality!",
      "created_at": "2025-11-15T10:00:00Z"
    }
  ],
  "meta": {
    "average_rating": 4.5,
    "total_reviews": 128
  }
}
```

---

#### 45. Submit Review

**Endpoint:** `POST /api/v1/reviews`  
**Middleware:** `auth:sanctum`  
**Description:** Submit product review (only if user purchased product)

**Request Body:**

```json
{
  "order_id": 150,
  "product_id": 15,
  "rating": 5,
  "comment": "Excellent quality!"
}
```

**Validation:**

- `order_id`: required, exists:orders,id, belongs to user
- `product_id`: required, exists:products,id
- `rating`: required, integer, min:1, max:5
- `comment`: nullable, string, max:1000

**Business Rules:**

- User must have purchased the product (order status = delivered)
- User can only review once per order-product combination

**Response (201):**

```json
{
  "success": true,
  "message": "Review submitted successfully"
}
```

---

### Complaint Endpoints

#### 46. List Tickets

**Endpoint:** `GET /api/v1/tickets`  
**Middleware:** `auth:sanctum`

**Query Parameters:**

```
?status=open,in_progress,resolved
&page=1
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 50,
      "ticket_number": "TKT-20251201-456789",
      "subject": "Product quality issue",
      "category": "product_quality",
      "priority": "high",
      "status": "open",
      "created_at": "2025-12-01T10:00:00Z",
      "messages_count": 3
    }
  ]
}
```

---

#### 47. Create Ticket

**Endpoint:** `POST /api/v1/tickets`  
**Middleware:** `auth:sanctum`  
**Content-Type:** `multipart/form-data`

**Request:**

```
subject: "Product quality issue"
category: "product_quality"
priority: "high"
description: "Received damaged product"
order_id: 150 (optional)
attachments[]: [file1, file2] (optional)
```

**Validation:**

- `subject`: required, string, max:255
- `category`: required, in:order_issue,product_quality,delivery_problem,payment_issue,technical_issue,general_inquiry,suggestion,other
- `priority`: required, in:low,medium,high,urgent
- `description`: required, string
- `order_id`: nullable, exists:orders,id
- `attachments.*`: nullable, file, max:5MB, mimes:jpg,jpeg,png,pdf

**Response (201):**

```json
{
  "success": true,
  "message": "Ticket created successfully",
  "data": {
    "ticket": {
      "id": 50,
      "ticket_number": "TKT-20251201-456789",
      "subject": "Product quality issue",
      "status": "open"
    }
  }
}
```

---

#### 48. Get Ticket Details

**Endpoint:** `GET /api/v1/tickets/{id}`  
**Middleware:** `auth:sanctum`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 50,
    "ticket_number": "TKT-20251201-456789",
    "subject": "Product quality issue",
    "category": "product_quality",
    "priority": "high",
    "status": "open",
    "description": "Received damaged product",
    "order": {
      /* order details if applicable */
    },
    "messages": [
      {
        "id": 1,
        "user": {
          "first_name": "Ahmed"
        },
        "message": "I would like a replacement",
        "is_admin_reply": false,
        "created_at": "2025-12-01T10:30:00Z"
      },
      {
        "id": 2,
        "user": {
          "first_name": "Support"
        },
        "message": "We will process your request",
        "is_admin_reply": true,
        "created_at": "2025-12-01T11:00:00Z"
      }
    ],
    "attachments": [
      {
        "id": 1,
        "file_name": "damaged-product.jpg",
        "file_path": "url",
        "file_type": "image"
      }
    ],
    "created_at": "2025-12-01T10:00:00Z"
  }
}
```

---

#### 49. Reply to Ticket

**Endpoint:** `POST /api/v1/tickets/{id}/reply`  
**Middleware:** `auth:sanctum`

**Request Body:**

```json
{
  "message": "Thank you for the quick response"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Reply sent successfully"
}
```

---

#### 50. Close Ticket

**Endpoint:** `POST /api/v1/tickets/{id}/close`  
**Middleware:** `auth:sanctum`

**Response (200):**

```json
{
  "success": true,
  "message": "Ticket closed successfully"
}
```

---

### Notification Endpoints

#### 51. Register Device Token

**Endpoint:** `POST /api/v1/devices`  
**Middleware:** `auth:sanctum`  
**Description:** Save FCM token for push notifications

**Request Body:**

```json
{
  "token": "fcm_device_token_here",
  "platform": "ios"
}
```

**Validation:**

- `token`: required, string
- `platform`: required, in:ios,android

**Response (201):**

```json
{
  "success": true,
  "message": "Device token registered"
}
```

---

#### 52. Remove Device Token

**Endpoint:** `DELETE /api/v1/devices/{token}`  
**Middleware:** `auth:sanctum`

**Response (200):**

```json
{
  "success": true,
  "message": "Device token removed"
}
```

---

#### 53. List Notifications

**Endpoint:** `GET /api/v1/notifications`  
**Middleware:** `auth:sanctum`

**Query Parameters:**

```
?page=1
&per_page=20
&is_read=false
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "order_status",
      "title": "Order Delivered",
      "message": "Your order has been delivered",
      "is_read": false,
      "created_at": "2025-12-01T15:00:00Z"
    }
  ],
  "meta": {
    "unread_count": 5
  }
}
```

---

#### 54. Mark Notification as Read

**Endpoint:** `PUT /api/v1/notifications/{id}/read`  
**Middleware:** `auth:sanctum`

**Response (200):**

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### Banner & Promotion Endpoints

#### 55. List Banners

**Endpoint:** `GET /api/v1/banners`  
**Middleware:** `throttle:60,1`  
**Cache:** 1 hour

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title_en": "Summer Sale",
      "title_ar": "تخفيضات الصيف",
      "image": "https://cdn.elbaraka.com/banners/summer-sale.jpg",
      "link_type": "category",
      "link_value": "5",
      "sort_order": 1
    }
  ]
}
```

---

#### 56. List Promotions

**Endpoint:** `GET /api/v1/promotions`  
**Middleware:** `throttle:60,1`  
**Cache:** 30 minutes

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "code": "WELCOME20",
      "type": "percentage",
      "value": 20,
      "minimum_order": 100.0,
      "valid_until": "2025-12-31T23:59:59Z"
    }
  ]
}
```
---

## Admin Endpoints

**Base URL:** `/api/v1/admin`  
**Middleware:** `auth:sanctum, role:admin`

All admin endpoints are protected by role-based access control using the `role` ENUM field in users table.

### Admin Categories (with Subcategory Support)

**List All Categories (Hierarchical)**

```
GET    /api/v1/admin/categories
       Query: ?parent_id=1 (optional: filter by parent)
       Returns hierarchical tree with subcategories
```

**Create Category/Subcategory**

```
POST   /api/v1/admin/categories
       Body: {
         "parent_id": 1,  // NULL for main category, ID for subcategory
         "name_en": "Fresh Fruits",
         "name_ar": "فواكه طازجة",
         "slug": "fresh-fruits",
         "description_en": "...",
         "description_ar": "...",
         "image": "url",
         "icon": "🍓",
         "sort_order": 1,
         "is_active": true
       }
```

**Get Single Category with Subcategories**

```
GET    /api/v1/admin/categories/{id}
       Returns category with all its subcategories
```

**Update Category/Subcategory**

```
PUT    /api/v1/admin/categories/{id}
       Can change parent_id to move between main/sub categories
```

**Delete Category**

```
DELETE /api/v1/admin/categories/{id}
       If category has subcategories, either:
       - Prevent deletion (return error)
       - Move subcategories to parent (parent_id = deleted category's parent_id)
       - Delete all subcategories (cascade)
```

**Reorder Categories**

```
POST   /api/v1/admin/categories/reorder
       Body: {
         "items": [
           {"id": 1, "sort_order": 1},
           {"id": 2, "sort_order": 2}
         ]
       }
```

### Admin Brands

```
GET    /api/v1/admin/brands
POST   /api/v1/admin/brands
GET    /api/v1/admin/brands/{id}
PUT    /api/v1/admin/brands/{id}
DELETE /api/v1/admin/brands/{id}
```

### Admin Products

```
GET    /api/v1/admin/products
POST   /api/v1/admin/products
GET    /api/v1/admin/products/{id}
PUT    /api/v1/admin/products/{id}
DELETE /api/v1/admin/products/{id}
POST   /api/v1/admin/products/{id}/images
DELETE /api/v1/admin/products/{id}/images/{imageId}
```

### Admin Orders

```
GET    /api/v1/admin/orders
GET    /api/v1/admin/orders/{id}
PUT    /api/v1/admin/orders/{id}/status
POST   /api/v1/admin/orders/{id}/refund
```

### Admin Promo Codes

```
GET    /api/v1/admin/promo-codes
POST   /api/v1/admin/promo-codes
GET    /api/v1/admin/promo-codes/{id}
PUT    /api/v1/admin/promo-codes/{id}
DELETE /api/v1/admin/promo-codes/{id}
GET    /api/v1/admin/promo-codes/{id}/usage
```

### Admin Banners

```
GET    /api/v1/admin/banners
POST   /api/v1/admin/banners
GET    /api/v1/admin/banners/{id}
PUT    /api/v1/admin/banners/{id}
DELETE /api/v1/admin/banners/{id}
```

### Admin Complaints

```
GET    /api/v1/admin/tickets
GET    /api/v1/admin/tickets/{id}
PUT    /api/v1/admin/tickets/{id}/status
POST   /api/v1/admin/tickets/{id}/reply
POST   /api/v1/admin/tickets/{id}/assign
```

---

## Security Best Practices

### Critical Implementation Rules

1. **Token Lifetime**
   - Access token: 30 minutes
   - Refresh token: 30 days with rotation
   - Blacklist refresh tokens on logout

2. **Authentication**
   - NO Spatie Laravel Permission
   - Use simple `role` ENUM column (customer, admin)
   - Laravel Sanctum only

3. **API Versioning**
   - ALL routes under `/api/v1/`
   - NEVER use `/api/` without version

4. **Cart Merge on Login (MANDATORY)**

   ```php
   CartService@mergeGuestCart():
   1. Find cart by session_id
   2. Move all cart_items to user_id cart
   3. Delete guest cart
   4. Return merged cart
   ```

5. **Stock Deduction (NON-NEGOTIABLE)**
   - When order status changes to "preparing" or "out_for_delivery"
   - Decrement `product.stock_quantity`
   - Increment `product.sales_count`
   - ALL inside DB transaction
   - If `stock_quantity < low_stock_threshold`, send admin notification

6. **Paymob Webhook Security (EXACT CODE)**

   ```php
   $signature = hash_hmac('sha512', $payload, config('services.paymob.hmac'));
   if (!hash_equals($signature, $request->header('HMAC'))) {
       abort(403);
   }
   ```

7. **Price Locking in Cart**
   - ALL prices in `cart_items` are LOCKED at add time
   - Price comes from `products.sale_price` or `products.price`
   - Price in cart NEVER updates automatically

8. **File Storage**
   - Cloudinary for ALL images/videos
   - NEVER save in public folder
   - UUID filenames
   - Image optimization before upload

### Input Validation

- Use Laravel Form Request classes for ALL endpoints
- Validate ALL input data
- Sanitize user inputs (strip_tags, trim)
- Use prepared statements (Eloquent ORM)

### Rate Limiting

- Authentication endpoints: 10/minute
- General API: 60/minute
- Search: 30/minute
- Payment: 5/minute

### Password Security

- Minimum 8 characters
- bcrypt hashing (cost 12)
- Password reset OTP expires in 10 minutes
- Max 3 failed login attempts before temporary lockout 

### CORS Configuration

```php
'allowed_origins' => [
    'http://localhost:8081',  // Expo dev
    'exp://192.168.*.*:*',    // Expo LAN
    'capacitor://localhost',   // iOS
    'http://localhost',        // Android
],
```

---

## Total Endpoint Count: 74

**Customer Endpoints:** 57 (including subcategory support)  
**Admin Endpoints:** 17 (including admin category management with subcategories)

---

**END OF API DOCUMENTATION**
