# Promo Code Tracking & Analytics System

## Overview
A comprehensive promo code management system with advanced usage tracking, analytics, and user limits.

## Features

### 1. **Usage Limits**
- **Total Usage Limit** (`usage_limit`): Maximum number of times the promo code can be used across all users
- **Per-User Limit** (`usage_per_user`): Maximum number of times a single user can use the code
- **First Order Only** (`first_order_only`): Restrict code to first-time customers only
- **Date Range**: Set valid from/until dates for time-limited promotions

### 2. **Usage Tracking**
The `promo_code_usage` table tracks every use of a promo code:
- `user_id`: Which user used it
- `order_id`: Which order it was applied to
- `order_number`: Human-readable order reference
- `discount_amount`: How much discount was given
- `order_total`: Total order amount before discount
- `used_at`: Timestamp of when it was used
- `created_at` / `updated_at`: Record audit trail

### 3. **Analytics Dashboard**

#### Statistics Overview
- **Total Uses**: How many times the code has been used
- **Unique Users**: Number of different users who used it
- **Total Discount**: Sum of all discounts given
- **Average Discount**: Average discount amount per use

#### Usage Timeline
- Daily/weekly breakdown of usage
- Tracks usage count and total discount per period
- Helps identify peak usage times

#### Top Users
- Lists users who used the code most frequently
- Shows usage count and total savings per user
- Helps identify your most engaged customers

#### Usage History
- Detailed log of every code usage
- Shows user, order, discount amount, and timestamp
- Filterable and paginated for easy searching

#### User Management
- View all users who have used the code
- Search users by name or email
- See individual user statistics (usage count, total saved)

## Backend Implementation

### Database Schema

#### Promo Codes Table
```sql
CREATE TABLE promo_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(255) UNIQUE NOT NULL,
    type ENUM('percentage', 'fixed_amount', 'free_delivery', 'bogo') NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    minimum_order DECIMAL(10,2) DEFAULT NULL,
    maximum_discount DECIMAL(10,2) DEFAULT NULL,
    usage_limit INT DEFAULT NULL,
    usage_per_user INT DEFAULT NULL,
    first_order_only BOOLEAN DEFAULT FALSE,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

#### Promo Code Usage Table
```sql
CREATE TABLE promo_code_usage (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    promo_code_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    order_total DECIMAL(10,2) DEFAULT 0,
    order_number VARCHAR(255) NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_promo_code_id (promo_code_id),
    INDEX idx_user_id (user_id),
    INDEX idx_order_id (order_id),
    INDEX idx_used_at (used_at),
    INDEX idx_promo_code_user (promo_code_id, user_id)
);
```

### Models

#### PromoCode Model
```php
// app/Models/PromoCode.php

public function usages()
{
    return $this->hasMany(PromoCodeUsage::class);
}

public function getUserUsageCount($userId)
{
    return $this->usages()->where('user_id', $userId)->count();
}

public function hasReachedLimit()
{
    return $this->usage_limit && $this->used_count >= $this->usage_limit;
}

public function userHasReachedLimit($userId)
{
    if (!$this->usage_per_user) {
        return false;
    }
    
    return $this->getUserUsageCount($userId) >= $this->usage_per_user;
}

public function getRemainingUsesAttribute()
{
    if (!$this->usage_limit) {
        return null; // Unlimited
    }
    
    return max(0, $this->usage_limit - $this->used_count);
}

public function getRemainingUsesForUser($userId)
{
    if (!$this->usage_per_user) {
        return null; // Unlimited
    }
    
    return max(0, $this->usage_per_user - $this->getUserUsageCount($userId));
}

public function isValid()
{
    $now = now();
    return $this->is_active
        && $now >= $this->valid_from
        && $now <= $this->valid_until
        && !$this->hasReachedLimit();
}
```

#### PromoCodeUsage Model
```php
// app/Models/PromoCodeUsage.php

