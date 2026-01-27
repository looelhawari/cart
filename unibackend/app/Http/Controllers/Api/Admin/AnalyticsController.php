<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30));
        $toDate = $request->get('to_date', now());

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

        // Top selling products
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

        // Category distribution
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

        // Top customers
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

        // Customer insights
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
        ]);
    }

    public function productPerformance(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30));
        $toDate = $request->get('to_date', now());

        $products = DB::table('products')
            ->leftJoin('order_items', 'products.id', '=', 'order_items.product_id')
            ->leftJoin('orders', function ($join) use ($fromDate, $toDate) {
                $join->on('order_items.order_id', '=', 'orders.id')
                    ->whereBetween('orders.created_at', [$fromDate, $toDate])
                    ->where('orders.payment_status', 'completed');
            })
            ->select(
                'products.id',
                'products.name_en',
                'products.barcode',
                'products.price',
                'products.stock_quantity',
                DB::raw('COALESCE(SUM(order_items.quantity), 0) as units_sold'),
                DB::raw('COALESCE(SUM(order_items.subtotal), 0) as revenue'),
                DB::raw('COALESCE(COUNT(DISTINCT orders.id), 0) as order_count')
            )
            ->groupBy('products.id', 'products.name_en', 'products.barcode', 'products.price', 'products.stock_quantity')
            ->orderBy('revenue', 'desc')
            ->paginate($request->get('per_page', 50));

        return response()->json($products);
    }

    public function customerInsights(Request $request)
    {
        $fromDate = $request->get('from_date', now()->subDays(30));
        $toDate = $request->get('to_date', now());

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
            ->paginate($request->get('per_page', 50));

        return response()->json($customerSegments);
    }
}
