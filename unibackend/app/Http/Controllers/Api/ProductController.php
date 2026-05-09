<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    /**
     * Cache TTL in seconds (5 minutes for product lists)
     */
    protected const CACHE_TTL = 300;

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
            // SECURITY HARDENED (audit C3 — Redis key DoS):
            // Cache key was built from md5(json_encode($request->all())),
            // letting an attacker spam random query-string params and fill
            // Redis with junk entries (each cached for CACHE_TTL). We now
            // build the key from a small whitelist of allowed filters,
            // normalised, so noise parameters don't create new keys.
            $cacheParams = [
                'category_id' => $request->get('category_id'),
                'search' => is_string($request->get('search')) ? mb_substr(mb_strtolower($request->get('search')), 0, 50) : null,
                'on_sale' => $request->boolean('on_sale') ? 1 : 0,
                'min_price' => $request->get('min_price'),
                'max_price' => $request->get('max_price'),
                'min_rating' => $request->get('min_rating'),
                'in_stock' => $request->boolean('in_stock') ? 1 : 0,
                'sort_by' => $request->get('sort_by'),
                'sort_order' => $request->get('sort_order'),
                'page' => (int) $request->get('page', 1),
                'per_page' => min((int) $request->get('per_page', 20), 100),
            ];
            $cacheKey = 'products:list:' . md5(json_encode($cacheParams));

            $result = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($request) {
                $query = Product::select('barcode', 'name_en', 'name_ar', 'slug', 'image', 'price', 'sale_price', 'stock_quantity', 'is_in_stock', 'weight', 'unit', 'rating', 'review_count', 'is_featured', 'sales_count', 'created_at', 'active_promotion_id')
                    ->with(['categories:id,name_en,name_ar'])
                    ->where('is_active', true);

                // Filter by category
                if ($request->has('category_id')) {
                    $query->whereHas('categories', function ($q) use ($request) {
                        $q->where('categories.id', $request->category_id);
                    });
                }

                // Search by name/description (use FULLTEXT for performance, fallback to LIKE)
                if ($request->has('search')) {
                    $search = $request->search;
                    $query->where(function ($q) use ($search) {
                        // Use FULLTEXT MATCH...AGAINST for indexed search
                        $q->whereRaw('MATCH(name_en, name_ar) AGAINST(? IN BOOLEAN MODE)', ['+' . $search . '*'])
                          ->orWhere('name_en', 'like', "%{$search}%")
                          ->orWhere('name_ar', 'like', "%{$search}%")
                          ->orWhere('description_en', 'like', "%{$search}%")
                          ->orWhere('description_ar', 'like', "%{$search}%");
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
                    $query->where('is_in_stock', true)->where('stock_quantity', '>', 0);
                }

                // Sorting (whitelisted to prevent SQL injection)
                $allowedSorts = ['price', 'rating', 'name_en', 'name_ar', 'popularity', 'created_at', 'sales_count'];
                $sortBy = in_array($request->get('sort_by'), $allowedSorts)
                    ? $request->get('sort_by')
                    : 'created_at';
                $sortOrder = strtolower($request->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

                switch ($sortBy) {
                    case 'price':
                        $query->orderByRaw('COALESCE(sale_price, price) ' . $sortOrder);
                        break;
                    case 'rating':
                        $query->orderBy('rating', $sortOrder);
                        break;
                    case 'name_en':
                    case 'name_ar':
                        $query->orderBy($sortBy, $sortOrder);
                        break;
                    case 'popularity':
                    case 'sales_count':
                        $query->orderBy('sales_count', 'desc');
                        break;
                    default:
                        $query->orderBy('created_at', $sortOrder);
                }

                $perPage = min($request->get('per_page', 20), 100); // Cap at 100
                $products = $query->paginate($perPage);

                return [
                    'products' => $products->items(),
                    'pagination' => [
                        'current_page' => $products->currentPage(),
                        'per_page' => $products->perPage(),
                        'total' => $products->total(),
                        'last_page' => $products->lastPage(),
                    ],
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $result,
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('product.fetch_failed'),
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
            // Cache individual products for 10 minutes
            $cacheKey = "products:single:{$barcode}";

            $product = Cache::remember($cacheKey, 600, function () use ($barcode) {
                return Product::with(['categories'])
                    ->where('barcode', $barcode)
                    ->where('is_active', true)
                    ->first();
            });

            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => __('product.not_found'),
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => ['product' => $product],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('product.not_found'),
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
            // Cache featured products for 5 minutes
            $products = Cache::remember('products:featured', self::CACHE_TTL, function () {
                return Product::select('barcode', 'name_en', 'name_ar', 'slug', 'image', 'price', 'sale_price', 'stock_quantity', 'is_in_stock', 'weight', 'unit', 'rating', 'review_count', 'is_featured', 'sales_count')
                    ->with(['categories:id,name_en,name_ar'])
                    ->where('is_active', true)
                    ->where('is_featured', true)
                    ->orderBy('created_at', 'desc')
                    ->limit(20)
                    ->get();
            });

            return response()->json([
                'success' => true,
                'data' => ['products' => $products],
            ], 200, ['Content-Type' => 'application/json; charset=utf-8'], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('product.featured_fetch_failed'),
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
            // Cache flash deals for 5 minutes
            $products = Cache::remember('products:flash-deals', self::CACHE_TTL, function () {
                return Product::select('barcode', 'name_en', 'name_ar', 'slug', 'image', 'price', 'sale_price', 'stock_quantity', 'is_in_stock', 'weight', 'unit', 'rating', 'review_count', 'sales_count')
                    ->with(['categories:id,name_en,name_ar'])
                    ->where('is_active', true)
                    ->whereNotNull('sale_price')
                    ->orderByRaw('((price - sale_price) / price) DESC')
                    ->limit(20)
                    ->get();
            });

            return response()->json([
                'success' => true,
                'data' => ['products' => $products],
            ], 200, ['Content-Type' => 'application/json; charset=utf-8'], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('product.flash_deals_fetch_failed'),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Clear product cache (call when products are updated)
     */
    public static function clearCache(?int $barcode = null): void
    {
        if ($barcode) {
            Cache::forget("products:single:{$barcode}");
        }

        // Clear list caches
        Cache::forget('products:featured');
        Cache::forget('products:flash-deals');

        // Note: For list caches with dynamic keys, consider using cache tags
        // Cache::tags(['products'])->flush();
    }
}