protected $fillable = [
    'promo_code_id',
    'user_id',
    'order_id',
    'discount_amount',
    'order_total',
    'order_number',
    'used_at',
];

protected $casts = [
    'discount_amount' => 'decimal:2',
    'order_total' => 'decimal:2',
    'used_at' => 'datetime',
];

public function promoCode()
{
    return $this->belongsTo(PromoCode::class);
}

public function user()
{
    return $this->belongsTo(User::class);
}

public function order()
{
    return $this->belongsTo(Order::class);
}
```

### Controllers

#### PromoCodeController
```php
// app/Http/Controllers/Api/Admin/PromoCodeController.php

// Get analytics for a specific promo code
public function analytics($id)
{
    $promoCode = PromoCode::with('usages.user')->findOrFail($id);
    
    // Statistics
    $statistics = [
        'total_uses' => $promoCode->usages()->count(),
        'unique_users' => $promoCode->usages()->distinct('user_id')->count('user_id'),
        'total_discount' => $promoCode->usages()->sum('discount_amount'),
        'average_discount' => $promoCode->usages()->avg('discount_amount'),
    ];
    
    // Usage timeline (last 30 days)
    $timeline = $promoCode->usages()
        ->selectRaw('DATE(used_at) as date, COUNT(*) as count, SUM(discount_amount) as total_discount')
        ->where('used_at', '>=', now()->subDays(30))
        ->groupBy('date')
        ->orderBy('date', 'desc')
        ->get();
    
    // Top users
    $topUsers = $promoCode->usages()
        ->selectRaw('user_id, COUNT(*) as usage_count, SUM(discount_amount) as total_discount')
        ->with('user:id,name,email')
        ->groupBy('user_id')
        ->orderBy('usage_count', 'desc')
        ->limit(10)
        ->get();
    
    return response()->json([
        'promo_code' => $promoCode,
        'statistics' => $statistics,
        'usage_timeline' => $timeline,
        'top_users' => $topUsers,
    ]);
}

// Get usage history with pagination
public function usageHistory($id)
{
    $promoCode = PromoCode::findOrFail($id);
    
    $usages = $promoCode->usages()
        ->with('user:id,name,email', 'order')
        ->orderBy('used_at', 'desc')
        ->paginate(20);
    
    return response()->json($usages);
}

// Get all users who used the code
public function users($id)
{
    $promoCode = PromoCode::findOrFail($id);
    
    $users = $promoCode->usages()
        ->selectRaw('user_id, COUNT(*) as usage_count, SUM(discount_amount) as total_discount')
        ->with('user:id,name,email')
        ->groupBy('user_id')
        ->get();
    
    return response()->json($users);
}

// Get specific user's usage of the code
public function userUsage($id, $userId)
{
    $promoCode = PromoCode::findOrFail($id);
    
    $usages = $promoCode->usages()
        ->where('user_id', $userId)
        ->with('order')
        ->orderBy('used_at', 'desc')
        ->get();
    
    return response()->json($usages);
}
```

### Routes
```php
// routes/api.php

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::prefix('promo-codes/{id}')->group(function () {
        Route::get('/analytics', [PromoCodeController::class, 'analytics']);
        Route::get('/usage-history', [PromoCodeController::class, 'usageHistory']);
        Route::get('/users', [PromoCodeController::class, 'users']);
        Route::get('/user/{userId}', [PromoCodeController::class, 'userUsage']);
    });
});
```

### Order Service Integration
```php
// app/Services/OrderService.php

