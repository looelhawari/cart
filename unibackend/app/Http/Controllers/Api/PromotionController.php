<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use App\Services\PromotionService;
use Illuminate\Http\Request;

class PromotionController extends Controller
{
    protected PromotionService $promotionService;

    public function __construct(PromotionService $promotionService)
    {
        $this->promotionService = $promotionService;
    }

    /**
     * Get all active promotions (for mobile app)
     */
    public function index(Request $request)
    {
        try {
            $type = $request->input('type');
            $categoryId = $request->input('category_id');

            $promotions = $this->promotionService->getActivePromotions($type, $categoryId);

            return response()->json([
                'success' => true,
                'data' => [
                    'promotions' => $promotions,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch promotions',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get featured promotion (for homepage hero banner)
     */
    public function featured()
    {
        try {
            $promotion = $this->promotionService->getFeaturedPromotion();

            if (!$promotion) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'promotion' => null,
                    ],
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'promotion' => $promotion,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch featured promotion',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single promotion details (for mobile app)
     */
    public function show($id)
    {
        try {
            $promotion = Promotion::active()
                ->with(['categories', 'products'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'promotion' => $promotion,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Promotion not found',
            ], 404);
        }
    }

    /**
     * Get products in a promotion (for mobile app)
     */
    public function products($id)
    {
        try {
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

            return response()->json([
                'success' => true,
                'data' => [
                    'promotion' => $promotion,
                    'products' => $products,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch promotion products',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
