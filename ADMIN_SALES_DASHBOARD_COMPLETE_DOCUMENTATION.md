# ELBARAKA - Admin & Sales Dashboard
## Complete Technical Documentation

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Core Technologies](#core-technologies)
4. [Authentication & Authorization](#authentication--authorization)
5. [Module 1: Product Management](#module-1-product-management)
6. [Module 2: Category Management](#module-2-category-management)
7. [Module 3: Order Management](#module-3-order-management)
8. [Module 4: Customer Support](#module-4-customer-support)
9. [Module 5: Financial Management](#module-5-financial-management)
10. [Module 6: User Management & Roles](#module-6-user-management--roles)
11. [Module 7: Analytics & Reporting](#module-7-analytics--reporting)
12. [Frontend Architecture](#frontend-architecture)
13. [Backend Architecture](#backend-architecture)
14. [API Specifications](#api-specifications)
15. [Database Schema](#database-schema)
16. [Security Protocols](#security-protocols)
17. [Deployment Guidelines](#deployment-guidelines)
18. [Testing Strategy](#testing-strategy)
19. [Appendices](#appendices)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Project Overview

**ELBARAKA Admin & Sales Dashboard** is an enterprise-grade web application designed to manage the complete operations of a hypermarket grocery delivery platform. This system serves as the central command center for administrators, sales managers, accountants, and customer support teams.

**Platform Type**: Web-based Admin Dashboard (Subdomain Architecture)  
**Target URL**: `admin.elbaraka.com` (separate from customer-facing mobile app)  
**Primary Users**: Internal staff (5 role types, 20-100 concurrent users)  
**Technology Stack**: Laravel backend + Modern Web Framework (React/Vue/Lovable)

### 1.2 Business Context

ELBARAKA operates in the competitive grocery delivery market alongside platforms like:
- **Carrefour** (France, global operations)
- **Talabat** (Middle East food delivery)
- **Instashop** (UAE grocery delivery)
- **Noon Daily** (UAE grocery)
- **Amazon Fresh** (Global grocery delivery)

**Market Requirements**:
- Real-time order processing (avg. 500 orders/day)
- Multi-role access control (5 distinct roles)
- Financial tracking (cash + online payments)
- Customer support ticketing system
- Inventory management (10,000+ SKUs)
- Analytics dashboard (real-time + historical)

### 1.3 Core Objectives

1. **Operational Efficiency**: Reduce order processing time by 40%
2. **Financial Transparency**: Real-time revenue tracking with daily reports
3. **Customer Satisfaction**: 24-hour support ticket response time
4. **Data-Driven Decisions**: 20+ analytics dashboards
5. **Scalability**: Support 10x growth without architecture changes

### 1.4 System Boundaries

**In Scope**:
- Complete CRUD for 8 core modules
- Role-based access control (5 roles)
- Real-time order tracking
- Financial reporting and reconciliation
- Customer support ticket system
- Product and inventory management
- Analytics and business intelligence

**Out of Scope**:
- Customer-facing mobile application (separate system)
- Third-party delivery driver app (future phase)
- Warehouse management system (future integration)
- AI-powered recommendations (future enhancement)

---

## 2. SYSTEM ARCHITECTURE

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ELBARAKA ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │   Mobile App     │              │  Admin Dashboard │    │
│  │  (iOS/Android)   │              │  (Web Browser)   │    │
│  │  React Native    │              │  React/Vue       │    │
│  └────────┬─────────┘              └────────┬─────────┘    │
│           │                                  │               │
│           │         ┌────────────────────────┘              │
│           │         │                                        │
│           ▼         ▼                                        │
│  ┌─────────────────────────────────────────────┐           │
│  │         Laravel REST API (v1)                │           │
│  │         http://api.elbaraka.com/api/v1       │           │
│  ├─────────────────────────────────────────────┤           │
│  │  Authentication  │  Orders    │  Products   │           │
│  │  (Sanctum)       │  Payments  │  Analytics  │           │
│  └──────────┬───────────────────────────────┬──┘           │
│             │                               │               │
│             ▼                               ▼               │
│  ┌──────────────────┐           ┌──────────────────┐       │
│  │   MySQL 8.0+     │◄─────────►│   Redis 6.2+     │       │
│  │  (Primary Store) │           │   (Cache/Queue)  │       │
│  └──────────────────┘           └──────────────────┘       │
│             │                                               │
│             ▼                                               │
│  ┌──────────────────┐           ┌──────────────────┐       │
│  │  File Storage    │           │  Paymob Gateway  │       │
│  │  (S3/Local)      │           │  (Payment API)   │       │
│  └──────────────────┘           └──────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Deployment Architecture

```
Internet
    │
    ▼
┌─────────────────────┐
│   Load Balancer     │ (Nginx/CloudFlare)
│   SSL Termination   │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌─────────┐
│  Web 1  │  │  Web 2  │ (Admin Dashboard Frontend)
└────┬────┘  └────┬────┘
     │            │
     └──────┬─────┘
            │
            ▼
    ┌───────────────┐
    │  API Gateway  │
    └───────┬───────┘
            │
     ┌──────┴──────┐
     │             │
     ▼             ▼
┌─────────┐  ┌─────────┐
│ API 1   │  │ API 2   │ (Laravel Backend)
└────┬────┘  └────┬────┘
     │            │
     └──────┬─────┘
            │
     ┌──────┴──────┐
     │             │
     ▼             ▼
┌─────────┐  ┌─────────┐
│ MySQL   │  │ Redis   │
│ Primary │  │ Cache   │
└─────────┘  └─────────┘
```

### 2.3 Component Interaction Flow

**Order Processing Example:**

```
Admin Dashboard
      │
      ├─► 1. GET /api/v1/admin/orders (List orders)
      │   ◄── Returns: Paginated order list
      │
      ├─► 2. GET /api/v1/admin/orders/{id} (View details)
      │   ◄── Returns: Order details with items
      │
      ├─► 3. PUT /api/v1/admin/orders/{id}/status
      │   │   Body: { "status": "confirmed" }
      │   ◄── Returns: Updated order
      │   │
      │   └─► Triggers: 
      │       - Update MySQL (orders table)
      │       - Invalidate Redis cache
      │       - Send push notification (Mobile App)
      │       - Create activity log entry
      │
      └─► 4. GET /api/v1/admin/analytics/orders
          ◄── Returns: Updated analytics
```

### 2.4 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Admin Dashboard UI                      │
│  Components: Tables, Forms, Charts, Modals              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              State Management Layer                      │
│  (Redux/Zustand/Context API)                            │
│  - User state, Orders cache, Filters, Pagination        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              API Service Layer                           │
│  axios/fetch with interceptors                          │
│  - Auth headers, Error handling, Retry logic            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼ HTTPS
┌─────────────────────────────────────────────────────────┐
│              Laravel API Routes                          │
│  Middleware: auth:sanctum, roles, throttle              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Controllers                                 │
│  Validate → Service → Resource → Response               │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  Service Layer   │  │  Repository Layer│
│  Business Logic  │  │  Data Access     │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
          ┌─────────────────┐
          │  Eloquent ORM   │
          └────────┬────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌─────────────┐      ┌─────────────┐
│   MySQL     │      │   Redis     │
│  Database   │      │   Cache     │
└─────────────┘      └─────────────┘
```

---

## 3. CORE TECHNOLOGIES

### 3.1 Backend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | Laravel | 11.x | PHP framework for RESTful APIs |
| **Language** | PHP | 8.2+ | Server-side programming |
| **Database** | MySQL | 8.0+ | Primary data store |
| **Cache** | Redis | 6.2+ | Session, cache, queue |
| **Authentication** | Laravel Sanctum | 4.x | API token authentication |
| **Queue** | Laravel Queue | 11.x | Async job processing |
| **File Storage** | Laravel Storage | 11.x | File uploads (S3/local) |
| **Payments** | Paymob API | 2.0 | Payment gateway integration |

### 3.2 Frontend Stack (Recommended)

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | React + TypeScript | 18.x | UI framework |
| **Build Tool** | Vite | 5.x | Fast bundler |
| **State Management** | Zustand / Redux Toolkit | Latest | Global state |
| **UI Library** | shadcn/ui + Tailwind CSS | Latest | Component library |
| **Data Fetching** | TanStack Query (React Query) | 5.x | API state management |
| **Forms** | React Hook Form | 7.x | Form validation |
| **Charts** | Recharts / ApexCharts | Latest | Data visualization |
| **Tables** | TanStack Table | 8.x | Data tables |
| **Icons** | Lucide React | Latest | Icon system |
| **Date Picker** | date-fns + react-datepicker | Latest | Date handling |

### 3.3 Development Tools

| Tool | Purpose |
|------|---------|
| **Postman** | API testing |
| **Laravel Telescope** | Debug & monitoring (dev only) |
| **Laravel Debugbar** | Performance profiling (dev only) |
| **Composer** | PHP dependency management |
| **NPM/Yarn** | JS dependency management |
| **Git** | Version control |
| **Docker** | Containerization (optional) |

### 3.4 Infrastructure Requirements

**Minimum Production Server Specs:**
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Network**: 1 Gbps
- **OS**: Ubuntu 22.04 LTS or CentOS 8+

**Database Server:**
- **MySQL**: 8.0+ with InnoDB engine
- **Redis**: 6.2+ with persistence enabled
- **Storage**: 50 GB minimum (scales with data)

---

## 4. AUTHENTICATION & AUTHORIZATION

### 4.1 Authentication Flow

```
┌────────────────────────────────────────────────────────────┐
│                 Admin Login Flow                            │
└────────────────────────────────────────────────────────────┘

Step 1: User enters credentials
  ┌──────────────┐
  │ Login Form   │
  │ - Email      │
  │ - Password   │
  └──────┬───────┘
         │
         ▼ POST /api/v1/admin/login
  ┌──────────────────────────────┐
  │ Laravel Authentication       │
  │ 1. Validate credentials      │
  │ 2. Check role = admin        │
  │ 3. Create Sanctum token      │
  │ 4. Return token + user data  │
  └──────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────┐
  │ Frontend receives:           │
  │ {                            │
  │   "token": "6|abc123...",    │
  │   "user": {                  │
  │     "id": 1,                 │
  │     "role": "super_admin",   │
  │     "permissions": [...]     │
  │   }                          │
  │ }                            │
  └──────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────┐
  │ Store token in:              │
  │ - localStorage (web)         │
  │ - httpOnly cookie (secure)   │
  └──────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────┐
  │ Subsequent API calls:        │
  │ Authorization: Bearer {token}│
  └──────────────────────────────┘
```

### 4.2 Role-Based Access Control (RBAC)

**5 Core Roles:**

| Role | Code | Description | Access Level |
|------|------|-------------|--------------|
| **Super Admin** | `super_admin` | Full system access | ALL modules (create, read, update, delete) |
| **Admin** | `admin` | General operations | All modules except user management |
| **Sales Manager** | `sales_manager` | Sales & orders | Orders, Products, Analytics (read/update) |
| **Accountant** | `accountant` | Financial operations | Financial module, Orders (read-only), Analytics |
| **Customer Support** | `customer_support` | Customer service | Customer Support, Orders (read-only), Customer data |

### 4.3 Permission Matrix

```
Module                    | Super Admin | Admin | Sales Mgr | Accountant | Support
--------------------------|-------------|-------|-----------|------------|--------
Products (Create)         |     ✅      |  ✅   |    ✅     |     ❌     |   ❌
Products (Edit)           |     ✅      |  ✅   |    ✅     |     ❌     |   ❌
Products (Delete)         |     ✅      |  ✅   |    ❌     |     ❌     |   ❌
Products (View)           |     ✅      |  ✅   |    ✅     |     ✅     |   ✅
--------------------------|-------------|-------|-----------|------------|--------
Categories (All CRUD)     |     ✅      |  ✅   |    ✅     |     ❌     |   ❌
--------------------------|-------------|-------|-----------|------------|--------
Orders (View)             |     ✅      |  ✅   |    ✅     |     ✅     |   ✅
Orders (Update Status)    |     ✅      |  ✅   |    ✅     |     ❌     |   ❌
Orders (Cancel)           |     ✅      |  ✅   |    ✅     |     ❌     |   ✅
Orders (Delete)           |     ✅      |  ❌   |    ❌     |     ❌     |   ❌
--------------------------|-------------|-------|-----------|------------|--------
Support Tickets (View)    |     ✅      |  ✅   |    ❌     |     ❌     |   ✅
Support Tickets (Reply)   |     ✅      |  ✅   |    ❌     |     ❌     |   ✅
Support Tickets (Close)   |     ✅      |  ✅   |    ❌     |     ❌     |   ✅
Support Tickets (Delete)  |     ✅      |  ❌   |    ❌     |     ❌     |   ❌
--------------------------|-------------|-------|-----------|------------|--------
Financial (View Reports)  |     ✅      |  ✅   |    ✅     |     ✅     |   ❌
Financial (Refunds)       |     ✅      |  ✅   |    ❌     |     ✅     |   ❌
Financial (Export)        |     ✅      |  ✅   |    ✅     |     ✅     |   ❌
--------------------------|-------------|-------|-----------|------------|--------
User Management (All)     |     ✅      |  ❌   |    ❌     |     ❌     |   ❌
--------------------------|-------------|-------|-----------|------------|--------
Analytics (View)          |     ✅      |  ✅   |    ✅     |     ✅     |   ✅
Analytics (Export)        |     ✅      |  ✅   |    ✅     |     ✅     |   ❌
```

### 4.4 Backend Implementation

**Database Schema (users table):**

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) NULL,
    role ENUM('customer', 'super_admin', 'admin', 'sales_manager', 
              'accountant', 'customer_support') DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role),
    INDEX idx_email (email)
);
```

**Laravel Middleware:**

```php
// app/Http/Middleware/CheckRole.php
public function handle($request, Closure $next, ...$roles)
{
    if (!$request->user() || !in_array($request->user()->role, $roles)) {
        return response()->json([
            'message' => 'Unauthorized access'
        ], 403);
    }
    
    return $next($request);
}

// Usage in routes/api.php
Route::middleware(['auth:sanctum', 'role:super_admin,admin'])
    ->group(function () {
        Route::apiResource('products', ProductController::class);
    });
```

### 4.5 Frontend Implementation

**Protected Route Component:**

```typescript
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Usage:
<ProtectedRoute allowedRoles={['super_admin', 'admin']}>
  <UserManagementPage />
</ProtectedRoute>
```

---

## 5. MODULE 1: PRODUCT MANAGEMENT

### 5.1 Overview

**Purpose**: Manage the complete product catalog including product details, pricing, stock, variants, images, and activation status.

**Database Tables**:
- `products` (primary table with 165 products in seed data)
- `categories` (hierarchical structure, 165 categories total)
- `product_categories` (many-to-many pivot)

**Key Features**:
- Create/Edit/Delete products
- Product variants (size, weight, unit)
- Bulk operations (import/export CSV)
- Image management (multiple images per product)
- Stock tracking
- Price management (regular + sale price)
- Product activation/deactivation

### 5.2 Database Schema

```sql
CREATE TABLE products (
    barcode BIGINT UNSIGNED PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    image VARCHAR(255) NULL,
    description_en TEXT NULL,
    description_ar TEXT NULL,
    price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2) NULL,
    cost_price DECIMAL(10, 2) NULL,
    stock_quantity INT DEFAULT 0,
    weight DECIMAL(8, 2) NULL COMMENT 'Weight in grams',
    unit VARCHAR(50) DEFAULT 'piece',
    nutrition_facts JSON NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sales_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_slug (slug),
    INDEX idx_is_active (is_active),
    INDEX idx_is_featured (is_featured),
    INDEX idx_price (price),
    INDEX idx_stock_quantity (stock_quantity),
    FULLTEXT idx_fulltext_search (name_en, name_ar, description_en, description_ar)
);
```

### 5.3 API Endpoints

#### 5.3.1 List Products (with filters, pagination, search)

**Endpoint**: `GET /api/v1/admin/products`

**Query Parameters**:
```typescript
interface ProductListParams {
  page?: number;          // Default: 1
  per_page?: number;      // Default: 20, Max: 100
  search?: string;        // Search in name_en, name_ar
  category_id?: number;   // Filter by category
  is_active?: boolean;    // Filter by active status
  is_featured?: boolean;  // Filter by featured status
  min_price?: number;     // Minimum price filter
  max_price?: number;     // Maximum price filter
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  sort_by?: 'name' | 'price' | 'stock' | 'created_at' | 'sales_count';
  sort_order?: 'asc' | 'desc';
}
```

**Response**:
```json
{
  "data": [
    {
      "barcode": 1001,
      "name_en": "Fresh Apples - Red Delicious",
      "name_ar": "تفاح أحمر طازج",
      "slug": "fresh-apples-red-delicious",
      "image": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6",
      "price": "25.00",
      "sale_price": "22.50",
      "cost_price": "15.00",
      "stock_quantity": 150,
      "unit": "kg",
      "is_featured": true,
      "is_active": true,
      "sales_count": 45,
      "categories": [
        { "id": 1, "name_en": "Fruits & Vegetables" },
        { "id": 18, "name_en": "Fresh Fruits" }
      ],
      "created_at": "2026-01-10T14:30:00Z",
      "updated_at": "2026-01-20T10:15:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 165,
    "last_page": 9,
    "from": 1,
    "to": 20
  },
  "links": {
    "first": "/api/v1/admin/products?page=1",
    "last": "/api/v1/admin/products?page=9",
    "prev": null,
    "next": "/api/v1/admin/products?page=2"
  }
}
```

**Backend Implementation**:

```php
// app/Http/Controllers/Admin/ProductController.php
public function index(Request $request)
{
    $query = Product::with('categories')
        ->select('products.*');
    
    // Search
    if ($search = $request->input('search')) {
        $query->where(function($q) use ($search) {
            $q->where('name_en', 'LIKE', "%{$search}%")
              ->orWhere('name_ar', 'LIKE', "%{$search}%")
              ->orWhere('barcode', 'LIKE', "%{$search}%");
        });
    }
    
    // Category filter
    if ($categoryId = $request->input('category_id')) {
        $query->whereHas('categories', function($q) use ($categoryId) {
            $q->where('categories.id', $categoryId);
        });
    }
    
    // Active status filter
    if ($request->has('is_active')) {
        $query->where('is_active', $request->boolean('is_active'));
    }
    
    // Featured filter
    if ($request->has('is_featured')) {
        $query->where('is_featured', $request->boolean('is_featured'));
    }
    
    // Price range
    if ($minPrice = $request->input('min_price')) {
        $query->where('price', '>=', $minPrice);
    }
    if ($maxPrice = $request->input('max_price')) {
        $query->where('price', '<=', $maxPrice);
    }
    
    // Stock status
    if ($stockStatus = $request->input('stock_status')) {
        switch ($stockStatus) {
            case 'out_of_stock':
                $query->where('stock_quantity', '<=', 0);
                break;
            case 'low_stock':
                $query->whereBetween('stock_quantity', [1, 10]);
                break;
            case 'in_stock':
                $query->where('stock_quantity', '>', 10);
                break;
        }
    }
    
    // Sorting
    $sortBy = $request->input('sort_by', 'created_at');
    $sortOrder = $request->input('sort_order', 'desc');
    $query->orderBy($sortBy, $sortOrder);
    
    // Pagination
    $perPage = min($request->input('per_page', 20), 100);
    
    return ProductResource::collection(
        $query->paginate($perPage)
    );
}
```

#### 5.3.2 Get Single Product

**Endpoint**: `GET /api/v1/admin/products/{barcode}`

**Response**:
```json
{
  "data": {
    "barcode": 1001,
    "name_en": "Fresh Apples - Red Delicious",
    "name_ar": "تفاح أحمر طازج",
    "slug": "fresh-apples-red-delicious",
    "image": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6",
    "description_en": "Crispy and sweet red delicious apples...",
    "description_ar": "تفاح أحمر مقرمش وحلو...",
    "price": "25.00",
    "sale_price": "22.50",
    "cost_price": "15.00",
    "stock_quantity": 150,
    "weight": 1000,
    "unit": "kg",
    "nutrition_facts": null,
    "is_featured": true,
    "is_active": true,
    "sales_count": 45,
    "categories": [
      {
        "id": 1,
        "name_en": "Fruits & Vegetables",
        "name_ar": "الفواكه والخضروات"
      },
      {
        "id": 18,
        "name_en": "Fresh Fruits",
        "name_ar": "الفواكه الطازجة"
      }
    ],
    "created_at": "2026-01-10T14:30:00Z",
    "updated_at": "2026-01-20T10:15:00Z"
  }
}
```

#### 5.3.3 Create Product

**Endpoint**: `POST /api/v1/admin/products`

**Authorization**: `super_admin`, `admin`, `sales_manager`

**Request Body**:
```json
{
  "barcode": 1234567890123,
  "name_en": "Organic Honey 500g",
  "name_ar": "عسل عضوي 500 جم",
  "slug": "organic-honey-500g",
  "description_en": "Pure organic honey from local farms",
  "description_ar": "عسل عضوي نقي من المزارع المحلية",
  "price": 85.00,
  "sale_price": 79.00,
  "cost_price": 55.00,
  "stock_quantity": 50,
  "weight": 500,
  "unit": "piece",
  "is_featured": true,
  "is_active": true,
  "category_ids": [1, 18],
  "image": "base64_encoded_image_or_url"
}
```

**Validation Rules**:
```php
// app/Http/Requests/StoreProductRequest.php
public function rules()
{
    return [
        'barcode' => 'required|integer|unique:products,barcode',
        'name_en' => 'required|string|max:255',
        'name_ar' => 'required|string|max:255',
        'slug' => 'required|string|max:255|unique:products,slug',
        'description_en' => 'nullable|string',
        'description_ar' => 'nullable|string',
        'price' => 'required|numeric|min:0',
        'sale_price' => 'nullable|numeric|min:0|lt:price',
        'cost_price' => 'nullable|numeric|min:0',
        'stock_quantity' => 'required|integer|min:0',
        'weight' => 'nullable|numeric|min:0',
        'unit' => 'required|string|in:piece,kg,liter,gram,ml',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'category_ids' => 'required|array|min:1',
        'category_ids.*' => 'exists:categories,id',
        'image' => 'nullable|string',
    ];
}
```

**Response**: (201 Created)
```json
{
  "message": "Product created successfully",
  "data": { /* full product object */ }
}
```

#### 5.3.4 Update Product

**Endpoint**: `PUT /api/v1/admin/products/{barcode}`

**Request Body**: Same as create, all fields optional

**Response**: (200 OK)
```json
{
  "message": "Product updated successfully",
  "data": { /* updated product object */ }
}
```

#### 5.3.5 Delete Product

**Endpoint**: `DELETE /api/v1/admin/products/{barcode}`

**Authorization**: `super_admin`, `admin`

**Response**: (200 OK)
```json
{
  "message": "Product deleted successfully"
}
```

#### 5.3.6 Bulk Operations

**Bulk Update Stock**:
```
POST /api/v1/admin/products/bulk/update-stock
Body: {
  "products": [
    { "barcode": 1001, "stock_quantity": 200 },
    { "barcode": 1002, "stock_quantity": 150 }
  ]
}
```

**Bulk Activate/Deactivate**:
```
POST /api/v1/admin/products/bulk/toggle-status
Body: {
  "barcodes": [1001, 1002, 1003],
  "is_active": false
}
```

**Import from CSV**:
```
POST /api/v1/admin/products/import
Content-Type: multipart/form-data
Body: file=products.csv
```

**Export to CSV**:
```
GET /api/v1/admin/products/export?filters={...}
Response: products_export_2026_01_25.csv
```

### 5.4 Frontend Pages

#### 5.4.1 Products List Page

**Route**: `/admin/products`

**Components**:
- **DataTable** with columns:
  - Barcode
  - Image (thumbnail)
  - Name (English + Arabic)
  - Categories (badges)
  - Price (with sale price indicator)
  - Stock Quantity (color-coded: green > 10, orange 1-10, red 0)
  - Status (Active/Inactive toggle)
  - Featured (star icon toggle)
  - Actions (Edit, Delete, View)

- **Filters Sidebar**:
  - Search by name/barcode
  - Category dropdown (multi-select)
  - Price range slider
  - Stock status (In Stock, Low Stock, Out of Stock)
  - Active status checkbox
  - Featured checkbox

- **Toolbar**:
  - "Add New Product" button
  - "Import CSV" button
  - "Export CSV" button
  - "Bulk Actions" dropdown (Activate, Deactivate, Delete)

- **Pagination**:
  - Items per page selector (20, 50, 100)
  - Page navigation

**State Management**:
```typescript
interface ProductsPageState {
  products: Product[];
  filters: ProductFilters;
  pagination: PaginationMeta;
  selectedProducts: number[];
  isLoading: boolean;
  error: string | null;
}
```

#### 5.4.2 Add/Edit Product Page

**Route**: `/admin/products/new` or `/admin/products/{barcode}/edit`

**Form Sections**:

1. **Basic Information**
   - Barcode (read-only on edit)
   - Name (English)
   - Name (Arabic)
   - Slug (auto-generated, editable)

2. **Categories**
   - Multi-select dropdown with hierarchical display
   - Search categories

3. **Description**
   - Rich text editor (English)
   - Rich text editor (Arabic)

4. **Pricing**
   - Regular Price
   - Sale Price (optional)
   - Cost Price (optional)
   - Profit Margin (calculated)

5. **Inventory**
   - Stock Quantity
   - Unit (dropdown: piece, kg, liter, gram, ml)
   - Weight (optional, in grams)

6. **Media**
   - Image upload (drag & drop or browse)
   - Image preview
   - Replace image option

7. **Settings**
   - Is Featured (checkbox)
   - Is Active (checkbox)

8. **Nutrition Facts** (Optional, JSON editor or structured form)
   - Calories
   - Protein
   - Carbs
   - Fat
   - Sodium
   - Sugar

**Validation**:
- Real-time validation on blur
- Display validation errors below fields
- Disable submit button if invalid

**Actions**:
- Save button (creates or updates)
- Save & Add Another (on create)
- Cancel button (navigate back)

### 5.5 Frontend Implementation Example

```typescript
// pages/admin/products/index.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/DataTable';
import { ProductFilters } from '@/components/products/ProductFilters';
import { productsApi } from '@/services/api/productsApi';

export default function ProductsListPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    per_page: 20,
  });

  // Fetch products
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-products', filters],
    queryFn: () => productsApi.getProducts(filters),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (barcode: number) => productsApi.deleteProduct(barcode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted successfully');
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ barcode, isActive }: { barcode: number; isActive: boolean }) =>
      productsApi.updateProduct(barcode, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const columns = [
    {
      accessorKey: 'barcode',
      header: 'Barcode',
    },
    {
      accessorKey: 'image',
      header: 'Image',
      cell: ({ row }) => (
        <img
          src={row.original.image}
          alt={row.original.name_en}
          className="w-12 h-12 object-cover rounded"
        />
      ),
    },
    {
      accessorKey: 'name_en',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name_en}</div>
          <div className="text-sm text-gray-500">{row.original.name_ar}</div>
        </div>
      ),
    },
    {
      accessorKey: 'categories',
      header: 'Categories',
      cell: ({ row }) => (
        <div className="flex gap-1 flex-wrap">
          {row.original.categories.map((cat) => (
            <span key={cat.id} className="badge badge-sm">
              {cat.name_en}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-green-600">
            {row.original.sale_price || row.original.price} EGP
          </div>
          {row.original.sale_price && (
            <div className="text-sm line-through text-gray-400">
              {row.original.price} EGP
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'stock_quantity',
      header: 'Stock',
      cell: ({ row }) => {
        const stock = row.original.stock_quantity;
        const color =
          stock > 10 ? 'text-green-600' : stock > 0 ? 'text-orange-600' : 'text-red-600';
        return <span className={color}>{stock}</span>;
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Switch
          checked={row.original.is_active}
          onCheckedChange={(checked) =>
            toggleStatusMutation.mutate({
              barcode: row.original.barcode,
              isActive: checked,
            })
          }
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/admin/products/${row.original.barcode}/edit`}>
              Edit
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => deleteMutation.mutate(row.original.barcode)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/admin/products/new">Add Product</Link>
          </Button>
          <Button variant="outline">Import CSV</Button>
          <Button variant="outline">Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="md:col-span-1">
          <ProductFilters filters={filters} onFiltersChange={setFilters} />
        </aside>

        <main className="md:col-span-3">
          <DataTable
            columns={columns}
            data={data?.data || []}
            pagination={data?.meta}
            onPaginationChange={(page) => setFilters({ ...filters, page })}
            isLoading={isLoading}
          />
        </main>
      </div>
    </div>
  );
}
```

---

## 6. MODULE 2: CATEGORY MANAGEMENT

### 6.1 Overview

**Purpose**: Manage product categories in a hierarchical structure (parent categories + subcategories) with ordering, visibility, and product assignment.

**Database Tables**:
- `categories` (self-referencing with parent_id)
- `product_categories` (pivot table)

**Key Features**:
- Create/Edit/Delete categories
- Hierarchical structure (parent → subcategories → products)
- Drag-and-drop ordering
- Category images and icons
- Bulk assignment of products
- Category activation/deactivation

### 6.2 Database Schema

```sql
CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT UNSIGNED NULL COMMENT 'NULL for main categories',
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description_en TEXT NULL,
    description_ar TEXT NULL,
    image VARCHAR(255) NULL,
    icon VARCHAR(255) NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_parent_id (parent_id),
    INDEX idx_slug (slug),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order)
);

CREATE TABLE product_categories (
    product_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, category_id),
    FOREIGN KEY (product_id) REFERENCES products(barcode) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_category_id (category_id)
);
```

### 6.3 API Endpoints

#### 6.3.1 List Categories (Hierarchical Tree)

**Endpoint**: `GET /api/v1/admin/categories`

**Query Parameters**:
```typescript
interface CategoryListParams {
  include_products_count?: boolean; // Default: true
  include_subcategories?: boolean;  // Default: true
  only_root?: boolean;              // Only parent categories
  is_active?: boolean;
  search?: string;
}
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "parent_id": null,
      "name_en": "Fruits & Vegetables",
      "name_ar": "الفواكه والخضروات",
      "slug": "fruits-vegetables",
      "description_en": null,
      "description_ar": null,
      "image": "https://example.com/images/fruits-veg.jpg",
      "icon": "🍎",
      "sort_order": 1,
      "is_active": true,
      "products_count": 45,
      "subcategories": [
        {
          "id": 18,
          "parent_id": 1,
          "name_en": "Fresh Fruits",
          "name_ar": "الفواكه الطازجة",
          "slug": "fresh-fruits",
          "sort_order": 1,
          "is_active": true,
          "products_count": 20,
          "subcategories": []
        },
        {
          "id": 19,
          "parent_id": 1,
          "name_en": "Fresh Vegetables",
          "name_ar": "الخضروات الطازجة",
          "slug": "fresh-vegetables",
          "sort_order": 2,
          "is_active": true,
          "products_count": 25,
          "subcategories": []
        }
      ],
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-20T10:00:00Z"
    }
  ]
}
```

**Backend Implementation**:

```php
// app/Http/Controllers/Admin/CategoryController.php
public function index(Request $request)
{
    $query = Category::query();
    
    // Only root categories
    if ($request->boolean('only_root')) {
        $query->whereNull('parent_id');
    }
    
    // Active filter
    if ($request->has('is_active')) {
        $query->where('is_active', $request->boolean('is_active'));
    }
    
    // Search
    if ($search = $request->input('search')) {
        $query->where(function($q) use ($search) {
            $q->where('name_en', 'LIKE', "%{$search}%")
              ->orWhere('name_ar', 'LIKE', "%{$search}%");
        });
    }
    
    // Order by sort_order
    $query->orderBy('sort_order', 'asc');
    
    // Load subcategories and product counts
    if ($request->boolean('include_subcategories', true)) {
        $query->with(['subcategories' => function($q) {
            $q->orderBy('sort_order', 'asc');
        }]);
    }
    
    if ($request->boolean('include_products_count', true)) {
        $query->withCount('products');
    }
    
    return CategoryResource::collection($query->get());
}
```

#### 6.3.2 Get Single Category

**Endpoint**: `GET /api/v1/admin/categories/{id}`

**Query Parameters**:
- `include_products=true` - Include products list

**Response**:
```json
{
  "data": {
    "id": 1,
    "parent_id": null,
    "name_en": "Fruits & Vegetables",
    "name_ar": "الفواكه والخضروات",
    "slug": "fruits-vegetables",
    "description_en": "Fresh fruits and vegetables...",
    "description_ar": "فواكه وخضروات طازجة...",
    "image": "https://example.com/images/fruits-veg.jpg",
    "icon": "🍎",
    "sort_order": 1,
    "is_active": true,
    "products_count": 45,
    "subcategories_count": 4,
    "products": [
      { /* product object */ }
    ],
    "subcategories": [
      { /* subcategory object */ }
    ]
  }
}
```

#### 6.3.3 Create Category

**Endpoint**: `POST /api/v1/admin/categories`

**Authorization**: `super_admin`, `admin`, `sales_manager`

**Request Body**:
```json
{
  "parent_id": null,
  "name_en": "Organic Products",
  "name_ar": "منتجات عضوية",
  "slug": "organic-products",
  "description_en": "Certified organic products",
  "description_ar": "منتجات عضوية معتمدة",
  "image": "base64_or_url",
  "icon": "🌱",
  "sort_order": 10,
  "is_active": true
}
```

**Validation**:
```php
return [
    'parent_id' => 'nullable|exists:categories,id',
    'name_en' => 'required|string|max:255',
    'name_ar' => 'required|string|max:255',
    'slug' => 'required|string|max:255|unique:categories,slug',
    'description_en' => 'nullable|string',
    'description_ar' => 'nullable|string',
    'image' => 'nullable|string',
    'icon' => 'nullable|string|max:10',
    'sort_order' => 'integer|min:0',
    'is_active' => 'boolean',
];
```

#### 6.3.4 Update Category

**Endpoint**: `PUT /api/v1/admin/categories/{id}`

**Request Body**: Same as create, all fields optional

**Response**: (200 OK)
```json
{
  "message": "Category updated successfully",
  "data": { /* updated category */ }
}
```

#### 6.3.5 Delete Category

**Endpoint**: `DELETE /api/v1/admin/categories/{id}`

**Authorization**: `super_admin`, `admin`

**Behavior**:
- If category has products: Return error (must reassign products first)
- If category has subcategories: Return error OR delete cascade

**Response**: (200 OK)
```json
{
  "message": "Category deleted successfully"
}
```

#### 6.3.6 Reorder Categories

**Endpoint**: `POST /api/v1/admin/categories/reorder`

**Request Body**:
```json
{
  "orders": [
    { "id": 1, "sort_order": 0 },
    { "id": 2, "sort_order": 1 },
    { "id": 3, "sort_order": 2 }
  ]
}
```

**Response**:
```json
{
  "message": "Categories reordered successfully"
}
```

#### 6.3.7 Assign Products to Category

**Endpoint**: `POST /api/v1/admin/categories/{id}/products`

**Request Body**:
```json
{
  "product_ids": [1001, 1002, 1003],
  "action": "add" // or "remove" or "replace"
}
```

**Response**:
```json
{
  "message": "Products assigned successfully",
  "data": {
    "category_id": 1,
    "products_count": 48
  }
}
```

### 6.4 Frontend Pages

#### 6.4.1 Categories List Page (Tree View)

**Route**: `/admin/categories`

**Components**:

- **Tree View**:
  - Hierarchical tree structure
  - Expand/collapse subcategories
  - Drag & drop to reorder
  - Inline edit category name
  - Color-coded icons for parent/child

- **Category Card** (for each node):
  - Category icon
  - Name (English + Arabic)
  - Product count badge
  - Active/Inactive toggle
  - Actions dropdown (Edit, Add Subcategory, Delete)

- **Toolbar**:
  - "Add Root Category" button
  - Search categories
  - Filter by active status
  - View mode toggle (Tree / Grid / List)

**State Management**:
```typescript
interface CategoriesPageState {
  categories: CategoryTree[];
  expandedNodes: number[];
  selectedCategory: number | null;
  isReordering: boolean;
}

interface CategoryTree {
  id: number;
  name_en: string;
  name_ar: string;
  icon: string;
  products_count: number;
  is_active: boolean;
  subcategories: CategoryTree[];
}
```

#### 6.4.2 Add/Edit Category Modal

**Components**:

1. **Basic Info Tab**
   - Parent Category (dropdown, null for root)
   - Name (English)
   - Name (Arabic)
   - Slug (auto-generated)

2. **Description Tab**
   - Description (English, rich text)
   - Description (Arabic, rich text)

3. **Media Tab**
   - Category Image (upload)
   - Icon (emoji picker or upload)

4. **Settings Tab**
   - Sort Order (number input)
   - Is Active (toggle)

5. **Products Tab** (on edit only)
   - Assign products (multi-select with search)
   - Current products list

**Actions**:
- Save
- Save & Add Another
- Cancel

### 6.5 Frontend Implementation Example

```typescript
// pages/admin/categories/index.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, PointerSensor, useSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CategoryTreeView } from '@/components/categories/CategoryTreeView';
import { categoriesApi } from '@/services/api/categoriesApi';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [expandedNodes, setExpandedNodes] = useState<number[]>([]);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => categoriesApi.getCategories({ include_subcategories: true }),
  });

  const reorderMutation = useMutation({
    mutationFn: (orders: { id: number; sort_order: number }[]) =>
      categoriesApi.reorderCategories(orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Categories reordered successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    },
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);
      
      const reordered = arrayMove(categories, oldIndex, newIndex);
      const orders = reordered.map((cat, index) => ({
        id: cat.id,
        sort_order: index,
      }));
      
      reorderMutation.mutate(orders);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <Button asChild>
          <Link to="/admin/categories/new">Add Root Category</Link>
        </Button>
      </div>

      <DndContext
        sensors={[useSensor(PointerSensor)]}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories?.map((cat) => cat.id) || []}
          strategy={verticalListSortingStrategy}
        >
          <CategoryTreeView
            categories={categories || []}
            expandedNodes={expandedNodes}
            onToggleExpand={(id) => {
              setExpandedNodes((prev) =>
                prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
              );
            }}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

---

## 7. MODULE 3: ORDER MANAGEMENT

### 7.1 Overview

**Purpose**: Manage customer orders through their complete lifecycle from placement to delivery, including status tracking, cancellations, refunds, and order history.

**Database Tables**:
- `orders` (main order data)
- `order_items` (products in each order)
- `payment_transactions` (payment records)
- `paymob_payments` (Paymob-specific tracking)

**Key Features**:
- View all orders with advanced filtering
- Order detail view with timeline
- Update order status manually
- Cancel orders with reason tracking
- Process refunds
- Print invoices/receipts
- Export orders to CSV/Excel
- Real-time order notifications

### 7.2 Order Status Lifecycle

```
┌──────────┐
│ PENDING  │ ← Order created, payment pending
└────┬─────┘
     │
     ▼
┌──────────┐
│CONFIRMED │ ← Payment confirmed, order accepted
└────┬─────┘
     │
     ▼
┌──────────┐
│PREPARING │ ← Items being packed
└────┬─────┘
     │
     ▼
┌──────────────┐
│OUT_FOR_DELIVERY│ ← Driver assigned, on route
└────┬──────────┘
     │
     ├─► ┌──────────┐
     │   │DELIVERED │ ← Successfully delivered
     │   └──────────┘
     │
     └─► ┌──────────┐
         │CANCELLED │ ← Cancelled by user or admin
         └──────────┘
         
         ┌─────────┐
         │ FAILED  │ ← Payment or system error
         └─────────┘
```

### 7.3 Database Schema

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('pending', 'confirmed', 'preparing', 'out_for_delivery', 
                'delivered', 'cancelled', 'failed') DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    tax DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash_on_delivery', 'card', 'wallet') NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    delivery_address_id BIGINT UNSIGNED NOT NULL,
    delivery_date DATE NULL,
    delivery_time_slot VARCHAR(50) NULL,
    notes TEXT NULL,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (delivery_address_id) REFERENCES addresses(id) ON DELETE RESTRICT,
    INDEX idx_user_id (user_id),
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at),
    INDEX idx_delivery_date (delivery_date)
);

CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(barcode) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
);
```

### 7.4 API Endpoints

#### 7.4.1 List Orders

**Endpoint**: `GET /api/v1/admin/orders`

**Query Parameters**:
```typescript
interface OrderListParams {
  page?: number;
  per_page?: number;
  search?: string;          // Search in order_number, customer name
  status?: OrderStatus | OrderStatus[];
  payment_status?: PaymentStatus | PaymentStatus[];
  payment_method?: 'cash_on_delivery' | 'card' | 'wallet';
  date_from?: string;       // ISO date
  date_to?: string;         // ISO date
  min_total?: number;
  max_total?: number;
  sort_by?: 'created_at' | 'total' | 'order_number';
  sort_order?: 'asc' | 'desc';
}

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 
                   'out_for_delivery' | 'delivered' | 'cancelled' | 'failed';
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "order_number": "ORD-2026-001",
      "status": "delivered",
      "payment_status": "completed",
      "payment_method": "card",
      "customer": {
        "id": 2,
        "first_name": "Ahmed",
        "last_name": "Mohamed",
        "email": "ahmed@example.com",
        "phone": "+201111111111"
      },
      "delivery_address": {
        "label": "Home",
        "street": "15 Tahrir Street, Apartment 5",
        "city": "Cairo"
      },
      "subtotal": "250.00",
      "delivery_fee": "20.00",
      "discount": "0.00",
      "tax": "35.00",
      "total": "305.00",
      "items_count": 5,
      "delivery_date": "2026-01-15",
      "delivery_time_slot": "9AM-12PM",
      "created_at": "2026-01-10T14:30:00Z",
      "updated_at": "2026-01-15T11:20:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 150,
    "last_page": 8
  },
  "summary": {
    "total_orders": 150,
    "total_revenue": "45,250.00",
    "pending_count": 12,
    "confirmed_count": 8,
    "preparing_count": 15,
    "out_for_delivery_count": 10,
    "delivered_count": 95,
    "cancelled_count": 10
  }
}
```

**Backend Implementation**:

```php
// app/Http/Controllers/Admin/OrderController.php
public function index(Request $request)
{
    $query = Order::with(['user', 'deliveryAddress', 'items'])
        ->select('orders.*');
    
    // Search by order number or customer name
    if ($search = $request->input('search')) {
        $query->where(function($q) use ($search) {
            $q->where('order_number', 'LIKE', "%{$search}%")
              ->orWhereHas('user', function($userQuery) use ($search) {
                  $userQuery->where('first_name', 'LIKE', "%{$search}%")
                           ->orWhere('last_name', 'LIKE', "%{$search}%")
                           ->orWhere('email', 'LIKE', "%{$search}%");
              });
        });
    }
    
    // Status filter (single or array)
    if ($status = $request->input('status')) {
        if (is_array($status)) {
            $query->whereIn('status', $status);
        } else {
            $query->where('status', $status);
        }
    }
    
    // Payment status filter
    if ($paymentStatus = $request->input('payment_status')) {
        if (is_array($paymentStatus)) {
            $query->whereIn('payment_status', $paymentStatus);
        } else {
            $query->where('payment_status', $paymentStatus);
        }
    }
    
    // Payment method filter
    if ($paymentMethod = $request->input('payment_method')) {
        $query->where('payment_method', $paymentMethod);
    }
    
    // Date range filter
    if ($dateFrom = $request->input('date_from')) {
        $query->whereDate('created_at', '>=', $dateFrom);
    }
    if ($dateTo = $request->input('date_to')) {
        $query->whereDate('created_at', '<=', $dateTo);
    }
    
    // Total amount filter
    if ($minTotal = $request->input('min_total')) {
        $query->where('total', '>=', $minTotal);
    }
    if ($maxTotal = $request->input('max_total')) {
        $query->where('total', '<=', $maxTotal);
    }
    
    // Sorting
    $sortBy = $request->input('sort_by', 'created_at');
    $sortOrder = $request->input('sort_order', 'desc');
    $query->orderBy($sortBy, $sortOrder);
    
    // Pagination
    $perPage = min($request->input('per_page', 20), 100);
    $orders = $query->paginate($perPage);
    
    // Calculate summary statistics
    $summary = [
        'total_orders' => Order::count(),
        'total_revenue' => Order::where('payment_status', 'completed')->sum('total'),
        'pending_count' => Order::where('status', 'pending')->count(),
        'confirmed_count' => Order::where('status', 'confirmed')->count(),
        'preparing_count' => Order::where('status', 'preparing')->count(),
        'out_for_delivery_count' => Order::where('status', 'out_for_delivery')->count(),
        'delivered_count' => Order::where('status', 'delivered')->count(),
        'cancelled_count' => Order::where('status', 'cancelled')->count(),
    ];
    
    return response()->json([
        'data' => OrderResource::collection($orders),
        'meta' => [
            'current_page' => $orders->currentPage(),
            'per_page' => $orders->perPage(),
            'total' => $orders->total(),
            'last_page' => $orders->lastPage(),
        ],
        'summary' => $summary,
    ]);
}
```

#### 7.4.2 Get Order Details

**Endpoint**: `GET /api/v1/admin/orders/{id}`

**Response**:
```json
{
  "data": {
    "id": 1,
    "order_number": "ORD-2026-001",
    "status": "delivered",
    "payment_status": "completed",
    "payment_method": "card",
    "customer": {
      "id": 2,
      "first_name": "Ahmed",
      "last_name": "Mohamed",
      "email": "ahmed@example.com",
      "phone": "+201111111111",
      "avatar": "https://example.com/avatars/ahmed.jpg"
    },
    "delivery_address": {
      "id": 1,
      "label": "Home",
      "street": "15 Tahrir Street, Apartment 5, Floor 3",
      "city": "Cairo"
    },
    "items": [
      {
        "id": 1,
        "product_id": 1001,
        "product_name": "Fresh Apples - Red Delicious",
        "product_sku": "SKU-1001",
        "quantity": 2,
        "price": "25.00",
        "subtotal": "50.00",
        "product": {
          "barcode": 1001,
          "image": "https://example.com/products/1001.jpg",
          "current_stock": 150
        }
      },
      {
        "id": 2,
        "product_id": 2001,
        "product_name": "Fresh Whole Milk 1L",
        "product_sku": "SKU-2001",
        "quantity": 3,
        "price": "22.00",
        "subtotal": "66.00",
        "product": {
          "barcode": 2001,
          "image": "https://example.com/products/2001.jpg",
          "current_stock": 180
        }
      }
    ],
    "subtotal": "250.00",
    "delivery_fee": "20.00",
    "discount": "0.00",
    "tax": "35.00",
    "total": "305.00",
    "delivery_date": "2026-01-15",
    "delivery_time_slot": "9AM-12PM",
    "notes": "Please call before delivery",
    "status_history": [
      {
        "status": "pending",
        "timestamp": "2026-01-10T14:30:00Z",
        "user": "System"
      },
      {
        "status": "confirmed",
        "timestamp": "2026-01-10T14:35:00Z",
        "user": "Admin (admin@elbaraka.com)"
      },
      {
        "status": "preparing",
        "timestamp": "2026-01-11T09:00:00Z",
        "user": "Admin (admin@elbaraka.com)"
      },
      {
        "status": "out_for_delivery",
        "timestamp": "2026-01-15T08:00:00Z",
        "user": "Admin (admin@elbaraka.com)"
      },
      {
        "status": "delivered",
        "timestamp": "2026-01-15T11:20:00Z",
        "user": "Admin (admin@elbaraka.com)"
      }
    ],
    "payment_transaction": {
      "id": 1,
      "transaction_id": "paymob_txn_12345",
      "amount": "305.00",
      "status": "completed",
      "processed_at": "2026-01-10T14:32:00Z"
    },
    "created_at": "2026-01-10T14:30:00Z",
    "updated_at": "2026-01-15T11:20:00Z"
  }
}
```

#### 7.4.3 Update Order Status

**Endpoint**: `PUT /api/v1/admin/orders/{id}/status`

**Authorization**: `super_admin`, `admin`, `sales_manager`

**Request Body**:
```json
{
  "status": "confirmed",
  "notes": "Order confirmed, preparing items"
}
```

**Validation**:
```php
return [
    'status' => 'required|in:pending,confirmed,preparing,out_for_delivery,delivered,cancelled,failed',
    'notes' => 'nullable|string|max:500',
];
```

**Business Rules**:
- Cannot change status from `delivered` to any other status
- Cannot change status from `cancelled` to any other status except `pending`
- Status progression must be logical (pending → confirmed → preparing → out_for_delivery → delivered)
- Changing to `delivered` requires delivery confirmation
- Changing to `cancelled` requires cancellation_reason

**Response**:
```json
{
  "message": "Order status updated successfully",
  "data": {
    "id": 1,
    "status": "confirmed",
    "updated_at": "2026-01-10T14:35:00Z"
  }
}
```

**Backend Implementation**:

```php
public function updateStatus(Request $request, $id)
{
    $validated = $request->validate([
        'status' => 'required|in:pending,confirmed,preparing,out_for_delivery,delivered,cancelled,failed',
        'notes' => 'nullable|string|max:500',
    ]);
    
    $order = Order::findOrFail($id);
    
    // Business rule: Cannot update delivered or cancelled orders
    if (in_array($order->status, ['delivered', 'cancelled']) && $validated['status'] !== $order->status) {
        return response()->json([
            'message' => 'Cannot update status of delivered or cancelled orders'
        ], 422);
    }
    
    $oldStatus = $order->status;
    $order->status = $validated['status'];
    $order->save();
    
    // Log status change in activity log
    activity()
        ->performedOn($order)
        ->causedBy(auth()->user())
        ->withProperties([
            'old_status' => $oldStatus,
            'new_status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
        ])
        ->log('order_status_updated');
    
    // Send notification to customer
    $order->user->notify(new OrderStatusUpdated($order));
    
    return response()->json([
        'message' => 'Order status updated successfully',
        'data' => new OrderResource($order),
    ]);
}
```

#### 7.4.4 Cancel Order

**Endpoint**: `POST /api/v1/admin/orders/{id}/cancel`

**Authorization**: `super_admin`, `admin`, `sales_manager`, `customer_support`

**Request Body**:
```json
{
  "cancellation_reason": "Customer requested cancellation",
  "refund": true
}
```

**Response**:
```json
{
  "message": "Order cancelled successfully",
  "data": {
    "id": 1,
    "status": "cancelled",
    "payment_status": "refunded",
    "cancelled_at": "2026-01-10T15:00:00Z",
    "cancellation_reason": "Customer requested cancellation"
  }
}
```

**Backend Implementation**:

```php
public function cancel(Request $request, $id)
{
    $validated = $request->validate([
        'cancellation_reason' => 'required|string|max:500',
        'refund' => 'boolean',
    ]);
    
    $order = Order::findOrFail($id);
    
    // Cannot cancel delivered orders
    if ($order->status === 'delivered') {
        return response()->json([
            'message' => 'Cannot cancel delivered orders'
        ], 422);
    }
    
    DB::transaction(function() use ($order, $validated) {
        $order->status = 'cancelled';
        $order->cancelled_at = now();
        $order->cancellation_reason = $validated['cancellation_reason'];
        
        // Process refund if requested and payment was completed
        if ($validated['refund'] && $order->payment_status === 'completed') {
            $order->payment_status = 'refunded';
            
            // TODO: Trigger actual refund via payment gateway
            // RefundService::process($order);
        }
        
        $order->save();
        
        // Restore product stock
        foreach ($order->items as $item) {
            $product = Product::find($item->product_id);
            $product->increment('stock_quantity', $item->quantity);
        }
        
        // Log cancellation
        activity()
            ->performedOn($order)
            ->causedBy(auth()->user())
            ->withProperties([
                'reason' => $validated['cancellation_reason'],
                'refund' => $validated['refund'],
            ])
            ->log('order_cancelled');
        
        // Send notification to customer
        $order->user->notify(new OrderCancelled($order));
    });
    
    return response()->json([
        'message' => 'Order cancelled successfully',
        'data' => new OrderResource($order),
    ]);
}
```

#### 7.4.5 Export Orders

**Endpoint**: `GET /api/v1/admin/orders/export`

**Query Parameters**: Same as list orders endpoint

**Response**: CSV file download

**CSV Format**:
```csv
Order Number,Customer Name,Customer Email,Status,Payment Status,Payment Method,Subtotal,Delivery Fee,Discount,Tax,Total,Items Count,Delivery Date,Created At
ORD-2026-001,Ahmed Mohamed,ahmed@example.com,delivered,completed,card,250.00,20.00,0.00,35.00,305.00,5,2026-01-15,2026-01-10 14:30:00
```

#### 7.4.6 Print Invoice/Receipt

**Endpoint**: `GET /api/v1/admin/orders/{id}/invoice`

**Response**: PDF file download or HTML printable view

---

### 7.5 Frontend Pages

#### 7.5.1 Orders List Page

**Route**: `/admin/orders`

**Components**:

- **Summary Cards** (Top KPIs):
  - Total Orders (count)
  - Total Revenue (sum of completed payments)
  - Pending Orders (count)
  - Active Deliveries (out_for_delivery count)

- **Filters Panel**:
  - Search (order number, customer name)
  - Status multi-select dropdown
  - Payment status multi-select
  - Payment method dropdown
  - Date range picker
  - Total amount range slider

- **Data Table** with columns:
  - Order Number (clickable)
  - Customer Name + Email
  - Status Badge (color-coded)
  - Payment Status Badge
  - Payment Method Icon
  - Total Amount (emphasized)
  - Items Count
  - Delivery Date
  - Created At
  - Actions (View, Update Status, Cancel)

- **Status Badge Colors**:
  - Pending: Gray
  - Confirmed: Blue
  - Preparing: Yellow
  - Out for Delivery: Orange
  - Delivered: Green
  - Cancelled: Red
  - Failed: Dark Red

- **Toolbar**:
  - Export CSV button
  - Refresh button
  - Bulk actions (Update status, Cancel)

- **Pagination**: Standard with page size selector

**State Management**:
```typescript
interface OrdersPageState {
  orders: Order[];
  filters: OrderFilters;
  pagination: PaginationMeta;
  summary: OrderSummary;
  selectedOrders: number[];
  isLoading: boolean;
}
```

#### 7.5.2 Order Detail Page

**Route**: `/admin/orders/{id}`

**Components**:

1. **Header Section**:
   - Order Number (large, prominent)
   - Status Badge (current status)
   - Quick Actions (Update Status, Cancel, Print Invoice)
   - Created At timestamp

2. **Customer Information Card**:
   - Customer name + avatar
   - Email (clickable)
   - Phone (clickable to call)
   - Total orders count
   - Customer lifetime value

3. **Delivery Information Card**:
   - Delivery address (full)
   - Delivery date
   - Delivery time slot
   - Customer notes
   - Map preview (optional)

4. **Order Items Table**:
   - Product image
   - Product name
   - Quantity
   - Price per unit
   - Subtotal
   - Current stock status

5. **Order Summary Card**:
   - Subtotal
   - Delivery Fee
   - Discount (if any)
   - Tax
   - **Total** (emphasized, large)

6. **Payment Information Card**:
   - Payment Method
   - Payment Status
   - Transaction ID
   - Payment processed timestamp

7. **Status Timeline**:
   - Vertical timeline showing all status changes
   - Timestamp for each status
   - User who made the change
   - Notes (if any)

8. **Activity Log** (accordion):
   - All actions taken on this order
   - User who performed action
   - Timestamp

**Actions**:
- Update Status (modal)
- Cancel Order (confirmation dialog)
- Process Refund (modal)
- Print Invoice (PDF download)
- Contact Customer (opens email/phone)

#### 7.5.3 Update Status Modal

**Components**:
- Current status display
- New status dropdown (filtered by allowed transitions)
- Notes textarea
- Delivery confirmation (if changing to delivered)
- Save button

**Validation**:
- Validate allowed status transitions
- Require notes for cancellation
- Require delivery confirmation for delivered status

### 7.6 Frontend Implementation Example

```typescript
// pages/admin/orders/index.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/DataTable';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrderSummaryCards } from '@/components/orders/OrderSummaryCards';
import { ordersApi } from '@/services/api/ordersApi';

export default function OrdersListPage() {
  const [filters, setFilters] = useState<OrderFilters>({
    page: 1,
    per_page: 20,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', filters],
    queryFn: () => ordersApi.getOrders(filters),
  });

  const columns = [
    {
      accessorKey: 'order_number',
      header: 'Order #',
      cell: ({ row }) => (
        <Link
          to={`/admin/orders/${row.original.id}`}
          className="font-mono font-semibold text-blue-600 hover:underline"
        >
          {row.original.order_number}
        </Link>
      ),
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.customer.first_name} {row.original.customer.last_name}
          </div>
          <div className="text-sm text-gray-500">{row.original.customer.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'payment_status',
      header: 'Payment',
      cell: ({ row }) => <PaymentStatusBadge status={row.original.payment_status} />,
    },
    {
      accessorKey: 'payment_method',
      header: 'Method',
      cell: ({ row }) => <PaymentMethodIcon method={row.original.payment_method} />,
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: ({ row }) => (
        <span className="font-semibold text-green-600">
          {row.original.total} EGP
        </span>
      ),
    },
    {
      accessorKey: 'items_count',
      header: 'Items',
      cell: ({ row }) => (
        <span className="badge badge-sm">{row.original.items_count}</span>
      ),
    },
    {
      accessorKey: 'delivery_date',
      header: 'Delivery',
      cell: ({ row }) => (
        <div>
          <div>{row.original.delivery_date}</div>
          <div className="text-sm text-gray-500">{row.original.delivery_time_slot}</div>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM dd, yyyy HH:mm'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link to={`/admin/orders/${row.original.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openUpdateStatusModal(row.original)}>
              Update Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCancelModal(row.original)}>
              Cancel Order
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => printInvoice(row.original.id)}>
              Print Invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportOrders(filters)}>
            Export CSV
          </Button>
        </div>
      </div>

      <OrderSummaryCards summary={data?.summary} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <aside className="md:col-span-1">
          <OrderFilters filters={filters} onFiltersChange={setFilters} />
        </aside>

        <main className="md:col-span-3">
          <DataTable
            columns={columns}
            data={data?.data || []}
            pagination={data?.meta}
            onPaginationChange={(page) => setFilters({ ...filters, page })}
            isLoading={isLoading}
          />
        </main>
      </div>
    </div>
  );
}
```

---

**[PART 1 OF 3 - CONTINUED IN NEXT MESSAGE]**

This documentation now covers:
1. Executive Summary
2. System Architecture
3. Core Technologies
4. Authentication & Authorization
5. Module 1: Product Management (Complete)
6. Module 2: Category Management (Complete)
7. Module 3: Order Management (Complete)

**Remaining sections to be documented:**
- Module 4: Customer Support
- Module 5: Financial Management
- Module 6: User Management & Roles
- Module 7: Analytics & Reporting
- Frontend Architecture
- Backend Architecture
- API Specifications
- Database Schema (Complete Reference)
- Security Protocols
- Deployment Guidelines
- Testing Strategy
- Appendices

Would you like me to continue with the remaining modules in the next message?
