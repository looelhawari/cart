<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    /**
     * Get all categories with subcategories
     * GET /api/v1/categories
     */
    public function index(): JsonResponse
    {
        try {
            $categories = Category::with('subcategories')
                ->whereNull('parent_id')
                ->withCount('products')
                ->orderBy('sort_order')
                ->orderBy('name_en')
                ->get();

            return response()->json([
                'success' => true,
                'data' => ['categories' => $categories],
            ], 200, ['Content-Type' => 'application/json; charset=utf-8'], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve categories',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get categories with their products for home page
     * GET /api/v1/categories/featured-with-products
     */
    public function featuredWithProducts(): JsonResponse
    {
        try {
            // Get top categories that have products
            $categories = Category::with(['subcategories'])
                ->whereNull('parent_id')
                ->has('products')
                ->withCount('products')
                ->orderBy('products_count', 'desc')
                ->orderBy('sort_order')
                ->limit(6)
                ->get();

            // For each category, get some products
            $categoriesWithProducts = $categories->map(function ($category) {
                $products = \App\Models\Product::query()
                    ->where('is_active', true)
                    ->whereHas('categories', function ($q) use ($category) {
                        $q->where('categories.id', $category->id);
                    })
                    ->orderBy('created_at', 'desc')
                    ->limit(6)
                    ->get();

                return [
                    'id' => $category->id,
                    'name_en' => $category->name_en,
                    'name_ar' => $category->name_ar,
                    'slug' => $category->slug,
                    'icon' => $category->icon,
                    'products_count' => $category->products_count,
                    'products' => $products,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => ['categories' => $categoriesWithProducts],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve categories with products',
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
            $category = Category::with('subcategories')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => ['category' => $category],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
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

            // Sorting
            $sortBy = request()->get('sort_by', 'created_at');
            $sortOrder = request()->get('sort_order', 'desc');

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

            $perPage = request()->get('per_page', 20);
            $products = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => [
                    'category' => $category,
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
                'message' => 'Category not found',
            ], 404);
        }
    }
}
