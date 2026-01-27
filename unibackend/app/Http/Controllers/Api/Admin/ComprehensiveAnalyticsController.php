<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Category;
use App\Models\PromoCode;
use App\Models\Promotion;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ComprehensiveAnalyticsController extends Controller
{
    /**
     * Get comprehensive analytics overview
     */
    public function overview(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());
        $compareWithPrevious = $request->get('compare', true);

        // Calculate previous period for comparison
        $periodDays = Carbon::parse($fromDate)->diffInDays(Carbon::parse($toDate)) + 1;
        $prevFromDate = Carbon::parse($fromDate)->subDays($periodDays)->toDateString();
        $prevToDate = Carbon::parse($fromDate)->subDay()->toDateString();

        // Current period metrics
        $currentMetrics = $this->getOverviewMetrics($fromDate, $toDate);
        
        // Previous period metrics for comparison
        $previousMetrics = $compareWithPrevious 
            ? $this->getOverviewMetrics($prevFromDate, $prevToDate) 
            : null;

        return response()->json([
            'current_period' => [
                'from' => $fromDate,
                'to' => $toDate,
                'metrics' => $currentMetrics,
            ],
            'previous_period' => $previousMetrics ? [
                'from' => $prevFromDate,
                'to' => $prevToDate,
                'metrics' => $previousMetrics,
            ] : null,
            'growth_rates' => $previousMetrics 
                ? $this->calculateGrowthRates($currentMetrics, $previousMetrics) 
                : null,
        ]);
    }

    private function getOverviewMetrics($fromDate, $toDate)
    {
        $orders = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()]);
        $completedOrders = (clone $orders)->where('payment_status', 'completed');

        $totalRevenue = $completedOrders->sum('total');
        $totalOrders = $orders->count();
        $completedOrdersCount = (clone $completedOrders)->count();
        $avgOrderValue = $completedOrdersCount > 0 ? $totalRevenue / $completedOrdersCount : 0;

        // Gross profit calculation (revenue - cost)
        $costData = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.barcode')
            ->whereBetween('orders.created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('orders.payment_status', 'completed')
            ->select(DB::raw('SUM(order_items.quantity * products.cost_price) as total_cost'))
            ->first();

        $totalCost = $costData->total_cost ?? 0;
        $grossProfit = $totalRevenue - $totalCost;
        $grossMargin = $totalRevenue > 0 ? ($grossProfit / $totalRevenue) * 100 : 0;

        // Discounts given
        $totalDiscounts = $completedOrders->sum('discount');
        $deliveryFees = $completedOrders->sum('delivery_fee');
        $taxCollected = $completedOrders->sum('tax');

        // Net revenue (after discounts)
        $netRevenue = $totalRevenue - $totalDiscounts;

        // Customer metrics
        $newCustomers = User::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('role', 'customer')
            ->count();

        $activeCustomers = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->distinct('user_id')
            ->count('user_id');

        // Order status breakdown
        $statusBreakdown = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        // Payment method breakdown
        $paymentBreakdown = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed')
            ->select('payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as revenue'))
            ->groupBy('payment_method')
            ->get();

        // Items sold
        $itemsSold = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->whereBetween('orders.created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('orders.payment_status', 'completed')
            ->sum('order_items.quantity');

        return [
            'total_revenue' => round($totalRevenue, 2),
            'net_revenue' => round($netRevenue, 2),
            'gross_profit' => round($grossProfit, 2),
            'gross_margin' => round($grossMargin, 2),
            'total_orders' => $totalOrders,
            'completed_orders' => $completedOrdersCount,
            'avg_order_value' => round($avgOrderValue, 2),
            'total_discounts' => round($totalDiscounts, 2),
            'delivery_fees' => round($deliveryFees, 2),
            'tax_collected' => round($taxCollected, 2),
            'new_customers' => $newCustomers,
            'active_customers' => $activeCustomers,
            'items_sold' => $itemsSold,
            'status_breakdown' => $statusBreakdown,
            'payment_breakdown' => $paymentBreakdown,
        ];
    }

    private function calculateGrowthRates($current, $previous)
    {
        $calculateGrowth = function($curr, $prev) {
            if ($prev == 0) return $curr > 0 ? 100 : 0;
            return round((($curr - $prev) / $prev) * 100, 2);
        };

        return [
            'revenue_growth' => $calculateGrowth($current['total_revenue'], $previous['total_revenue']),
            'orders_growth' => $calculateGrowth($current['total_orders'], $previous['total_orders']),
            'aov_growth' => $calculateGrowth($current['avg_order_value'], $previous['avg_order_value']),
            'customers_growth' => $calculateGrowth($current['active_customers'], $previous['active_customers']),
            'profit_growth' => $calculateGrowth($current['gross_profit'], $previous['gross_profit']),
        ];
    }

    /**
     * Sales & Revenue Analytics
     */
    public function salesAnalytics(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());
        $granularity = $request->get('granularity', 'daily'); // daily, weekly, monthly

        // Revenue trend
        $dateFormat = match($granularity) {
            'weekly' => '%Y-W%V',
            'monthly' => '%Y-%m',
            default => '%Y-%m-%d',
        };

        $revenueTrend = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed')
            ->select(
                DB::raw("DATE_FORMAT(created_at, '$dateFormat') as period"),
                DB::raw('SUM(total) as revenue'),
                DB::raw('SUM(total - discount) as net_revenue'),
                DB::raw('COUNT(*) as orders'),
                DB::raw('AVG(total) as avg_order_value'),
                DB::raw('SUM(discount) as discounts')
            )
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        // Revenue by category
        $revenueByCategory = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.barcode')
            ->join('product_categories', 'products.barcode', '=', 'product_categories.product_id')
            ->join('categories', 'product_categories.category_id', '=', 'categories.id')
            ->whereBetween('orders.created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('orders.payment_status', 'completed')
            ->whereNull('categories.parent_id') // Only main categories
            ->select(
                'categories.id',
                'categories.name_en as name',
                DB::raw('SUM(order_items.subtotal) as revenue'),
                DB::raw('SUM(order_items.quantity) as items_sold'),
                DB::raw('COUNT(DISTINCT orders.id) as orders')
            )
            ->groupBy('categories.id', 'categories.name_en')
            ->orderByDesc('revenue')
            ->get();

        // Revenue by payment method
        $revenueByPayment = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed')
            ->select(
                'payment_method',
                DB::raw('SUM(total) as revenue'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy('payment_method')
            ->get();

        // Hourly distribution (for peak hours)
        $hourlyDistribution = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed')
            ->select(
                DB::raw('HOUR(created_at) as hour'),
                DB::raw('COUNT(*) as orders'),
                DB::raw('SUM(total) as revenue')
            )
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        // Day of week distribution
        $dayOfWeekDistribution = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed')
            ->select(
                DB::raw('DAYOFWEEK(created_at) as day_of_week'),
                DB::raw('DAYNAME(created_at) as day_name'),
                DB::raw('COUNT(*) as orders'),
                DB::raw('SUM(total) as revenue')
            )
            ->groupBy('day_of_week', 'day_name')
            ->orderBy('day_of_week')
            ->get();

        // Top 10 revenue products
        $topProducts = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.barcode')
            ->whereBetween('orders.created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('orders.payment_status', 'completed')
            ->select(
                'products.barcode',
                'products.name_en as name',
                'products.image',
                DB::raw('SUM(order_items.subtotal) as revenue'),
                DB::raw('SUM(order_items.quantity) as quantity_sold')
            )
            ->groupBy('products.barcode', 'products.name_en', 'products.image')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        return response()->json([
            'revenue_trend' => $revenueTrend,
            'revenue_by_category' => $revenueByCategory,
            'revenue_by_payment' => $revenueByPayment,
            'hourly_distribution' => $hourlyDistribution,
            'day_of_week_distribution' => $dayOfWeekDistribution,
            'top_products' => $topProducts,
        ]);
    }

    /**
     * Customer Analytics
     */
    public function customerAnalytics(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());

        // Total customers
        $totalCustomers = User::where('role', 'customer')->count();
        
        // New customers in period
        $newCustomers = User::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('role', 'customer')
            ->count();

        // Active customers (placed at least one order)
        $activeCustomers = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->distinct('user_id')
            ->count('user_id');

        // Returning customers (more than 1 order ever)
        $returningCustomers = User::where('role', 'customer')
            ->whereHas('orders', function($q) {
                $q->where('payment_status', 'completed');
            }, '>=', 2)
            ->count();

        // Customer lifetime value calculation
        $clvData = DB::table('users')
            ->join('orders', 'users.id', '=', 'orders.user_id')
            ->where('users.role', 'customer')
            ->where('orders.payment_status', 'completed')
            ->select(
                DB::raw('AVG(lifetime_total) as avg_clv'),
                DB::raw('MAX(lifetime_total) as max_clv')
            )
            ->from(function($query) {
                $query->from('users')
                    ->join('orders', 'users.id', '=', 'orders.user_id')
                    ->where('users.role', 'customer')
                    ->where('orders.payment_status', 'completed')
                    ->select('users.id', DB::raw('SUM(orders.total) as lifetime_total'))
                    ->groupBy('users.id');
            }, 'customer_totals')
            ->first();

        // Customer segmentation
        $segments = $this->getCustomerSegments();

        // Top customers
        $topCustomers = DB::table('users')
            ->join('orders', 'users.id', '=', 'orders.user_id')
            ->where('users.role', 'customer')
            ->where('orders.payment_status', 'completed')
            ->select(
                'users.id',
                'users.first_name',
                'users.last_name',
                'users.email',
                'users.phone',
                'users.created_at as member_since',
                DB::raw('COUNT(orders.id) as total_orders'),
                DB::raw('SUM(orders.total) as total_spent'),
                DB::raw('AVG(orders.total) as avg_order_value'),
                DB::raw('MAX(orders.created_at) as last_order_date')
            )
            ->groupBy('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.phone', 'users.created_at')
            ->orderByDesc('total_spent')
            ->limit(20)
            ->get();

        // Customer acquisition trend
        $acquisitionTrend = User::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('role', 'customer')
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as new_customers')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Orders per customer distribution
        $orderDistribution = DB::table('users')
            ->leftJoin('orders', function($join) {
                $join->on('users.id', '=', 'orders.user_id')
                    ->where('orders.payment_status', 'completed');
            })
            ->where('users.role', 'customer')
            ->select(
                DB::raw('CASE 
                    WHEN COUNT(orders.id) = 0 THEN "0 orders"
                    WHEN COUNT(orders.id) = 1 THEN "1 order"
                    WHEN COUNT(orders.id) BETWEEN 2 AND 5 THEN "2-5 orders"
                    WHEN COUNT(orders.id) BETWEEN 6 AND 10 THEN "6-10 orders"
                    ELSE "10+ orders"
                END as order_bucket'),
                DB::raw('COUNT(DISTINCT users.id) as customer_count')
            )
            ->groupBy('users.id')
            ->get()
            ->groupBy('order_bucket')
            ->map(fn($group) => $group->sum('customer_count'));

        // Repeat purchase rate
        $customersWithOrders = User::where('role', 'customer')
            ->whereHas('orders', fn($q) => $q->where('payment_status', 'completed'))
            ->count();
        
        $repeatPurchaseRate = $customersWithOrders > 0 
            ? round(($returningCustomers / $customersWithOrders) * 100, 2) 
            : 0;

        return response()->json([
            'summary' => [
                'total_customers' => $totalCustomers,
                'new_customers' => $newCustomers,
                'active_customers' => $activeCustomers,
                'returning_customers' => $returningCustomers,
                'avg_customer_lifetime_value' => round($clvData->avg_clv ?? 0, 2),
                'max_customer_lifetime_value' => round($clvData->max_clv ?? 0, 2),
                'repeat_purchase_rate' => $repeatPurchaseRate,
            ],
            'segments' => $segments,
            'top_customers' => $topCustomers,
            'acquisition_trend' => $acquisitionTrend,
            'order_distribution' => $orderDistribution,
        ]);
    }

    private function getCustomerSegments()
    {
        $thirtyDaysAgo = now()->subDays(30);
        $ninetyDaysAgo = now()->subDays(90);

        // VIP: Top 10% by spending
        $vipThreshold = DB::table('users')
            ->join('orders', 'users.id', '=', 'orders.user_id')
            ->where('orders.payment_status', 'completed')
            ->select(DB::raw('SUM(orders.total) as total'))
            ->groupBy('users.id')
            ->orderByDesc('total')
            ->skip((int)(User::where('role', 'customer')->count() * 0.1))
            ->first();

        $vipCustomers = DB::table('users')
            ->join('orders', 'users.id', '=', 'orders.user_id')
            ->where('orders.payment_status', 'completed')
            ->groupBy('users.id')
            ->havingRaw('SUM(orders.total) >= ?', [$vipThreshold->total ?? 0])
            ->count();

        // At-risk: No order in 30+ days but ordered before
        $atRiskCustomers = User::where('role', 'customer')
            ->whereHas('orders', function($q) use ($thirtyDaysAgo) {
                $q->where('payment_status', 'completed')
                    ->where('created_at', '<', $thirtyDaysAgo);
            })
            ->whereDoesntHave('orders', function($q) use ($thirtyDaysAgo) {
                $q->where('created_at', '>=', $thirtyDaysAgo);
            })
            ->count();

        // New: First order in last 30 days
        $newCustomers = User::where('role', 'customer')
            ->whereHas('orders', function($q) use ($thirtyDaysAgo) {
                $q->where('payment_status', 'completed');
            })
            ->whereDoesntHave('orders', function($q) use ($thirtyDaysAgo) {
                $q->where('payment_status', 'completed')
                    ->where('created_at', '<', $thirtyDaysAgo);
            })
            ->count();

        // Loyal: 5+ orders
        $loyalCustomers = DB::table('users')
            ->join('orders', 'users.id', '=', 'orders.user_id')
            ->where('orders.payment_status', 'completed')
            ->groupBy('users.id')
            ->havingRaw('COUNT(orders.id) >= 5')
            ->count();

        // One-time buyers
        $oneTimeBuyers = DB::table('users')
            ->join('orders', 'users.id', '=', 'orders.user_id')
            ->where('orders.payment_status', 'completed')
            ->groupBy('users.id')
            ->havingRaw('COUNT(orders.id) = 1')
            ->count();

        // Churned: No order in 90+ days
        $churnedCustomers = User::where('role', 'customer')
            ->whereHas('orders', function($q) use ($ninetyDaysAgo) {
                $q->where('payment_status', 'completed')
                    ->where('created_at', '<', $ninetyDaysAgo);
            })
            ->whereDoesntHave('orders', function($q) use ($ninetyDaysAgo) {
                $q->where('created_at', '>=', $ninetyDaysAgo);
            })
            ->count();

        return [
            ['segment' => 'VIP', 'count' => $vipCustomers, 'color' => '#FFD700', 'description' => 'Top 10% by spending'],
            ['segment' => 'Loyal', 'count' => $loyalCustomers, 'color' => '#4CAF50', 'description' => '5+ orders'],
            ['segment' => 'New', 'count' => $newCustomers, 'color' => '#2196F3', 'description' => 'First order in last 30 days'],
            ['segment' => 'At-Risk', 'count' => $atRiskCustomers, 'color' => '#FF9800', 'description' => 'No order in 30+ days'],
            ['segment' => 'One-Time', 'count' => $oneTimeBuyers, 'color' => '#9E9E9E', 'description' => 'Only 1 order'],
            ['segment' => 'Churned', 'count' => $churnedCustomers, 'color' => '#F44336', 'description' => 'No order in 90+ days'],
        ];
    }

    /**
     * Product Analytics
     */
    public function productAnalytics(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());

        // Best sellers by units
        $bestSellers = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.barcode')
            ->whereBetween('orders.created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('orders.payment_status', 'completed')
            ->select(
                'products.barcode',
                'products.name_en as name',
                'products.image',
                'products.price',
                'products.cost_price',
                'products.stock_quantity',
                DB::raw('SUM(order_items.quantity) as units_sold'),
                DB::raw('SUM(order_items.subtotal) as revenue'),
                DB::raw('SUM(order_items.subtotal - (order_items.quantity * COALESCE(products.cost_price, 0))) as profit'),
                DB::raw('COUNT(DISTINCT orders.id) as order_count')
            )
            ->groupBy('products.barcode', 'products.name_en', 'products.image', 'products.price', 'products.cost_price', 'products.stock_quantity')
            ->orderByDesc('units_sold')
            ->limit(20)
            ->get();

        // Stock alerts
        $lowStock = Product::where('is_active', true)
            ->where('stock_quantity', '>', 0)
            ->where('stock_quantity', '<=', 10)
            ->select('barcode', 'name_en as name', 'stock_quantity', 'image')
            ->orderBy('stock_quantity')
            ->get();

        $outOfStock = Product::where('is_active', true)
            ->where('stock_quantity', '<=', 0)
            ->select('barcode', 'name_en as name', 'stock_quantity', 'image')
            ->get();

        // Slow movers (products with low sales velocity)
        $slowMovers = DB::table('products')
            ->leftJoin('order_items', 'products.barcode', '=', 'order_items.product_id')
            ->leftJoin('orders', function($join) use ($fromDate, $toDate) {
                $join->on('order_items.order_id', '=', 'orders.id')
                    ->whereBetween('orders.created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
                    ->where('orders.payment_status', 'completed');
            })
            ->where('products.is_active', true)
            ->where('products.stock_quantity', '>', 0)
            ->select(
                'products.barcode',
                'products.name_en as name',
                'products.stock_quantity',
                'products.price',
                'products.image',
                DB::raw('COALESCE(SUM(order_items.quantity), 0) as units_sold')
            )
            ->groupBy('products.barcode', 'products.name_en', 'products.stock_quantity', 'products.price', 'products.image')
            ->havingRaw('COALESCE(SUM(order_items.quantity), 0) < 3')
            ->orderBy('units_sold')
            ->limit(20)
            ->get();

        // Category performance
        $categoryPerformance = DB::table('categories')
            ->leftJoin('product_categories', 'categories.id', '=', 'product_categories.category_id')
            ->leftJoin('products', 'product_categories.product_id', '=', 'products.barcode')
            ->leftJoin('order_items', 'products.barcode', '=', 'order_items.product_id')
            ->leftJoin('orders', function($join) use ($fromDate, $toDate) {
                $join->on('order_items.order_id', '=', 'orders.id')
                    ->whereBetween('orders.created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
                    ->where('orders.payment_status', 'completed');
            })
            ->whereNull('categories.parent_id')
            ->where('categories.is_active', true)
            ->select(
                'categories.id',
                'categories.name_en as name',
                'categories.image',
                DB::raw('COUNT(DISTINCT products.barcode) as product_count'),
                DB::raw('COALESCE(SUM(order_items.quantity), 0) as units_sold'),
                DB::raw('COALESCE(SUM(order_items.subtotal), 0) as revenue')
            )
            ->groupBy('categories.id', 'categories.name_en', 'categories.image')
            ->orderByDesc('revenue')
            ->get();

        // Inventory value
        $inventoryValue = Product::where('is_active', true)
            ->select(
                DB::raw('SUM(stock_quantity * price) as retail_value'),
                DB::raw('SUM(stock_quantity * COALESCE(cost_price, 0)) as cost_value'),
                DB::raw('SUM(stock_quantity) as total_units'),
                DB::raw('COUNT(*) as total_products')
            )
            ->first();

        return response()->json([
            'best_sellers' => $bestSellers,
            'stock_alerts' => [
                'low_stock' => $lowStock,
                'out_of_stock' => $outOfStock,
                'low_stock_count' => $lowStock->count(),
                'out_of_stock_count' => $outOfStock->count(),
            ],
            'slow_movers' => $slowMovers,
            'category_performance' => $categoryPerformance,
            'inventory' => [
                'retail_value' => round($inventoryValue->retail_value ?? 0, 2),
                'cost_value' => round($inventoryValue->cost_value ?? 0, 2),
                'total_units' => $inventoryValue->total_units ?? 0,
                'total_products' => $inventoryValue->total_products ?? 0,
            ],
        ]);
    }

    /**
     * Order Analytics
     */
    public function orderAnalytics(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());

        // Status breakdown
        $statusBreakdown = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->select('status', DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as revenue'))
            ->groupBy('status')
            ->get();

        // Payment status breakdown
        $paymentStatusBreakdown = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->select('payment_status', DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as revenue'))
            ->groupBy('payment_status')
            ->get();

        // Cancellation analysis
        $cancellations = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('status', 'cancelled')
            ->select(
                'cancellation_reason',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(total) as lost_revenue')
            )
            ->groupBy('cancellation_reason')
            ->get();

        $totalOrders = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])->count();
        $cancelledOrders = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('status', 'cancelled')
            ->count();
        $cancellationRate = $totalOrders > 0 ? round(($cancelledOrders / $totalOrders) * 100, 2) : 0;

        // Delivery success rate
        $deliveredOrders = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('status', 'delivered')
            ->count();
        $deliverySuccessRate = $totalOrders > 0 ? round(($deliveredOrders / $totalOrders) * 100, 2) : 0;

        // Average order completion time (created to delivered)
        $avgCompletionTime = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('status', 'delivered')
            ->whereNotNull('updated_at')
            ->select(DB::raw('AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours'))
            ->first();

        // Orders by delivery slot
        $ordersByDeliverySlot = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->whereNotNull('delivery_time_slot')
            ->select('delivery_time_slot', DB::raw('COUNT(*) as count'))
            ->groupBy('delivery_time_slot')
            ->get();

        // Order value distribution
        $orderValueDistribution = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed')
            ->select(
                DB::raw('CASE 
                    WHEN total < 50 THEN "Under 50 EGP"
                    WHEN total BETWEEN 50 AND 100 THEN "50-100 EGP"
                    WHEN total BETWEEN 100 AND 200 THEN "100-200 EGP"
                    WHEN total BETWEEN 200 AND 500 THEN "200-500 EGP"
                    ELSE "500+ EGP"
                END as value_bucket'),
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(total) as revenue')
            )
            ->groupBy('value_bucket')
            ->get();

        // Recent orders
        $recentOrders = Order::with(['user:id,first_name,last_name,email', 'items'])
            ->whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'summary' => [
                'total_orders' => $totalOrders,
                'delivered_orders' => $deliveredOrders,
                'cancelled_orders' => $cancelledOrders,
                'cancellation_rate' => $cancellationRate,
                'delivery_success_rate' => $deliverySuccessRate,
                'avg_completion_hours' => round($avgCompletionTime->avg_hours ?? 0, 1),
            ],
            'status_breakdown' => $statusBreakdown,
            'payment_status_breakdown' => $paymentStatusBreakdown,
            'cancellation_analysis' => $cancellations,
            'orders_by_delivery_slot' => $ordersByDeliverySlot,
            'order_value_distribution' => $orderValueDistribution,
            'recent_orders' => $recentOrders,
        ]);
    }

    /**
     * Marketing & Promotions Analytics
     */
    public function marketingAnalytics(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());

        // Promo code performance
        $promoCodePerformance = PromoCode::where('is_active', true)
            ->select(
                'id',
                'code',
                'type',
                'value',
                'usage_limit',
                'used_count',
                'valid_from',
                'valid_until'
            )
            ->orderByDesc('used_count')
            ->get()
            ->map(function($promo) {
                $promo->redemption_rate = $promo->usage_limit > 0 
                    ? round(($promo->used_count / $promo->usage_limit) * 100, 2) 
                    : 0;
                return $promo;
            });

        // Total discounts given via promo codes
        $discountsGiven = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed')
            ->whereNotNull('promo_code_snapshot')
            ->sum('discount');

        // Orders with discounts vs without
        $ordersWithDiscount = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed')
            ->where('discount', '>', 0)
            ->count();

        $ordersWithoutDiscount = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed')
            ->where(function($q) {
                $q->where('discount', 0)->orWhereNull('discount');
            })
            ->count();

        // Active promotions
        $activePromotions = Promotion::where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->select(
                'id',
                'title',
                'discount_type',
                'discount_value',
                'start_date',
                'end_date',
                'is_featured'
            )
            ->get();

        // Promotion impact (products on sale)
        $productsOnSale = Product::whereNotNull('sale_price')
            ->where('sale_price', '<', DB::raw('price'))
            ->count();

        // Revenue from discounted products
        $discountedProductRevenue = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.barcode')
            ->whereBetween('orders.created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('orders.payment_status', 'completed')
            ->whereNotNull('products.sale_price')
            ->sum('order_items.subtotal');

        return response()->json([
            'promo_codes' => $promoCodePerformance,
            'discounts_summary' => [
                'total_discounts_given' => round($discountsGiven, 2),
                'orders_with_discount' => $ordersWithDiscount,
                'orders_without_discount' => $ordersWithoutDiscount,
                'discount_usage_rate' => ($ordersWithDiscount + $ordersWithoutDiscount) > 0 
                    ? round(($ordersWithDiscount / ($ordersWithDiscount + $ordersWithoutDiscount)) * 100, 2) 
                    : 0,
            ],
            'active_promotions' => $activePromotions,
            'products_on_sale' => $productsOnSale,
            'discounted_product_revenue' => round($discountedProductRevenue, 2),
        ]);
    }

    /**
     * Financial Analytics
     */
    public function financialAnalytics(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());

        // Revenue breakdown
        $completedOrders = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed');

        $grossRevenue = (clone $completedOrders)->sum('total');
        $totalDiscounts = (clone $completedOrders)->sum('discount');
        $deliveryFees = (clone $completedOrders)->sum('delivery_fee');
        $taxCollected = (clone $completedOrders)->sum('tax');
        $netRevenue = $grossRevenue - $totalDiscounts;

        // Cost of goods sold
        $cogs = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.barcode')
            ->whereBetween('orders.created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('orders.payment_status', 'completed')
            ->select(DB::raw('SUM(order_items.quantity * COALESCE(products.cost_price, 0)) as total_cost'))
            ->first();

        $totalCOGS = $cogs->total_cost ?? 0;
        $grossProfit = $netRevenue - $totalCOGS;
        $grossMargin = $netRevenue > 0 ? ($grossProfit / $netRevenue) * 100 : 0;

        // Refunds
        $refunds = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->whereNotNull('refunded_at')
            ->select(
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(refunded_amount) as total')
            )
            ->first();

        // Revenue by payment method
        $revenueByPayment = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed')
            ->select('payment_method', DB::raw('SUM(total) as revenue'), DB::raw('COUNT(*) as orders'))
            ->groupBy('payment_method')
            ->get();

        // Daily revenue trend
        $dailyRevenue = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('payment_status', 'completed')
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total) as revenue'),
                DB::raw('SUM(total - discount) as net_revenue'),
                DB::raw('SUM(discount) as discounts'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Wallet transactions
        $walletStats = WalletTransaction::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->select(
                'type',
                DB::raw('SUM(amount) as total'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('type')
            ->get();

        return response()->json([
            'revenue' => [
                'gross_revenue' => round($grossRevenue, 2),
                'net_revenue' => round($netRevenue, 2),
                'total_discounts' => round($totalDiscounts, 2),
                'delivery_fees' => round($deliveryFees, 2),
                'tax_collected' => round($taxCollected, 2),
            ],
            'profitability' => [
                'cost_of_goods_sold' => round($totalCOGS, 2),
                'gross_profit' => round($grossProfit, 2),
                'gross_margin_percent' => round($grossMargin, 2),
            ],
            'refunds' => [
                'count' => $refunds->count ?? 0,
                'total' => round($refunds->total ?? 0, 2),
            ],
            'revenue_by_payment' => $revenueByPayment,
            'daily_revenue' => $dailyRevenue,
            'wallet_transactions' => $walletStats,
        ]);
    }

    /**
     * Inventory Analytics
     */
    public function inventoryAnalytics(Request $request)
    {
        // Current inventory status
        $inventoryStatus = [
            'in_stock' => Product::where('is_active', true)->where('stock_quantity', '>', 10)->count(),
            'low_stock' => Product::where('is_active', true)->where('stock_quantity', '>', 0)->where('stock_quantity', '<=', 10)->count(),
            'out_of_stock' => Product::where('is_active', true)->where('stock_quantity', '<=', 0)->count(),
        ];

        // Inventory value by category
        $inventoryByCategory = DB::table('categories')
            ->join('product_categories', 'categories.id', '=', 'product_categories.category_id')
            ->join('products', 'product_categories.product_id', '=', 'products.barcode')
            ->whereNull('categories.parent_id')
            ->where('products.is_active', true)
            ->select(
                'categories.id',
                'categories.name_en as name',
                DB::raw('SUM(products.stock_quantity) as total_units'),
                DB::raw('SUM(products.stock_quantity * products.price) as retail_value'),
                DB::raw('SUM(products.stock_quantity * COALESCE(products.cost_price, 0)) as cost_value')
            )
            ->groupBy('categories.id', 'categories.name_en')
            ->orderByDesc('retail_value')
            ->get();

        // ABC Analysis
        $totalRevenue = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.payment_status', 'completed')
            ->sum('order_items.subtotal');

        $productRevenue = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.barcode')
            ->where('orders.payment_status', 'completed')
            ->select(
                'products.barcode',
                'products.name_en as name',
                DB::raw('SUM(order_items.subtotal) as revenue')
            )
            ->groupBy('products.barcode', 'products.name_en')
            ->orderByDesc('revenue')
            ->get();

        $cumulativeRevenue = 0;
        $abcAnalysis = ['A' => 0, 'B' => 0, 'C' => 0];
        
        foreach ($productRevenue as $product) {
            $cumulativeRevenue += $product->revenue;
            $percentage = ($cumulativeRevenue / $totalRevenue) * 100;
            
            if ($percentage <= 80) {
                $abcAnalysis['A']++;
            } elseif ($percentage <= 95) {
                $abcAnalysis['B']++;
            } else {
                $abcAnalysis['C']++;
            }
        }

        // Stock movement (last 30 days)
        $stockMovement = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.created_at', '>=', now()->subDays(30))
            ->where('orders.payment_status', 'completed')
            ->select(
                DB::raw('DATE(orders.created_at) as date'),
                DB::raw('SUM(order_items.quantity) as units_sold')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Top stock value products
        $topStockValue = Product::where('is_active', true)
            ->where('stock_quantity', '>', 0)
            ->select(
                'barcode',
                'name_en as name',
                'stock_quantity',
                'price',
                'cost_price',
                DB::raw('stock_quantity * price as retail_value'),
                DB::raw('stock_quantity * COALESCE(cost_price, 0) as cost_value')
            )
            ->orderByDesc(DB::raw('stock_quantity * price'))
            ->limit(20)
            ->get();

        return response()->json([
            'status' => $inventoryStatus,
            'by_category' => $inventoryByCategory,
            'abc_analysis' => $abcAnalysis,
            'stock_movement' => $stockMovement,
            'top_stock_value' => $topStockValue,
            'total_inventory' => [
                'total_products' => Product::where('is_active', true)->count(),
                'total_units' => Product::where('is_active', true)->sum('stock_quantity'),
                'retail_value' => Product::where('is_active', true)->select(DB::raw('SUM(stock_quantity * price) as value'))->first()->value ?? 0,
                'cost_value' => Product::where('is_active', true)->select(DB::raw('SUM(stock_quantity * COALESCE(cost_price, 0)) as value'))->first()->value ?? 0,
            ],
        ]);
    }

    /**
     * Operational Efficiency Analytics
     */
    public function operationalAnalytics(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());

        // Order processing metrics
        $processingMetrics = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->select(
                'status',
                DB::raw('COUNT(*) as count'),
                DB::raw('AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_time_minutes')
            )
            ->groupBy('status')
            ->get();

        // Peak hours analysis
        $peakHours = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->select(
                DB::raw('HOUR(created_at) as hour'),
                DB::raw('COUNT(*) as orders'),
                DB::raw('SUM(total) as revenue')
            )
            ->groupBy('hour')
            ->orderByDesc('orders')
            ->get();

        // Peak days
        $peakDays = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->select(
                DB::raw('DAYNAME(created_at) as day'),
                DB::raw('DAYOFWEEK(created_at) as day_num'),
                DB::raw('COUNT(*) as orders'),
                DB::raw('SUM(total) as revenue')
            )
            ->groupBy('day', 'day_num')
            ->orderBy('day_num')
            ->get();

        // Order fulfillment rate
        $totalOrders = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])->count();
        $deliveredOrders = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->where('status', 'delivered')
            ->count();
        $fulfillmentRate = $totalOrders > 0 ? round(($deliveredOrders / $totalOrders) * 100, 2) : 0;

        // Average items per order
        $avgItemsPerOrder = DB::table(DB::raw('(
            SELECT orders.id, SUM(order_items.quantity) as item_count
            FROM order_items
            INNER JOIN orders ON order_items.order_id = orders.id
            WHERE orders.created_at BETWEEN ? AND ?
            GROUP BY orders.id
        ) as order_item_counts'))
            ->setBindings([$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->select(DB::raw('AVG(item_count) as avg_items'))
            ->first();

        // Delivery slot utilization
        $deliverySlotUsage = Order::whereBetween('created_at', [$fromDate, Carbon::parse($toDate)->endOfDay()])
            ->whereNotNull('delivery_time_slot')
            ->select('delivery_time_slot', DB::raw('COUNT(*) as count'))
            ->groupBy('delivery_time_slot')
            ->orderByDesc('count')
            ->get();

        return response()->json([
            'processing_metrics' => $processingMetrics,
            'peak_hours' => $peakHours,
            'peak_days' => $peakDays,
            'fulfillment_rate' => $fulfillmentRate,
            'avg_items_per_order' => round($avgItemsPerOrder->avg_items ?? 0, 1),
            'delivery_slot_usage' => $deliverySlotUsage,
            'total_orders' => $totalOrders,
            'delivered_orders' => $deliveredOrders,
        ]);
    }

    /**
     * Export analytics data
     */
    public function exportAnalytics(Request $request)
    {
        $type = $request->get('type', 'overview');
        $format = $request->get('format', 'json');
        $fromDate = $request->get('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->get('to_date', now()->toDateString());

        $data = match($type) {
            'sales' => $this->salesAnalytics($request)->getData(),
            'customers' => $this->customerAnalytics($request)->getData(),
            'products' => $this->productAnalytics($request)->getData(),
            'orders' => $this->orderAnalytics($request)->getData(),
            'financial' => $this->financialAnalytics($request)->getData(),
            'inventory' => $this->inventoryAnalytics($request)->getData(),
            default => $this->overview($request)->getData(),
        };

        if ($format === 'csv') {
            // Convert to CSV format
            $csv = $this->convertToCSV($data, $type);
            return response($csv)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', "attachment; filename=analytics-{$type}-{$fromDate}-to-{$toDate}.csv");
        }

        return response()->json($data);
    }

    private function convertToCSV($data, $type)
    {
        $csv = "";
        
        // Simple CSV conversion based on type
        if (isset($data->revenue_trend)) {
            $csv = "Period,Revenue,Net Revenue,Orders,Avg Order Value,Discounts\n";
            foreach ($data->revenue_trend as $row) {
                $csv .= "{$row->period},{$row->revenue},{$row->net_revenue},{$row->orders},{$row->avg_order_value},{$row->discounts}\n";
            }
        }
        
        return $csv;
    }
}
