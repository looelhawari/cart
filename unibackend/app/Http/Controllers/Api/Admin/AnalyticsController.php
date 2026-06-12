<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Admin Analytics Controller with AGGRESSIVE CACHING
 * 
 * Admin dashboard queries are often the WORST offenders for DB load.
 * These analytics queries can take 5-30 seconds without caching.
 * 
 * Strategy:
 * - Cache dashboard stats for 5 minutes
 * - Cache heavy reports for 10 minutes
 * - Use cache keys based on date range
 */
class AnalyticsController extends Controller
{
    /**
     * Cache TTL for dashboard (5 minutes)
     */
    protected const DASHBOARD_CACHE_TTL = 300;

    /**
     * Cache TTL for reports (10 minutes)
     */
    protected const REPORT_CACHE_TTL = 600;

    public function dashboard(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());

        // Generate cache key based on date range
        $cacheKey = "admin:dashboard:{$fromDate}:{$toDate}";

        return Cache::remember($cacheKey, self::DASHBOARD_CACHE_TTL, function () use ($fromDate, $toDate) {
            // Sales trend
            $salesTrend = Order::whereBetween('created_at', [$fromDate, $toDate])
                ->where('payment_status', 'completed')
                ->select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('SUM(total) as revenue'),
                    DB::raw('COUNT(*) as orders'),
                    DB::raw('SUM(total) / COUNT(*) as avg_order_value')
                )
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            // Top selling products - LIMIT 10 to reduce load
            $topProducts = DB::table('order_items')
                ->join('products', 'order_items.product_id', '=', 'products.barcode')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->whereBetween('orders.created_at', [$fromDate, $toDate])
                ->where('orders.payment_status', 'completed')
                ->select(
                    'products.barcode',
                    'products.name_en',
                    DB::raw('SUM(order_items.quantity) as total_sold'),
                    DB::raw('SUM(order_items.subtotal) as total_revenue')
                )
                ->groupBy('products.barcode', 'products.name_en')
                ->orderBy('total_sold', 'desc')
                ->limit(10)
                ->get();

            // Category distribution - LIMIT 5
            $topCategories = DB::table('order_items')
                ->join('products', 'order_items.product_id', '=', 'products.barcode')
                ->join('product_categories', 'products.barcode', '=', 'product_categories.product_id')
                ->join('categories', 'product_categories.category_id', '=', 'categories.id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->whereBetween('orders.created_at', [$fromDate, $toDate])
                ->where('orders.payment_status', 'completed')
                ->select(
                    'categories.name_en',
                    DB::raw('SUM(order_items.subtotal) as revenue'),
                    DB::raw('SUM(order_items.quantity) as items_sold')
                )
                ->groupBy('categories.id', 'categories.name_en')
                ->orderBy('revenue', 'desc')
                ->limit(5)
                ->get();

            // Top customers - LIMIT 10
            $topCustomers = User::select('users.*')
                ->join('orders', 'users.id', '=', 'orders.user_id')
                ->whereBetween('orders.created_at', [$fromDate, $toDate])
                ->where('orders.payment_status', 'completed')
                ->select(
                    'users.id',
                    'users.first_name',
                    'users.last_name',
                    'users.email',
                    DB::raw('COUNT(orders.id) as total_orders'),
                    DB::raw('SUM(orders.total) as total_spent'),
                    DB::raw('SUM(orders.total) / COUNT(orders.id) as avg_order_value')
                )
                ->groupBy('users.id', 'users.first_name', 'users.last_name', 'users.email')
                ->orderBy('total_spent', 'desc')
                ->limit(10)
                ->get();

            // Customer insights - These are simpler queries, still cache
            $totalCustomers = User::count();
            $activeCustomers = User::whereHas('orders', function ($q) use ($fromDate, $toDate) {
                $q->whereBetween('created_at', [$fromDate, $toDate]);
            })->count();

            $newCustomers = User::whereBetween('created_at', [$fromDate, $toDate])->count();

            return response()->json([
                'sales_trend' => $salesTrend,
                'top_products' => $topProducts,
                'top_categories' => $topCategories,
                'top_customers' => $topCustomers,
                'customer_insights' => [
                    'total_customers' => $totalCustomers,
                    'active_customers' => $activeCustomers,
                    'new_customers' => $newCustomers,
                ],
                'cached_at' => now()->toIso8601String(),
                'cache_ttl_seconds' => self::DASHBOARD_CACHE_TTL,
            ]);
        });
    }

    public function productPerformance(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());
        $page = $request->get('page', 1);
        $perPage = min($request->get('per_page', 50), 100); // Cap at 100

        // Cache key includes pagination
        $cacheKey = "admin:product-performance:{$fromDate}:{$toDate}:p{$page}:pp{$perPage}";

        return Cache::remember($cacheKey, self::REPORT_CACHE_TTL, function () use ($fromDate, $toDate, $perPage) {
            $products = DB::table('products')
                ->leftJoin('order_items', 'products.barcode', '=', 'order_items.product_id')
                ->leftJoin('orders', function ($join) use ($fromDate, $toDate) {
                    $join->on('order_items.order_id', '=', 'orders.id')
                        ->whereBetween('orders.created_at', [$fromDate, $toDate])
                        ->where('orders.payment_status', 'completed');
                })
                ->select(
                    'products.barcode',
                    'products.name_en',
                    'products.price',
                    'products.stock_quantity',
                    DB::raw('COALESCE(SUM(order_items.quantity), 0) as units_sold'),
                    DB::raw('COALESCE(SUM(order_items.subtotal), 0) as revenue'),
                    DB::raw('COALESCE(COUNT(DISTINCT orders.id), 0) as order_count')
                )
                ->groupBy('products.barcode', 'products.name_en', 'products.price', 'products.stock_quantity')
                ->orderBy('revenue', 'desc')
                ->paginate($perPage);

            return response()->json($products);
        });
    }

    public function customerInsights(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());
        $page = $request->get('page', 1);
        $perPage = min($request->get('per_page', 50), 100); // Cap at 100

        // Cache key includes pagination
        $cacheKey = "admin:customer-insights:{$fromDate}:{$toDate}:p{$page}:pp{$perPage}";

        return Cache::remember($cacheKey, self::REPORT_CACHE_TTL, function () use ($fromDate, $toDate, $perPage) {
            $customerSegments = User::leftJoin('orders', function ($join) use ($fromDate, $toDate) {
                    $join->on('users.id', '=', 'orders.user_id')
                        ->whereBetween('orders.created_at', [$fromDate, $toDate])
                        ->where('orders.payment_status', 'completed');
                })
                ->select(
                    'users.id',
                    'users.first_name',
                    'users.last_name',
                    'users.email',
                    'users.created_at as registered_at',
                    DB::raw('COUNT(orders.id) as order_count'),
                    DB::raw('COALESCE(SUM(orders.total), 0) as lifetime_value'),
                    DB::raw('MAX(orders.created_at) as last_order_date')
                )
                ->groupBy('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.created_at')
                ->orderBy('lifetime_value', 'desc')
                ->paginate($perPage);

            return response()->json($customerSegments);
        });
    }

    /**
     * Quick summary stats - Heavily cached (1 hour for today's stats)
     */
    public function quickStats()
    {
        // 2-min TTL (was 1h): the dashboard overview must not lag an hour
        // behind today's orders/stock. clearCache() also drops it on writes.
        return Cache::remember('admin:quick-stats', 120, function () {
            $todayStart = now()->startOfDay();

            return response()->json([
                'today_orders' => Order::where('created_at', '>=', $todayStart)->count(),
                'today_revenue' => Order::where('created_at', '>=', $todayStart)
                    ->where('payment_status', 'completed')
                    ->sum('total'),
                'pending_orders' => Order::where('status', 'pending')->count(),
                'low_stock_products' => Product::where('stock_quantity', '<', 10)
                    ->where('is_active', true)
                    ->count(),
                'total_customers' => User::where('role', 'customer')->count(),
                'cached_at' => now()->toIso8601String(),
            ]);
        });
    }

    /**
     * Clear analytics cache (call when significant changes occur)
     */
    public static function clearCache(): void
    {
        // Clear dashboard cache for common date ranges
        $ranges = [
            [now()->subDays(7)->toDateString(), now()->toDateString()],
            [now()->subDays(30)->toDateString(), now()->toDateString()],
            [now()->subDays(90)->toDateString(), now()->toDateString()],
        ];

        foreach ($ranges as [$from, $to]) {
            Cache::forget("admin:dashboard:{$from}:{$to}");
        }

        Cache::forget('admin:quick-stats');
    }
}
