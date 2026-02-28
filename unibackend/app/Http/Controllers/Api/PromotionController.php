<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use App\Services\PromotionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PromotionController extends Controller
{
    protected PromotionService $promotionService;

    public function __construct(PromotionService $promotionService)
    {
        $this->promotionService = $promotionService;
    }

    /**
     * Get all active promotions (for mobile app)
     * Cached for 5 minutes, keyed by type + category_id
     */
    public function index(Request $request)
    {
        try {
            $type = $request->input('type');
            $categoryId = $request->input('category_id');
            $cacheKey = 'promotions:active:' . md5(($type ?? 'all') . ':' . ($categoryId ?? 'all'));

            $promotions = Cache::remember($cacheKey, 300, function () use ($type, $categoryId) {
                return $this->promotionService->getActivePromotions($type, $categoryId);
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'promotions' => $promotions,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('promotion.fetch_failed'),
            ], 500);
        }
    }

    /**
     * Get featured promotions (for homepage hero banner)
     * Cached for 5 minutes
     */
    public function featured()
    {
        try {
            $promotions = Cache::remember('promotions:featured', 300, function () {
                return $this->promotionService->getFeaturedPromotions();
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'promotions' => $promotions,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('promotion.featured_fetch_failed'),
            ], 500);
        }
    }

    /**
     * Get single promotion details (for mobile app)
     * Cached for 10 minutes per promotion ID
     */
    public function show($id)
    {
        try {
            $promotion = Cache::remember("promotions:single:{$id}", 600, function () use ($id) {
                return Promotion::active()
                    ->with(['categories', 'products'])
                    ->findOrFail($id);
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'promotion' => $promotion,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('promotion.not_found'),
            ], 404);
        }
    }

    /**
     * Get products in a promotion (for mobile app)
     * Cached for 5 minutes per promotion ID
     */
    public function products($id)
    {
        try {
            $result = Cache::remember("promotions:products:{$id}", 300, function () use ($id) {
                $promotion = Promotion::active()->findOrFail($id);

                $products = $promotion->applies_to === 'all'
                    ? \App\Models\Product::where('is_active', true)
                        ->where('active_promotion_id', $id)
                        ->with('categories')
                        ->get()
                    : $promotion->products()
                        ->where('products.is_active', true)
                        ->with('categories')
                        ->get();

                return [
                    'promotion' => $promotion,
                    'products' => $products,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('promotion.products_fetch_failed'),
            ], 500);
        }
    }

    /**
     * Clear promotion caches
     */
    public static function clearCache(?int $id = null): void
    {
        Cache::forget('promotions:featured');
        if ($id) {
            Cache::forget("promotions:single:{$id}");
            Cache::forget("promotions:products:{$id}");
        }
    }
}
