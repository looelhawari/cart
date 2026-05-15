<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;
use App\Models\Order;

class PromoCode extends Model
{
    /**
     * Mass-assignable attributes.
     *
     * SECURITY HARDENED: used_count is NOT fillable. It must only be modified
     * via increment/decrement (which is what OrderService::finalizePromoUsage
     * already does correctly). Previously an admin form forwarding
     * $request->validated() to ->fill() could let any admin reset used_count
     * to bypass usage_limit and drain the promo budget.
     */
    protected $fillable = [
        'code',
        'type',                  // percentage, fixed_amount, free_delivery, bogo
        'applies_to',            // order, product, category
        'first_order_only',
        'value',
        'minimum_order',
        'maximum_discount',
        'usage_limit',
        'usage_per_user',
        'valid_from',
        'valid_until',
        'is_active',
        'target_audience',
        'promotional_message',
        'promotional_message_ar',
        'minimum_spend_30days',
        'minimum_orders_30days',
        'last_order_date_from',
        'last_order_date_to',
        'registration_date_from',
        'registration_date_to',
        'location',
        'specific_user_ids',
        // NOT FILLABLE: used_count (use increment/decrement only)
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'applies_to' => 'string',
        'first_order_only' => 'boolean',
        'minimum_order' => 'decimal:2',
        'maximum_discount' => 'decimal:2',
        'usage_limit' => 'integer',
        'usage_per_user' => 'integer',
        'used_count' => 'integer',
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'specific_user_ids' => 'array',
        'last_order_date_from' => 'date',
        'last_order_date_to' => 'date',
        'registration_date_from' => 'date',
        'registration_date_to' => 'date',
        'minimum_spend_30days' => 'decimal:2',
    ];

    protected $appends = ['status', 'remaining_uses', 'is_expired', 'discount_display'];

    // ========== RELATIONSHIPS ==========

    /**
     * Get all usage records for this promo code
     */
    public function usages(): HasMany
    {
        return $this->hasMany(PromoCodeUsage::class);
    }

    /**
     * Get BOGO rules for this promo code
     */
    public function bogoRules(): HasMany
    {
        return $this->hasMany(PromoCodeBogoRule::class);
    }

    /**
     * Get active BOGO rules
     */
    public function activeBogoRules(): HasMany
    {
        return $this->hasMany(PromoCodeBogoRule::class)->where('is_active', true);
    }

    /**
     * Products this promo code applies to
     * Note: Products use barcode as primary key
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'promo_code_products', 'promo_code_id', 'product_id', 'id', 'barcode');
    }

    /**
     * Categories this promo code applies to (with subcategory flag)
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'promo_code_categories', 'promo_code_id', 'category_id')
            ->withPivot('include_subcategories');
    }

    // ========== SMART VALIDATION ==========

    /**
     * Get usage count for a specific user
     */
    public function getUserUsageCount(int $userId): int
    {
        return $this->usages()->where('user_id', $userId)->count();
    }

    /**
     * Check if promo code has reached its overall usage limit
     */
    public function hasReachedLimit(): bool
    {
        if (!$this->usage_limit) {
            return false;
        }
        return $this->used_count >= $this->usage_limit;
    }

    /**
     * Check if user has reached their usage limit for this promo
     */
    public function userHasReachedLimit(int $userId): bool
    {
        if (!$this->usage_per_user) {
            return false;
        }
        return $this->getUserUsageCount($userId) >= $this->usage_per_user;
    }

    /**
     * Get remaining uses (overall)
     */
    public function getRemainingUsesAttribute(): ?int
    {
        if (!$this->usage_limit) {
            return null; // Unlimited
        }
        return max(0, $this->usage_limit - $this->used_count);
    }

    /**
     * Get remaining uses for a specific user
     */
    public function getRemainingUsesForUser(int $userId): ?int
    {
        if (!$this->usage_per_user) {
            return null; // Unlimited per user
        }
        return max(0, $this->usage_per_user - $this->getUserUsageCount($userId));
    }

    /**
     * Check if promo code is expired
     */
    public function getIsExpiredAttribute(): bool
    {
        if (!$this->valid_until) return false;
        return $this->valid_until->isPast();
    }

    /**
     * Check if promo code is currently valid (active and within date range)
     */
    public function isValid(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = now();
        
        if ($this->valid_from && $this->valid_from->isAfter($now)) {
            return false;
        }

        if ($this->valid_until && $this->valid_until->isBefore($now)) {
            return false;
        }

        return !$this->hasReachedLimit();
    }

