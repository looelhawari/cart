<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromoCodeBogoRule extends Model
{
    protected $fillable = [
        'promo_code_id',
        'buy_scope',           // 'any', 'product', 'category'
        'buy_product_id',
        'buy_category_id',
        'buy_include_subcategories',
        'buy_qty',
        'get_scope',           // 'same', 'product', 'category'
        'get_product_id',
        'get_category_id',
        'get_include_subcategories',
        'get_qty',
        'get_discount_type',   // 'percentage', 'fixed', 'free'
        'get_discount_value',
        'max_applications_per_order',
        'is_active',
    ];

    protected $casts = [
        'buy_include_subcategories' => 'boolean',
        'buy_qty' => 'integer',
        'get_include_subcategories' => 'boolean',
        'get_qty' => 'integer',
        'get_discount_value' => 'decimal:2',
        'max_applications_per_order' => 'integer',
        'is_active' => 'boolean',
    ];

    // ========== RELATIONSHIPS ==========

    public function promoCode(): BelongsTo
    {
        return $this->belongsTo(PromoCode::class);
    }

    public function buyProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'buy_product_id', 'barcode');
    }

    public function buyCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'buy_category_id');
    }

    public function getProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'get_product_id', 'barcode');
    }

    public function getCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'get_category_id');
    }

    // ========== BOGO LOGIC ==========

    /**
     * Check if cart items satisfy the "buy" condition
     */
    public function checkBuyCondition(array $cartItems): array
    {
        $qualifyingItems = [];
        $totalQualifyingQty = 0;

        foreach ($cartItems as $item) {
            $qualifies = false;

            switch ($this->buy_scope) {
                case 'any':
                    $qualifies = true;
                    break;

                case 'product':
                    $qualifies = $item['product_id'] == $this->buy_product_id;
                    break;

                case 'category':
                    $qualifies = $this->itemMatchesCategory(
                        $item['product_id'], 
                        $this->buy_category_id, 
                        $this->buy_include_subcategories
                    );
                    break;
            }

            if ($qualifies) {
                $qualifyingItems[] = $item;
                $totalQualifyingQty += $item['quantity'];
            }
        }

        return [
            'qualifies' => $totalQualifyingQty >= $this->buy_qty,
            'qualifying_items' => $qualifyingItems,
            'total_qty' => $totalQualifyingQty,
            'times_qualified' => floor($totalQualifyingQty / $this->buy_qty),
        ];
    }

    /**
     * Get the items that are eligible for the "get" discount
     */
    public function getEligibleItems(array $cartItems, array $buyResult): array
    {
        $eligibleItems = [];

        foreach ($cartItems as $item) {
            $eligible = false;

            switch ($this->get_scope) {
                case 'same':
                    foreach ($buyResult['qualifying_items'] as $buyItem) {
                        if ($item['product_id'] == $buyItem['product_id']) {
                            $eligible = true;
                            break;
                        }
                    }
                    break;

                case 'product':
                    $eligible = $item['product_id'] == $this->get_product_id;
                    break;

                case 'category':
                    $eligible = $this->itemMatchesCategory(
                        $item['product_id'],
                        $this->get_category_id,
                        $this->get_include_subcategories
                    );
                    break;
            }

            if ($eligible) {
                $eligibleItems[] = $item;
            }
        }

        return $eligibleItems;
    }

    /**
     * Calculate discount for eligible items
     */
    public function calculateDiscount(array $eligibleItems, int $timesQualified): float
    {
        $maxApplications = $this->max_applications_per_order ?? PHP_INT_MAX;
        $actualApplications = min($timesQualified, $maxApplications);
        $remainingGetQty = $this->get_qty * $actualApplications;
        
        $totalDiscount = 0;
        
        // Sort by price (cheapest first for BOGO - customer-friendly)
        usort($eligibleItems, fn($a, $b) => $a['price'] <=> $b['price']);
        
        foreach ($eligibleItems as $item) {
            if ($remainingGetQty <= 0) break;
            
            $qtyToDiscount = min($item['quantity'], $remainingGetQty);
            $itemPrice = $item['price'];
            
            switch ($this->get_discount_type) {
                case 'free':
                    $totalDiscount += $itemPrice * $qtyToDiscount;
                    break;
                    
                case 'percentage':
                    $totalDiscount += ($itemPrice * $this->get_discount_value / 100) * $qtyToDiscount;
                    break;
                    
                case 'fixed':
                    $totalDiscount += min($this->get_discount_value, $itemPrice) * $qtyToDiscount;
                    break;
            }
            
            $remainingGetQty -= $qtyToDiscount;
        }
        
        return round($totalDiscount, 2);
    }

    /**
     * Full BOGO calculation for cart
     */
    public function applyToCart(array $cartItems): array
    {
        if (!$this->is_active) {
            return ['discount' => 0, 'applied' => false, 'message' => 'BOGO rule is not active'];
        }

        $buyResult = $this->checkBuyCondition($cartItems);
        
        if (!$buyResult['qualifies']) {
            $needed = $this->buy_qty - $buyResult['total_qty'];
            return [
                'discount' => 0,
                'applied' => false,
                'message' => "Add {$needed} more qualifying items to unlock this deal",
                'progress' => [
                    'current' => $buyResult['total_qty'],
                    'required' => $this->buy_qty,
                    'percentage' => min(100, ($buyResult['total_qty'] / $this->buy_qty) * 100),
                ],
            ];
        }

        $eligibleItems = $this->getEligibleItems($cartItems, $buyResult);
        
        if (empty($eligibleItems)) {
            return [
                'discount' => 0,
                'applied' => false,
                'message' => 'Add eligible items to receive your free/discounted items',
            ];
        }

        $discount = $this->calculateDiscount($eligibleItems, $buyResult['times_qualified']);
        
        return [
            'discount' => $discount,
            'applied' => $discount > 0,
            'message' => $discount > 0 ? $this->description : 'No discount applied',
            'times_applied' => min($buyResult['times_qualified'], $this->max_applications_per_order ?? PHP_INT_MAX),
            'eligible_items' => count($eligibleItems),
        ];
    }

    // ========== HELPERS ==========

    /**
     * Check if a product belongs to a category (with optional subcategories)
     */
    protected function itemMatchesCategory(int $productId, int $categoryId, bool $includeSubcategories): bool
    {
        $product = Product::find($productId);
        if (!$product) return false;

        if ($product->category_id == $categoryId) {
            return true;
        }

        if ($includeSubcategories) {
            $subcategoryIds = $this->getSubcategoryIds($categoryId);
            return in_array($product->category_id, $subcategoryIds);
        }

        return false;
    }

    /**
     * Get all subcategory IDs recursively
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

    /**
     * Get a human-readable description
     */
    public function getDescriptionAttribute(): string
    {
        $buy = "Buy {$this->buy_qty} ";
        switch ($this->buy_scope) {
            case 'any':
                $buy .= "any items";
                break;
            case 'product':
                $buy .= $this->buyProduct?->name ?? 'product';
                break;
            case 'category':
                $buy .= "from " . ($this->buyCategory?->name ?? 'category');
                if ($this->buy_include_subcategories) $buy .= " (+ subcategories)";
                break;
        }

        $get = ", Get {$this->get_qty} ";
        switch ($this->get_scope) {
            case 'same':
                $get .= "of the same";
                break;
            case 'product':
                $get .= $this->getProduct?->name ?? 'product';
                break;
            case 'category':
                $get .= "from " . ($this->getCategory?->name ?? 'category');
                break;
        }

        switch ($this->get_discount_type) {
            case 'free':
                $get .= " FREE";
                break;
            case 'percentage':
                $get .= " at {$this->get_discount_value}% off";
                break;
            case 'fixed':
                $get .= " EGP {$this->get_discount_value} off";
                break;
        }

        return $buy . $get;
    }
}
