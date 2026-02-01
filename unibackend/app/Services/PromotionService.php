<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Promotion;
use App\Models\Category;
use App\Models\PromoCode;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PromotionService
{
    /**
     * Apply best promotion to a product
     */
    public function applyBestPromotionToProduct(Product $product): Product
    {
        // Get all applicable promotions
        $promotions = $this->getApplicablePromotions($product);

        if ($promotions->isEmpty()) {
            // No promotions - reset to original price if it exists
            if ($product->original_price) {
                $product->price = $product->original_price;
                $product->sale_price = null;
                $product->active_promotion_id = null;
            }
            return $product;
        }

        // Find the best promotion (highest discount)
        $bestPromotion = $this->findBestPromotion($promotions, $product->price);

        if ($bestPromotion) {
            // Save original price if not already saved
            if (!$product->original_price) {
                $product->original_price = $product->price;
            }

            // Calculate and apply discount
            $discount = $bestPromotion->calculateDiscount($product->original_price ?? $product->price);
            $salePrice = ($product->original_price ?? $product->price) - $discount;

            $product->sale_price = max(0, round($salePrice, 2));
            $product->active_promotion_id = $bestPromotion->id;

            Log::info('✅ Promotion applied to product', [
                'product_barcode' => $product->barcode,
                'product_name' => $product->name_en,
                'promotion_id' => $bestPromotion->id,
                'promotion_title' => $bestPromotion->title,
                'original_price' => $product->original_price ?? $product->price,
                'discount' => $discount,
                'sale_price' => $product->sale_price,
            ]);
        }

        return $product;
    }

    /**
     * Get all promotions applicable to a product
     * Since database schema doesn't have applies_to, we return all active promotions
     * that either have no products/categories (applies to all) or match the product
     */
    protected function getApplicablePromotions(Product $product): Collection
    {
        $productCategories = $product->categories->pluck('id');

        return Promotion::active()
            ->where(function ($query) use ($product, $productCategories) {
                // Promotions with no specific products (applies to all)
                $query->whereDoesntHave('products')
                    // Or product-specific promotion
                    ->orWhereHas('products', function ($q) use ($product) {
                        $q->where('products.barcode', $product->barcode);
                    });

                // Also include category-based promotions
                if ($productCategories->isNotEmpty()) {
                    $query->orWhereHas('categories', function ($q) use ($productCategories) {
                        $q->whereIn('categories.id', $productCategories);
                    });
                }
            })
            ->get();
    }

    /**
     * Find the best promotion (highest discount) for a product
     */
    protected function findBestPromotion(Collection $promotions, float $price): ?Promotion
    {
        $bestPromotion = null;
        $highestDiscount = 0;

        foreach ($promotions as $promotion) {
            $discount = $promotion->calculateDiscount($price);

            if ($discount > $highestDiscount) {
                $highestDiscount = $discount;
                $bestPromotion = $promotion;
            }
        }

        return $bestPromotion;
    }

    /**
     * Bulk apply promotions to all affected products
     */
    public function applyPromotionToProducts(Promotion $promotion): array
    {
        $products = $this->getProductsForPromotion($promotion);
        $updated = 0;

        foreach ($products as $product) {
            $this->applyBestPromotionToProduct($product);
            $product->save();
            $updated++;
        }

        Log::info('📦 Bulk promotion applied', [
            'promotion_id' => $promotion->id,
            'promotion_title' => $promotion->title,
            'products_updated' => $updated,
        ]);

        return [
            'promotion_id' => $promotion->id,
            'products_updated' => $updated,
        ];
    }

    /**
     * Get products that should be affected by a promotion
     * Based on linked products/categories or all products if no specific links
     */
    protected function getProductsForPromotion(Promotion $promotion): Collection
    {
        // If promotion has specific products linked
        if ($promotion->products()->count() > 0) {
            return $promotion->products()->where('products.is_active', true)->get();
        }

        // If promotion has categories linked
        if ($promotion->categories()->count() > 0) {
            $categoryIds = $promotion->categories->pluck('id');
            return Product::whereHas('categories', function ($q) use ($categoryIds) {
                $q->whereIn('categories.id', $categoryIds);
            })->where('is_active', true)->get();
        }

        // No specific links - applies to all products
        return Product::where('is_active', true)->get();
    }

    /**
     * Remove promotion from products
     */
    public function removePromotionFromProducts(Promotion $promotion): array
    {
        $products = Product::where('active_promotion_id', $promotion->id)->get();
        $updated = 0;

        foreach ($products as $product) {
            // Reapply promotions to check if there's another active one
            $this->applyBestPromotionToProduct($product);
            $product->save();
            $updated++;
        }

        Log::info('🗑️ Promotion removed from products', [
            'promotion_id' => $promotion->id,
            'products_updated' => $updated,
        ]);

        return [
            'promotion_id' => $promotion->id,
            'products_updated' => $updated,
        ];
    }

    /**
     * Recalculate all product prices with active promotions
     */
    public function recalculateAllProductPrices(): array
    {
        $products = Product::where('is_active', true)->get();
        $updated = 0;

        foreach ($products as $product) {
            $this->applyBestPromotionToProduct($product);
            $product->save();
            $updated++;
        }

        Log::info('🔄 All product prices recalculated', [
            'products_updated' => $updated,
        ]);

        return [
            'products_updated' => $updated,
        ];
    }

    /**
     * Calculate cart discount with promotion + promo code stacking
     * Rule: Promotion discount + PromoCode discount can stack
     */
    public function calculateCartDiscount(
        float $subtotal,
        ?Promotion $promotion = null,
        ?PromoCode $promoCode = null
    ): array {
        $promotionDiscount = 0;
        $promoCodeDiscount = 0;
        $totalDiscount = 0;

        // Calculate promotion discount
        if ($promotion && $promotion->is_currently_active) {
            if ($subtotal >= $promotion->min_purchase) {
                $promotionDiscount = $promotion->calculateDiscount($subtotal);
            }
        }

        // Calculate promo code discount on remaining amount
        if ($promoCode) {
            $remainingAmount = $subtotal - $promotionDiscount;

            if ($promoCode->type === 'percentage') {
                $promoCodeDiscount = $remainingAmount * ($promoCode->value / 100);

                if ($promoCode->maximum_discount && $promoCodeDiscount > $promoCode->maximum_discount) {
                    $promoCodeDiscount = (float) $promoCode->maximum_discount;
                }
            } elseif ($promoCode->type === 'fixed_amount') {
                $promoCodeDiscount = min((float) $promoCode->value, $remainingAmount);
            }
        }

        $totalDiscount = $promotionDiscount + $promoCodeDiscount;

        return [
            'promotion_discount' => round($promotionDiscount, 2),
            'promo_code_discount' => round($promoCodeDiscount, 2),
            'total_discount' => round($totalDiscount, 2),
            'final_subtotal' => round($subtotal - $totalDiscount, 2),
        ];
    }

    /**
     * Get featured promotion for homepage banner
     */
    public function getFeaturedPromotion(): ?Promotion
    {
        return Promotion::featured()->first();
    }

    /**
     * Get all active promotions
     */
    public function getActivePromotions(?string $type = null, ?int $categoryId = null): Collection
    {
        $query = Promotion::active()->orderBy('is_featured', 'desc')->orderBy('created_at', 'desc');

        // Filter by promotion type (applies_to field) if specified
        if ($type && $type !== 'all') {
            $query->where('applies_to', $type);
        }

        if ($categoryId) {
            $query->whereHas('categories', function ($q) use ($categoryId) {
                $q->where('categories.id', $categoryId);
            });
        }

        return $query->get();
    }

    /**
     * Auto-activate/deactivate promotions based on dates (for cron job)
     */
    public function syncPromotionStatus(): array
    {
        $now = Carbon::now();
        $activated = 0;
        $deactivated = 0;

        // Activate promotions that should start
        $toActivate = Promotion::where('is_active', false)
            ->where('start_date', '<=', $now)
            ->where('end_date', '>=', $now)
            ->get();

        foreach ($toActivate as $promotion) {
            $promotion->update(['is_active' => true]);
            $this->applyPromotionToProducts($promotion);
            $activated++;
        }

        // Deactivate expired promotions
        $toDeactivate = Promotion::where('is_active', true)
            ->where('end_date', '<', $now)
            ->get();

        foreach ($toDeactivate as $promotion) {
            $promotion->update(['is_active' => false]);
            $this->removePromotionFromProducts($promotion);
            $deactivated++;
        }

        Log::info('⏰ Promotion status synced', [
            'activated' => $activated,
            'deactivated' => $deactivated,
        ]);

        return [
            'activated' => $activated,
            'deactivated' => $deactivated,
        ];
    }

    /**
     * Get promotion analytics
     */
    public function getPromotionAnalytics(int $promotionId): array
    {
        $promotion = Promotion::findOrFail($promotionId);

        // Get products with this promotion
        $products = Product::where('active_promotion_id', $promotionId)->get();

        // Basic analytics (can be extended with order data later)
        return [
            'promotion_id' => $promotionId,
            'title' => $promotion->title,
            'products_count' => $products->count(),
            'total_potential_savings' => $products->sum(function ($product) {
                return ($product->original_price ?? $product->price) - ($product->sale_price ?? $product->price);
            }),
            'is_active' => $promotion->is_currently_active,
            'time_remaining' => $promotion->time_remaining,
        ];
    }
}