protected function finalizePromoUsage($order, $promoCode, $discountAmount)
{
    PromoCodeUsage::create([
        'promo_code_id' => $promoCode->id,
        'user_id' => $order->user_id,
        'order_id' => $order->id,
        'discount_amount' => $discountAmount,
        'order_total' => $order->total,
        'order_number' => $order->order_number,
        'used_at' => now(),
    ]);
    
    $promoCode->increment('used_count');
}
```

## Frontend Implementation

### Admin Dashboard Pages

#### 1. Promo Codes List Page
`admindash frontend/src/pages/promo-codes/PromoCodesPage.tsx`

Features:
- View all promo codes in a table
- Search and filter by status
- Create/edit promo codes with all fields
- View analytics button for each code
- Usage display (used/limit)

Fields in Create/Edit Form:
- Code (uppercase, unique)
- Discount Type (percentage/fixed_amount)
- Discount Value
- Max Discount (for percentage types)
- Min Order Amount
- Total Usage Limit
- Usage Per User
- First Order Only (toggle)
- Valid From/Until dates
- Is Active (toggle)

#### 2. Analytics Page
`admindash frontend/src/pages/promo-codes/PromoCodeAnalyticsPage.tsx`

Sections:
- **Statistics Cards**: Total Uses, Unique Users, Total Discount, Avg Discount
- **Usage Timeline**: Daily breakdown of usage and discounts
- **Top Users**: Users with most usage
- **Usage History**: Detailed log with pagination
- **All Users**: Grid view of all users who used the code

Features:
- Date range filter (7 days, 30 days, all time)
- User search functionality
- Pagination for usage history
- Currency formatting for Egyptian Pound (EGP)

### API Service
`admindash frontend/src/services/promo-code.service.ts`

```typescript
export const promoCodeService = {
    getPromoCodeAnalytics: async (id: number, dateRange?: '7days' | '30days' | 'all') => {
        return apiClient.get(`/admin/promo-codes/${id}/analytics`, { date_range: dateRange })
    },
    
    getPromoCodeUsageHistory: async (id: number, params?: { page?: number; per_page?: number }) => {
        return apiClient.get(`/admin/promo-codes/${id}/usage-history`, params)
    },
    
    getPromoCodeUsers: async (id: number) => {
        return apiClient.get(`/admin/promo-codes/${id}/users`)
    },
    
    getUserPromoCodeUsage: async (id: number, userId: number) => {
        return apiClient.get(`/admin/promo-codes/${id}/user/${userId}`)
    },
}
```

## Usage Scenarios

### Scenario 1: Limited-Time Flash Sale
```
Code: FLASH50
Type: Percentage
Value: 50%
Max Discount: 200 EGP
Min Order: 500 EGP
Usage Limit: 100
Usage Per User: 1
First Order Only: No
Valid: 24 hours
```

### Scenario 2: Welcome Discount for New Customers
```
Code: WELCOME20
Type: Percentage
Value: 20%
Max Discount: 100 EGP
Min Order: 200 EGP
Usage Limit: Unlimited
Usage Per User: 1
First Order Only: Yes
Valid: 30 days
```

### Scenario 3: Loyal Customer Reward
```
Code: LOYAL100
Type: Fixed Amount
Value: 100 EGP
Min Order: 500 EGP
Usage Limit: 500
Usage Per User: 3
First Order Only: No
Valid: 1 month
```

### Scenario 4: Influencer Code
```
Code: INFLUENCER15
Type: Percentage
Value: 15%
Max Discount: 150 EGP
Min Order: 300 EGP
Usage Limit: Unlimited
Usage Per User: Unlimited
First Order Only: No
Valid: 6 months
```

## Validation Rules

### When Applying a Promo Code:

1. **Code Exists**: Code must exist in database
2. **Is Active**: `is_active` must be true
3. **Date Range**: Current date must be between `valid_from` and `valid_until`
4. **Total Limit**: If `usage_limit` is set, `used_count` must be less than `usage_limit`
5. **Per-User Limit**: If `usage_per_user` is set, user's usage count must be less than `usage_per_user`
6. **First Order Only**: If true, user must have no previous orders
7. **Minimum Order**: Order total must meet `minimum_order` requirement

### PromoCode Model Validation Methods:

```php
$promoCode->isValid() // Overall validity
$promoCode->hasReachedLimit() // Total limit check
$promoCode->userHasReachedLimit($userId) // Per-user limit check
$promoCode->remaining_uses // How many uses left
$promoCode->getRemainingUsesForUser($userId) // How many uses left for specific user
```

## Testing Checklist

### Backend Testing
- ✅ Create promo code with all fields
- ✅ Apply promo code to order
- ✅ Verify usage record created
- ✅ Verify used_count incremented
- ✅ Test total usage limit enforcement
- ✅ Test per-user limit enforcement
- ✅ Test first order only restriction
- ✅ Test date range validation
- ✅ Test analytics endpoint returns correct stats
- ✅ Test usage history pagination
- ✅ Test top users calculation

### Frontend Testing
- ✅ Create new promo code
- ✅ Edit existing promo code
- ✅ View analytics page
- ✅ Navigate between promo codes list and analytics
- ✅ Filter usage history
- ✅ Search users
- ✅ Change date range
- ✅ Verify currency formatting
- ✅ Verify statistics calculation

## API Endpoints

### Admin Promo Code Management
- `GET /api/admin/financial/promo-codes` - List all promo codes
- `POST /api/admin/financial/promo-codes` - Create new promo code
- `PUT /api/admin/financial/promo-codes/{id}` - Update promo code
- `DELETE /api/admin/financial/promo-codes/{id}` - Delete promo code

### Admin Analytics
- `GET /api/admin/promo-codes/{id}/analytics` - Get analytics for a promo code
- `GET /api/admin/promo-codes/{id}/usage-history` - Get usage history (paginated)
- `GET /api/admin/promo-codes/{id}/users` - Get all users who used the code
- `GET /api/admin/promo-codes/{id}/user/{userId}` - Get specific user's usage

### Mobile App (Customer)
- `POST /api/cart/apply-promo` - Apply promo code to cart
- `DELETE /api/cart/remove-promo` - Remove promo code from cart

## Migration Files

1. `2024_xx_xx_create_promo_codes_table.php` - Original promo codes table
2. `2026_01_28_000003_update_promo_code_usage_table.php` - Added tracking fields (order_total, order_number, used_at)

## Files Created/Modified

### Backend
- ✅ `database/migrations/2026_01_28_000003_update_promo_code_usage_table.php`
- ✅ `app/Models/PromoCodeUsage.php`
- ✅ `app/Models/PromoCode.php` (enhanced)
- ✅ `app/Services/OrderService.php` (enhanced)
- ✅ `app/Http/Controllers/Api/Admin/PromoCodeController.php`
- ✅ `routes/api.php` (added analytics routes)

### Frontend
- ✅ `admindash frontend/src/pages/promo-codes/PromoCodeAnalyticsPage.tsx`
- ✅ `admindash frontend/src/pages/promo-codes/PromoCodesPage.tsx` (enhanced)
- ✅ `admindash frontend/src/services/promo-code.service.ts` (enhanced)
- ✅ `admindash frontend/src/main.tsx` (added route)

## Next Steps (Optional Enhancements)

1. **Email Notifications**
   - Send email when promo code is created
   - Notify when code is about to expire
   - Alert when usage limit is reached

2. **Export Functionality**
   - Export usage history to CSV/Excel
   - Generate PDF reports for analytics

3. **Advanced Filtering**
   - Filter by product category
   - Filter by user segment
   - Time-based restrictions (e.g., weekends only)

4. **A/B Testing**
   - Compare performance of different codes
   - Track conversion rates
   - ROI calculations

5. **Automated Code Generation**
   - Bulk create unique codes
   - Generate codes with patterns
   - QR code generation

## Conclusion

This comprehensive promo code system provides:
- ✅ Complete usage tracking
- ✅ Flexible limit configurations
- ✅ Detailed analytics and reporting
- ✅ User-friendly admin interface
- ✅ Robust validation and security
- ✅ Scalable architecture

The system can handle all common promo code scenarios while maintaining detailed audit trails for business intelligence and fraud prevention.
