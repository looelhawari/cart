<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Models\Promotion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Enterprise-grade search suggestions controller.
 * Provides typeahead/autocomplete results for the mobile search bar.
 * Cached in Redis for blazing-fast responses.
 */
class SearchSuggestionsController extends Controller
{
    /**
     * GET /api/v1/search/suggestions?q={query}
     *
     * Returns lightweight suggestions grouped by type:
     * - products: top 5 matching product names + barcode + image
     * - categories: top 3 matching categories
     * - offers: top 3 matching active offers/promotions
     *
     * Cached per normalized query prefix for 3 minutes.
     */
    public function suggestions(Request $request): JsonResponse
    {
        $query = trim($request->input('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json([
                'success' => true,
                'data' => [
                    'products' => [],
                    'categories' => [],
                    'offers' => [],
                ],
            ]);
        }

        // Normalize: lowercase, limit length
        $normalized = mb_strtolower(mb_substr($query, 0, 50));
        $cacheKey = 'search:suggestions:' . md5($normalized);

        $suggestions = Cache::remember($cacheKey, 180, function () use ($normalized) {
            return [
                'products' => $this->suggestProducts($normalized),
                'categories' => $this->suggestCategories($normalized),
                'offers' => $this->suggestOffers($normalized),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $suggestions,
        ]);
    }

    /**
     * GET /api/v1/search/popular
     *
     * Returns popular/trending searches based on real product data.
     * Cached for 30 minutes.
     */
    public function popular(): JsonResponse
    {
        $data = Cache::remember('search:popular', 1800, function () {
            // Top categories with product counts
            $topCategories = Category::where('is_active', true)
                ->whereNotNull('parent_id') // subcategories only
                ->withCount(['products' => function ($q) {
                    $q->where('is_active', true)->where('stock_quantity', '>', 0);
                }])
                ->having('products_count', '>', 0)
                ->orderByDesc('products_count')
                ->limit(8)
                ->get(['id', 'name_en', 'name_ar', 'image'])
                ->map(fn($c) => [
                    'id' => $c->id,
                    'name_en' => $c->name_en,
                    'name_ar' => $c->name_ar,
                    'image' => $c->image,
                    'product_count' => $c->products_count,
                ]);

            // Popular search terms derived from best-selling products
            $trendingProducts = Product::where('is_active', true)
                ->where('stock_quantity', '>', 0)
                ->orderByDesc('sales_count')
                ->limit(10)
                ->get(['name_en', 'name_ar'])
                ->map(fn($p) => [
                    'term_en' => $p->name_en,
                    'term_ar' => $p->name_ar,
                ]);

            // Active offers count (uses Promotion model)
            $activeOffersCount = Promotion::active()->count();

            return [
                'top_categories' => $topCategories,
                'trending_searches' => $trendingProducts,
                'active_offers_count' => $activeOffersCount,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Suggest products matching the query (top 5).
     * Uses LIKE on name_en + name_ar. Returns minimal data.
     */
    private function suggestProducts(string $query): array
    {
        return Product::where('is_active', true)
            ->where('stock_quantity', '>', 0)
            ->where(function ($q) use ($query) {
                $q->where('name_en', 'LIKE', "%{$query}%")
                  ->orWhere('name_ar', 'LIKE', "%{$query}%")
                  ->orWhere('barcode', 'LIKE', "{$query}%");
            })
            ->orderByDesc('sales_count') // best sellers first
            ->limit(5)
            ->get(['barcode', 'name_en', 'name_ar', 'price', 'sale_price', 'image_url', 'unit'])
            ->map(fn($p) => [
                'barcode' => $p->barcode,
                'name_en' => $p->name_en,
                'name_ar' => $p->name_ar,
                'price' => (float) $p->price,
                'sale_price' => $p->sale_price ? (float) $p->sale_price : null,
                'image_url' => $p->image_url,
                'unit' => $p->unit,
            ])
            ->toArray();
    }

    /**
     * Suggest categories matching the query (top 3).
     */
    private function suggestCategories(string $query): array
    {
        return Category::where('is_active', true)
            ->where(function ($q) use ($query) {
                $q->where('name_en', 'LIKE', "%{$query}%")
                  ->orWhere('name_ar', 'LIKE', "%{$query}%");
            })
            ->withCount(['products' => function ($q) {
                $q->where('is_active', true);
            }])
            ->orderByDesc('products_count')
            ->limit(3)
            ->get(['id', 'name_en', 'name_ar', 'image'])
            ->map(fn($c) => [
                'id' => $c->id,
                'name_en' => $c->name_en,
                'name_ar' => $c->name_ar,
                'image' => $c->image,
                'product_count' => $c->products_count,
            ])
            ->toArray();
    }

    /**
     * Suggest active offers/promotions matching the query (top 3).
     */
    private function suggestOffers(string $query): array
    {
        return Promotion::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', now());
            })
            ->where(function ($q) use ($query) {
                $q->where('title_en', 'LIKE', "%{$query}%")
                  ->orWhere('title_ar', 'LIKE', "%{$query}%")
                  ->orWhere('description_en', 'LIKE', "%{$query}%")
                  ->orWhere('description_ar', 'LIKE', "%{$query}%");
            })
            ->orderByDesc('priority')
            ->limit(3)
            ->get(['id', 'title_en', 'title_ar', 'discount_type', 'discount_value', 'image'])
            ->map(fn($p) => [
                'id' => $p->id,
                'title_en' => $p->title_en,
                'title_ar' => $p->title_ar,
                'discount_type' => $p->discount_type,
                'discount_value' => (float) $p->discount_value,
                'image' => $p->image,
            ])
            ->toArray();
    }
}
