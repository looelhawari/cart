<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * Get all products with optional filters
     * GET /api/v1/products
     * Query params:
     * - category_id: Filter by category
     * - search: Search in product name
     * - on_sale: Filter sale items
     * - sort_by: price|rating|created_at|popularity|name_en
     * - sort_order: asc|desc
     * - min_price, max_price: Price range
     * - min_rating: Minimum rating filter
     * - in_stock: 1 to show only in-stock items
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Product::with(['categories'])
                ->where('is_active', true);

            // Filter by category
            if ($request->has('category_id')) {
                $query->whereHas('categories', function ($q) use ($request) {
                    $q->where('categories.id', $request->category_id);
                });
            }

            // Search by name
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name_en', 'like', "%{$search}%")
                      ->orWhere('name_ar', 'like', "%{$search}%");
                });
            }

            // Filter by sale items
            if ($request->boolean('on_sale')) {
                $query->whereNotNull('sale_price');
            }

            // Price filters
            if ($minPrice = $request->get('min_price')) {
                $query->whereRaw('COALESCE(sale_price, price) >= ?', [$minPrice]);
            }
            if ($maxPrice = $request->get('max_price')) {
                $query->whereRaw('COALESCE(sale_price, price) <= ?', [$maxPrice]);
            }

            // Rating filter
            if ($minRating = $request->get('min_rating')) {
                $query->where('rating', '>=', $minRating);
            }

            // Stock filter
            if ($request->get('in_stock') == '1') {
                $query->where('stock_quantity', '>', 0);
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');

            switch ($sortBy) {
                case 'price':
                    $query->orderByRaw('COALESCE(sale_price, price) ' . $sortOrder);
                    break;
                case 'rating':
                    $query->orderBy('rating', $sortOrder);
                    break;
                case 'name_en':
                    $query->orderBy('name_en', $sortOrder);
                    break;
                case 'popularity':
                    $query->orderBy('sales_count', 'desc');
                    break;
                default:
                    $query->orderBy($sortBy, $sortOrder);
            }

            $perPage = $request->get('per_page', 20);
            $products = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => [
                    'products' => $products->items(),
                    'pagination' => [
                        'current_page' => $products->currentPage(),
                        'per_page' => $products->perPage(),
                        'total' => $products->total(),
                        'last_page' => $products->lastPage(),
                    ],
                ],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve products',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single product by barcode
     * GET /api/v1/products/{barcode}
     */
    public function show($barcode): JsonResponse
    {
        try {
            $product = Product::with(['categories'])
                ->where('barcode', $barcode)
                ->where('is_active', true)
                ->firstOrFail();

            return response()->json([
                'success' => true,
                'data' => ['product' => $product],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
            ], 404);
        }
    }

    /**
     * Get featured products
     * GET /api/v1/products/featured
     */
    public function featured(): JsonResponse
    {
        try {
            $products = Product::with(['categories'])
                ->where('is_active', true)
                ->where('is_featured', true)
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get();

            return response()->json([
                'success' => true,
                'data' => ['products' => $products],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve featured products',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get products on sale (flash deals)
     * GET /api/v1/products/flash-deals
     */
    public function flashDeals(): JsonResponse
    {
        try {
            $products = Product::with(['categories'])
                ->where('is_active', true)
                ->whereNotNull('sale_price')
                ->orderByRaw('((price - sale_price) / price) DESC')
                ->limit(20)
                ->get();

            return response()->json([
                'success' => true,
                'data' => ['products' => $products],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve flash deals',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
