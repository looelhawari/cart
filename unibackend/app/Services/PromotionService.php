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
     * Apply best promotion to a product.
     *
     * $excludePromotionId skips a promotion that is being deleted: it is
     * still active in the DB at removal time, so without the exclusion it
     * would re-apply itself and the sale would survive its own deletion.
     */
    public function applyBestPromotionToProduct(Product $product, ?int $excludePromotionId = null): Product
    {
        // Get all applicable promotions
        $promotions = $this->getApplicablePromotions($product, $excludePromotionId);

        if ($promotions->isEmpty()) {
            // No promotions — always clear the sale, even when original_price
            // was never set (e.g. legacy rows where sale_price was written
            // directly). Guarding the reset on original_price left those
            // stale sales permanently uncleable.
            if ($product->original_price) {
                $product->price = $product->original_price;
            }
            $product->sale_price = null;
            $product->active_promotion_id = null;
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
    protected function getApplicablePromotions(Product $product, ?int $excludePromotionId = null): Collection
    {
        $productCategories = $product->categories->pluck('id');

        return Promotion::active()
            ->when($excludePromotionId, fn ($q) => $q->where('id', '!=', $excludePromotionId))
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
        $updated = 0;

        // Eager-load categories to prevent N+1, chunkById to save memory.
        // chunkById (keyset pagination) — NOT chunk() — because plain chunk
        // paginates with OFFSET and skips rows when the loop mutates columns
        // used in the WHERE clause.
        $this->getProductQueryForPromotion($promotion)
            ->with('categories')
            ->chunkById(200, function ($products) use (&$updated) {
                foreach ($products as $product) {
                    $this->applyBestPromotionToProduct($product);
                    $product->save();
                    $updated++;
                }
            }, 'barcode');

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
     * Get products query builder for a promotion (supports ->chunk() and ->get()).
     * Returns a query builder, not a collection — avoids double count+get queries.
     */
    protected function getProductQueryForPromotion(Promotion $promotion)
    {
        // Eager-load counts once to avoid repeated queries
        $promotion->loadCount(['products', 'categories']);

        if ($promotion->products_count > 0) {
            return $promotion->products()->where('products.is_active', true);
        }

        if ($promotion->categories_count > 0) {
            $categoryIds = $promotion->categories()->pluck('categories.id');
            return Product::whereHas('categories', function ($q) use ($categoryIds) {
                $q->whereIn('categories.id', $categoryIds);
            })->where('is_active', true);
        }

        return Product::where('is_active', true);
    }

    /**
     * Remove promotion from products
     */
    public function removePromotionFromProducts(Promotion $promotion): array
    {
        $updated = 0;

        // Eager-load categories + chunkById to prevent N+1 and memory overflow.
        // The promotion being removed is excluded from re-evaluation — at
        // delete time it is still active in the DB and would otherwise be
        // picked as "best promotion" again, resurrecting the sale.
        //
        // chunkById is load-bearing: the loop nulls active_promotion_id,
        // which is the WHERE column. Plain chunk() paginates with OFFSET, so
        // every cleared page shifted the result set and SKIPPED the next 200
        // products — they kept their sale_price, and the promotion's FK
        // (ON DELETE SET NULL) then erased the only pointer back to it.
        Product::where('active_promotion_id', $promotion->id)
            ->with('categories')
            ->chunkById(200, function ($products) use (&$updated, $promotion) {
                foreach ($products as $product) {
                    $this->applyBestPromotionToProduct($product, $promotion->id);
                    $product->save();
                    $updated++;
                }
            }, 'barcode');

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
        $updated = 0;

        // chunkById + eager-load to prevent memory overflow and N+1 queries
        Product::where('is_active', true)
            ->with('categories')
            ->chunkById(200, function ($products) use (&$updated) {
                foreach ($products as $product) {
                    $this->applyBestPromotionToProduct($product);
                    $product->save();
                    $updated++;
                }
            }, 'barcode');

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
     * Get featured promotions for homepage banner
     */
    public function getFeaturedPromotions(): Collection
    {
        return Promotion::featured()->get();
    }

    /**
     * Get featured promotion for homepage banner (backward compatibility)
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

        // Get products with this promotion — only fetch needed price columns
        $products = Product::where('active_promotion_id', $promotionId)
            ->select('barcode', 'price', 'original_price', 'sale_price', 'active_promotion_id')
            ->get();

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
