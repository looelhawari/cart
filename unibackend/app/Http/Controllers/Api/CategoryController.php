<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    /**
     * Cache TTL in seconds (10 minutes for categories - they change less often)
     */
    protected const CACHE_TTL = 600;

    /**
     * Get all categories with subcategories
     * GET /api/v1/categories
     */
    public function index(): JsonResponse
    {
        try {
            // Cache categories for 10 minutes - they rarely change
            $categories = Cache::remember('categories:all', self::CACHE_TTL, function () {
                return Category::with(['subcategories:id,parent_id,name_en,name_ar,slug,image,icon,sort_order,is_active'])
                    ->select('id', 'parent_id', 'name_en', 'name_ar', 'slug', 'description_en', 'description_ar', 'image', 'icon', 'sort_order', 'is_active')
                    ->whereNull('parent_id')
                    ->withCount('products')
                    ->orderBy('sort_order')
                    ->orderBy('name_en')
                    ->get();
            });

            return response()->json([
                'success' => true,
                'data' => ['categories' => $categories],
            ], 200, ['Content-Type' => 'application/json; charset=utf-8'], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('category.fetch_failed'),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get categories with their products for home page
     * GET /api/v1/categories/featured-with-products
     *
     * HEAVY QUERY - Cache aggressively (5 minutes)
     */
    public function featuredWithProducts(): JsonResponse
    {
        try {
            // This is a heavy query - cache for 5 minutes
            $categoriesWithProducts = Cache::remember('categories:featured-with-products', 300, function () {
                // Get top categories that have products
                $categories = Category::with(['subcategories'])
                    ->whereNull('parent_id')
                    ->has('products')
                    ->withCount('products')
                    ->orderBy('products_count', 'desc')
                    ->orderBy('sort_order')
                    ->limit(10)
                    ->get();

                // Batch-load products for ALL categories in ONE query (eliminates N+1)
                $categoryIds = $categories->pluck('id');

                // Single query: get all products for all featured categories
                $allProducts = \App\Models\Product::query()
                    ->select('barcode', 'name_en', 'name_ar', 'slug', 'image', 'price', 'sale_price', 'rating', 'sales_count', 'stock_quantity', 'is_in_stock', 'unit', 'packaging')
                    ->where('is_active', true)
                    ->whereHas('categories', function ($q) use ($categoryIds) {
                        $q->whereIn('categories.id', $categoryIds);
                    })
                    ->with(['categories:id,name_en,name_ar'])
                    ->orderBy('sales_count', 'desc')
                    ->get();

                // Group products by their categories (a product may belong to multiple)
                $productsByCategory = collect();
                foreach ($categoryIds as $catId) {
                    $productsByCategory[$catId] = $allProducts
                        ->filter(fn($p) => $p->categories->contains('id', $catId))
                        ->take(12)
                        ->values();
                }

                return $categories->map(function ($category) use ($productsByCategory) {
                    return [
                        'id' => $category->id,
                        'name_en' => $category->name_en,
                        'name_ar' => $category->name_ar,
                        'slug' => $category->slug,
                        'icon' => $category->icon,
                        'products_count' => $category->products_count,
                        'products' => $productsByCategory[$category->id] ?? collect(),
                    ];
                });
            });

            return response()->json([
                'success' => true,
                'data' => ['categories' => $categoriesWithProducts],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('category.with_products_fetch_failed'),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single category with products
     * GET /api/v1/categories/{id}
     */
    public function show($id): JsonResponse
    {
        try {
            // Cache individual categories for 10 minutes
            $category = Cache::remember("categories:single:{$id}", self::CACHE_TTL, function () use ($id) {
                return Category::with('subcategories')->find($id);
            });

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'message' => __('category.not_found'),
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => ['category' => $category],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('category.not_found'),
            ], 404);
        }
    }

    /**
     * Get category products
     * GET /api/v1/categories/{id}/products
     * Query params:
     * - subcategory_id: Filter by subcategory
     * - sort_by: price|rating|created_at|name_en
     * - sort_order: asc|desc
     * - min_price, max_price: Price range
     * - min_rating: Minimum rating filter
     * - in_stock: 1 to show only in-stock items
     */
    public function products($id): JsonResponse
    {
        try {
            // SECURITY HARDENED (audit C3): cache key built from a whitelisted
            // set of filters, NOT request()->all(). Prevents Redis-key flooding.
            $cacheParams = [
                'sort_by' => request()->query('sort_by'),
                'sort_order' => request()->query('sort_order'),
                'subcategory_id' => request()->query('subcategory_id'),
                'search' => is_string(request()->query('search')) ? mb_substr(mb_strtolower(request()->query('search')), 0, 50) : null,
                'min_price' => request()->query('min_price'),
                'max_price' => request()->query('max_price'),
                'min_rating' => request()->query('min_rating'),
                'in_stock' => request()->boolean('in_stock') ? 1 : 0,
                'page' => (int) request()->query('page', 1),
                'per_page' => min((int) request()->query('per_page', 20), 100),
            ];
            $cacheKey = "categories:{$id}:products:" . md5(json_encode($cacheParams));

            $result = Cache::remember($cacheKey, 300, function () use ($id) {
                $category = Category::with('subcategories')->findOrFail($id);

                $query = \App\Models\Product::with(['categories'])
                    ->where('is_active', true);

                // Filter by category or subcategory
                $subcategoryId = request()->get('subcategory_id');
                if ($subcategoryId) {
                    // Filter by specific subcategory
                    $query->whereHas('categories', function ($q) use ($subcategoryId) {
                        $q->where('categories.id', $subcategoryId);
                    });
                } else {
                    // Get all products from category and its subcategories
                    $categoryIds = [$id];
                    if ($category->subcategories->count() > 0) {
                        $categoryIds = array_merge($categoryIds, $category->subcategories->pluck('id')->toArray());
                    }
                    $query->whereHas('categories', function ($q) use ($categoryIds) {
                        $q->whereIn('categories.id', $categoryIds);
                    });
                }

                // Price filters
                if ($minPrice = request()->get('min_price')) {
                    $query->whereRaw('COALESCE(sale_price, price) >= ?', [$minPrice]);
                }
                if ($maxPrice = request()->get('max_price')) {
                    $query->whereRaw('COALESCE(sale_price, price) <= ?', [$maxPrice]);
                }

                // Rating filter
                if ($minRating = request()->get('min_rating')) {
                    $query->where('rating', '>=', $minRating);
                }

                // Stock filter
                if (request()->get('in_stock') == '1') {
                    $query->where('stock_quantity', '>', 0);
                }

                // Sorting (whitelisted to prevent SQL injection)
                $allowedSorts = ['price', 'rating', 'name_en', 'name_ar', 'popularity', 'created_at', 'sales_count'];
                $sortBy = in_array(request()->get('sort_by'), $allowedSorts)
                    ? request()->get('sort_by')
                    : 'created_at';
                $sortOrder = strtolower(request()->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

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

                $perPage = min(request()->get('per_page', 20), 100); // Cap at 100
                $products = $query->paginate($perPage);

                return [
                    'category' => $category,
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
                'message' => __('category.not_found'),
            ], 404);
        }
    }

    /**
     * Clear category cache (call when categories are updated)
     */
    public static function clearCache(?int $categoryId = null): void
    {
        Cache::forget('categories:all');
        Cache::forget('categories:featured-with-products');

        if ($categoryId) {
            Cache::forget("categories:single:{$categoryId}");
        }
    }
}