    /**
     * Get status label for the promo code
     */
    public function getStatusAttribute(): string
    {
        if (!$this->is_active) return 'inactive';
        if ($this->is_expired) return 'expired';
        if ($this->hasReachedLimit()) return 'limit_reached';
        if ($this->valid_from && $this->valid_from->isFuture()) return 'scheduled';
        return 'active';
    }

    /**
     * Get human-readable discount display
     */
    public function getDiscountDisplayAttribute(): string
    {
        switch ($this->type) {
            case 'percentage':
                return "{$this->value}% off";
            case 'fixed_amount':
                return "EGP {$this->value} off";
            case 'free_delivery':
                return "Free Delivery";
            case 'bogo':
                $rule = $this->activeBogoRules->first();
                return $rule ? $rule->description : "Buy One Get One";
            default:
                return "Discount";
        }
    }

    // ========== SMART DISCOUNT CALCULATION ==========

    /**
     * Comprehensive validation for a user with detailed error messages
     */
    public function validateForUser(int $userId, float $orderTotal = 0, bool $isFirstOrder = false): array
    {
        $errors = [];

        if (!$this->is_active) {
            $errors[] = 'This promo code is no longer active';
        }

        if ($this->valid_from && $this->valid_from->isFuture()) {
            $errors[] = 'This promo code is not yet active. Valid from: ' . $this->valid_from->format('M d, Y');
        }

        if ($this->is_expired) {
            $errors[] = 'This promo code has expired';
        }

        if ($this->hasReachedLimit()) {
            $errors[] = 'This promo code has reached its usage limit';
        }

        if ($this->userHasReachedLimit($userId)) {
            $errors[] = "You've already used this code the maximum number of times ({$this->usage_per_user})";
        }

        if ($this->first_order_only && !$isFirstOrder) {
            $errors[] = 'This promo code is only valid for your first order';
        }

        if ($this->minimum_order && $orderTotal < $this->minimum_order) {
            $needed = $this->minimum_order - $orderTotal;
            $errors[] = "Add EGP {$needed} more to use this code (minimum order: EGP {$this->minimum_order})";
        }

        // Offline Users Check (Inactive for 30+ days)
        if ($this->target_audience === 'offline_users') {
            $lastOrder = Order::where('user_id', $userId)
                ->whereNotIn('status', ['cancelled', 'failed'])
                ->latest()
                ->first();

            if ($lastOrder && $lastOrder->created_at->gt(now()->subDays(30))) {
                $errors[] = 'This offer is exclusively for customers who haven\'t ordered in the last 30 days.';
            }
        }

        // 1. Specific User IDs
        if (!empty($this->specific_user_ids)) {
             if (!in_array($userId, $this->specific_user_ids)) {
                 $errors[] = 'This promo code is not applicable to your account.';
             }
        }
        
        // 2. Registration Date Range
        if ($this->registration_date_from || $this->registration_date_to) {
             $user = \App\Models\User::find($userId);
             if ($user) {
                 if ($this->registration_date_from && $user->created_at->lt($this->registration_date_from)) {
                     $errors[] = 'Account registered too early for this offer.';
                 }
                 if ($this->registration_date_to && $user->created_at->gt($this->registration_date_to)) {
                     $errors[] = 'Account registered too late for this offer.';
                 }
             }
        }
        
        // 3. Last Order Date Range
        if ($this->last_order_date_from || $this->last_order_date_to) {
             $lastOrder = Order::where('user_id', $userId)
                ->whereNotIn('status', ['cancelled', 'failed'])
                ->latest()
                ->first();
             
             if (!$lastOrder) {
                  $errors[] = 'Order history requirement not met.';
             } else {
                  if ($this->last_order_date_from && $lastOrder->created_at->lt($this->last_order_date_from)) {
                      $errors[] = 'Last order was too long ago for this offer.';
                  }
                   if ($this->last_order_date_to && $lastOrder->created_at->gt($this->last_order_date_to)) {
                      $errors[] = 'Last order was too recent for this offer.';
                  }
             }
        }
        
        // 4. Minimum Spend 30 Days
        if ($this->minimum_spend_30days) {
             $spend30 = Order::where('user_id', $userId)
                 ->whereNotIn('status', ['cancelled', 'failed'])
                 ->where('created_at', '>=', now()->subDays(30))
                 ->sum('total');
             
             if ($spend30 < $this->minimum_spend_30days) {
                 $errors[] = "You must have spent at least EGP {$this->minimum_spend_30days} in the last 30 days.";
             }
        }
        
        // 5. Minimum Orders 30 Days
        if ($this->minimum_orders_30days) {
             $orders30 = Order::where('user_id', $userId)
                 ->whereNotIn('status', ['cancelled', 'failed'])
                 ->where('created_at', '>=', now()->subDays(30))
                 ->count();
             
             if ($orders30 < $this->minimum_orders_30days) {
                 $errors[] = "You must have at least {$this->minimum_orders_30days} orders in the last 30 days.";
             }
        }
        
        // 6. Location
        if ($this->location) {
             $hasLocation = \App\Models\Address::where('user_id', $userId)
                 ->where(function($q) {
                      $q->where('city', 'like', "%{$this->location}%")
                        ->orWhere('area', 'like', "%{$this->location}%");
                 })
                 ->exists();
                 
             if (!$hasLocation) {
                 $errors[] = "This offer is only valid in {$this->location}.";
             }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'remaining_uses' => $this->getRemainingUsesForUser($userId),
        ];
    }

    /**
     * Calculate discount for cart items.
     *
     * ⚠ PREVIEW-ONLY: This is the model-side engine. It is wired ONLY into
     * `PromoCodeService::applyPromoCode` / `getBestPromoCodesForUser` (used by
     * `PromoCodeApiController::preview` / recommendations). The CANONICAL
     * money-time engine — used by `OrderService::createOrderFromCart` via
     * `CartService::calculateTotals` — is `CartService::evaluatePromoForCart`.
     *
     * Do NOT call this from any code path that creates an order or charges
     * a card. The two engines have slightly different implementations of
     * BOGO, fixed-amount distribution, and category-eligibility, and only
     * the cart engine has the targeting/audience checks (NOT_TARGETED).
     */
    public function calculateDiscount(array $cartItems, float $orderSubtotal): array
    {
        $discount = 0;
        $freeDelivery = false;
        $appliedItems = [];
        $bogoDetails = null;

        switch ($this->type) {
            case 'percentage':
                $result = $this->calculatePercentageDiscount($cartItems, $orderSubtotal);
                $discount = $result['discount'];
                $appliedItems = $result['applied_items'];
                break;

            case 'fixed_amount':
                $result = $this->calculateFixedDiscount($cartItems, $orderSubtotal);
                $discount = $result['discount'];
                $appliedItems = $result['applied_items'];
                break;

            case 'free_delivery':
                $freeDelivery = true;
                break;

            case 'bogo':
                $result = $this->calculateBogoDiscount($cartItems);
                $discount = $result['discount'];
                $bogoDetails = $result['details'];
                break;
        }

        // Apply maximum discount cap if set
        if ($this->maximum_discount && $discount > $this->maximum_discount) {
            $discount = $this->maximum_discount;
        }

        return [
            'discount_amount' => round($discount, 2),
            'free_delivery' => $freeDelivery,
            'applied_items' => $appliedItems,
            'bogo_details' => $bogoDetails,
            'type' => $this->type,
            'display' => $this->discount_display,
        ];
    }

    /**
     * Calculate percentage discount based on applies_to
     */
    protected function calculatePercentageDiscount(array $cartItems, float $orderSubtotal): array
    {
        $discount = 0;
        $appliedItems = [];

        switch ($this->applies_to) {
            case 'order':
                $discount = $orderSubtotal * ($this->value / 100);
                break;

            case 'product':
                $eligibleProducts = $this->products->pluck('id')->toArray();
                foreach ($cartItems as $item) {
                    if (in_array($item['product_id'], $eligibleProducts)) {
                        $itemDiscount = ($item['price'] * $item['quantity']) * ($this->value / 100);
                        $discount += $itemDiscount;
                        $appliedItems[] = [
                            'product_id' => $item['product_id'],
                            'discount' => $itemDiscount,
                        ];
                    }
                }
                break;

            case 'category':
                $eligibleCategoryIds = $this->getEligibleCategoryIds();
                foreach ($cartItems as $item) {
                    $product = Product::find($item['product_id']);
                    if ($product && in_array($product->category_id, $eligibleCategoryIds)) {
                        $itemDiscount = ($item['price'] * $item['quantity']) * ($this->value / 100);
                        $discount += $itemDiscount;
                        $appliedItems[] = [
                            'product_id' => $item['product_id'],
                            'discount' => $itemDiscount,
                        ];
                    }
                }
                break;
        }

        return ['discount' => $discount, 'applied_items' => $appliedItems];
    }

    /**
     * Calculate fixed amount discount based on applies_to
     */
    protected function calculateFixedDiscount(array $cartItems, float $orderSubtotal): array
    {
        $discount = 0;
        $appliedItems = [];

        switch ($this->applies_to) {
            case 'order':
                $discount = min($this->value, $orderSubtotal);
                break;

            case 'product':
                $eligibleProducts = $this->products->pluck('id')->toArray();
                foreach ($cartItems as $item) {
                    if (in_array($item['product_id'], $eligibleProducts)) {
                        $itemTotal = $item['price'] * $item['quantity'];
                        $itemDiscount = min($this->value, $itemTotal);
                        $discount += $itemDiscount;
                        $appliedItems[] = [
                            'product_id' => $item['product_id'],
                            'discount' => $itemDiscount,
                        ];
                    }
                }
                break;

            case 'category':
                $eligibleCategoryIds = $this->getEligibleCategoryIds();
                $totalEligible = 0;
                $eligibleItems = [];
                
                foreach ($cartItems as $item) {
                    $product = Product::find($item['product_id']);
                    if ($product && in_array($product->category_id, $eligibleCategoryIds)) {
                        $eligibleItems[] = $item;
                        $totalEligible += $item['price'] * $item['quantity'];
                    }
                }
                
                // Distribute fixed discount proportionally among eligible items
                if ($totalEligible > 0) {
                    $discountToApply = min($this->value, $totalEligible);
                    foreach ($eligibleItems as $item) {
                        $itemTotal = $item['price'] * $item['quantity'];
                        $proportion = $itemTotal / $totalEligible;
                        $itemDiscount = $discountToApply * $proportion;
                        $discount += $itemDiscount;
                        $appliedItems[] = [
                            'product_id' => $item['product_id'],
                            'discount' => $itemDiscount,
                        ];
                    }
                }
                break;
        }

        return ['discount' => $discount, 'applied_items' => $appliedItems];
    }

    /**
     * Calculate BOGO discount using all active BOGO rules
     */
    protected function calculateBogoDiscount(array $cartItems): array
    {
        $totalDiscount = 0;
        $details = [];

        foreach ($this->activeBogoRules as $rule) {
            $result = $rule->applyToCart($cartItems);
            if ($result['applied']) {
                $totalDiscount += $result['discount'];
                $details[] = [
                    'rule_id' => $rule->id,
                    'description' => $rule->description,
                    'discount' => $result['discount'],
                    'times_applied' => $result['times_applied'] ?? 1,
                ];
            }
        }

        return [
            'discount' => $totalDiscount,
            'details' => $details,
        ];
    }

    /**
     * Get all eligible category IDs including subcategories
     */
    protected function getEligibleCategoryIds(): array
    {
        $categoryIds = [];

        foreach ($this->categories as $category) {
            $categoryIds[] = $category->id;
            
            if ($category->pivot->include_subcategories) {
                $subcategoryIds = $this->getSubcategoryIds($category->id);
                $categoryIds = array_merge($categoryIds, $subcategoryIds);
            }
        }

        return array_unique($categoryIds);
    }

    /**
     * Recursively get all subcategory IDs
     */
    protected function getSubcategoryIds(int $parentId): array
    {
        $ids = [];
        $children = Category::where('parent_id', $parentId)->pluck('id')->toArray();
        
        foreach ($children as $childId) {
            $ids[] = $childId;
            $ids = array_merge($ids, $this->getSubcategoryIds($childId));
        }
        
        return $ids;
    }

    // ========== ANALYTICS HELPERS ==========

    /**
     * Get detailed usage statistics
     */
    public function getStatistics(): array
    {
        $usages = $this->usages();

        return [
            'total_uses' => $usages->count(),
            'unique_users' => $usages->distinct('user_id')->count('user_id'),
            'total_discount_given' => round($usages->sum('discount_amount'), 2),
            'total_order_value' => round($usages->sum('order_total'), 2),
            'average_discount' => round($usages->avg('discount_amount') ?? 0, 2),
            'average_order_value' => round($usages->avg('order_total') ?? 0, 2),
            'remaining_uses' => $this->remaining_uses,
            'conversion_rate' => $this->usage_limit 
                ? round(($this->used_count / $this->usage_limit) * 100, 1) . '%'
                : 'N/A',
        ];
    }

    /**
     * Get usage trend data for charts
     */
    public function getUsageTrend(int $days = 30): Collection
    {
        return $this->usages()
            ->selectRaw('DATE(used_at) as date, COUNT(*) as count, SUM(discount_amount) as total_discount')
            ->where('used_at', '>=', now()->subDays($days))
            ->groupBy('date')
            ->orderBy('date')
            ->get();
    }

    /**
     * Get top users for this promo code
     */
    public function getTopUsers(int $limit = 10): Collection
    {
        return $this->usages()
            ->selectRaw('user_id, COUNT(*) as usage_count, SUM(discount_amount) as total_discount, SUM(order_total) as total_spent')
            ->with('user:id,name,email,phone')
            ->groupBy('user_id')
            ->orderByDesc('usage_count')
            ->limit($limit)
            ->get();
    }

    // ========== SMART SUGGESTIONS ==========

    /**
     * Check what user needs to do to use this promo
     */
    public function getSuggestionsForUser(int $userId, array $cartItems, float $orderTotal, bool $isFirstOrder): array
    {
        $suggestions = [];
        $validation = $this->validateForUser($userId, $orderTotal, $isFirstOrder);

        if ($validation['valid']) {
            return ['eligible' => true, 'suggestions' => []];
        }

        // Minimum order suggestion
        if ($this->minimum_order && $orderTotal < $this->minimum_order) {
            $needed = $this->minimum_order - $orderTotal;
            $suggestions[] = [
                'type' => 'add_amount',
                'message' => "Add EGP {$needed} more to your cart",
                'amount_needed' => $needed,
            ];
        }

        // Product-specific suggestions
        if ($this->applies_to === 'product' && $this->products->count() > 0) {
            $cartProductIds = array_column($cartItems, 'product_id');
            $eligibleProducts = $this->products->pluck('id')->toArray();
            
            if (!array_intersect($cartProductIds, $eligibleProducts)) {
                $suggestions[] = [
                    'type' => 'add_product',
                    'message' => 'Add an eligible product to your cart',
                    'products' => $this->products->take(5)->pluck('name', 'id')->toArray(),
                ];
            }
        }

        // Category-specific suggestions
        if ($this->applies_to === 'category' && $this->categories->count() > 0) {
            $eligibleCategoryIds = $this->getEligibleCategoryIds();
            $hasEligibleProduct = false;
            
            foreach ($cartItems as $item) {
                $product = Product::find($item['product_id']);
                if ($product && in_array($product->category_id, $eligibleCategoryIds)) {
                    $hasEligibleProduct = true;
                    break;
                }
            }

            if (!$hasEligibleProduct) {
                $suggestions[] = [
                    'type' => 'add_category',
                    'message' => 'Add a product from an eligible category',
                    'categories' => $this->categories->pluck('name', 'id')->toArray(),
                ];
            }
        }

        // BOGO suggestions
        if ($this->type === 'bogo') {
            foreach ($this->activeBogoRules as $rule) {
                $buyResult = $rule->checkBuyCondition($cartItems);
                if (!$buyResult['qualifies']) {
                    $needed = $rule->buy_qty - $buyResult['total_qty'];
                    $suggestions[] = [
                        'type' => 'bogo_progress',
                        'message' => "Add {$needed} more items to unlock: {$rule->description}",
                        'progress' => [
                            'current' => $buyResult['total_qty'],
                            'required' => $rule->buy_qty,
                            'percentage' => ($buyResult['total_qty'] / $rule->buy_qty) * 100,
                        ],
                    ];
                }
            }
        }

        return [
            'eligible' => false,
            'errors' => $validation['errors'],
            'suggestions' => $suggestions,
        ];
    }

    // ========== SCOPES ==========

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where('valid_from', '<=', now())
            ->where('valid_until', '>=', now());
    }

    public function scopeAvailable($query)
    {
        return $query->active()
            ->where(function ($q) {
                $q->whereNull('usage_limit')
                    ->orWhereRaw('used_count < usage_limit');
            });
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
