<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymobPayment;
use App\Models\PromoCode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinancialController extends Controller
{
    public function dashboard(Request $request)
    {
        $fromDate = $request->get('date_from', now()->subDays(30)->startOfDay());
        $toDate = $request->get('date_to', now()->endOfDay());

        \Log::info('[FinancialController] Dashboard request', [
            'date_from' => $fromDate,
            'date_to' => $toDate,
            'params' => $request->all()
        ]);

        // Total Revenue from completed orders
        $totalRevenue = Order::whereBetween('created_at', [$fromDate, $toDate])
            ->where('payment_status', 'completed')
            ->sum('total');
        
        \Log::info('[FinancialController] Total Revenue Query', [
            'total_revenue' => $totalRevenue,
            'count' => Order::whereBetween('created_at', [$fromDate, $toDate])->where('payment_status', 'completed')->count()
        ]);

        // Cash Revenue (cash_on_delivery)
        $cashRevenue = Order::whereBetween('created_at', [$fromDate, $toDate])
            ->where('payment_method', 'cash_on_delivery')
            ->where('payment_status', 'completed')
            ->sum('total');

        // Online Revenue (card and wallet payments)
        $onlineRevenue = Order::whereBetween('created_at', [$fromDate, $toDate])
            ->whereIn('payment_method', ['card', 'wallet'])
            ->where('payment_status', 'completed')
            ->sum('total');

        // Pending Payments
        $pendingPayments = Order::whereBetween('created_at', [$fromDate, $toDate])
            ->where('payment_status', 'pending')
            ->sum('total');

        // Total Orders count
        $totalOrders = Order::whereBetween('created_at', [$fromDate, $toDate])->count();

        // Completed Orders count
        $paidOrders = Order::whereBetween('created_at', [$fromDate, $toDate])
            ->where('payment_status', 'completed')
            ->count();

        // Pending Orders count
        $pendingOrders = Order::whereBetween('created_at', [$fromDate, $toDate])
            ->where('payment_status', 'pending')
            ->count();

        // Failed Orders count
        $failedOrders = Order::whereBetween('created_at', [$fromDate, $toDate])
            ->where('payment_status', 'failed')
            ->count();

        // Refunded Amount
        $refundedAmount = Order::whereBetween('created_at', [$fromDate, $toDate])
            ->whereNotNull('refunded_amount')
            ->sum('refunded_amount');

        // Revenue by day
        $revenueByDay = Order::whereBetween('created_at', [$fromDate, $toDate])
            ->where('payment_status', 'completed')
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total) as revenue')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'revenue' => (float) $item->revenue,
                ];
            });

        // Revenue by payment method
        $revenueByPaymentMethod = Order::whereBetween('created_at', [$fromDate, $toDate])
            ->where('payment_status', 'completed')
            ->select(
                'payment_method as method',
                DB::raw('SUM(total) as amount'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('payment_method')
            ->get()
            ->map(function ($item) {
                return [
                    'method' => $item->method === 'cash_on_delivery' ? 'Cash on Delivery' : ucfirst($item->method),
                    'amount' => (float) $item->amount,
                    'count' => $item->count,
                ];
            });

        return response()->json([
            'total_revenue' => (float) $totalRevenue,
            'cash_revenue' => (float) $cashRevenue,
            'online_revenue' => (float) $onlineRevenue,
            'pending_payments' => (float) $pendingPayments,
            'refunded_amount' => (float) $refundedAmount,
            'total_orders' => $totalOrders,
            'paid_orders' => $paidOrders,
            'pending_orders' => $pendingOrders,
            'failed_orders' => $failedOrders,
            'revenue_by_day' => $revenueByDay,
            'revenue_by_payment_method' => $revenueByPaymentMethod,
        ])->header('X-Debug-Total-Revenue', $totalRevenue)
          ->header('X-Debug-Orders-Count', $totalOrders);
    }

    public function transactions(Request $request)
    {
        // Use Orders as transactions since not all orders have paymob_payments records
        $query = Order::query()->with(['user']);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('order_number', 'like', "%{$request->search}%")
                  ->orWhere('id', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $transactions = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 50));

        // Transform orders to match frontend Transaction expectations
        $transactions->getCollection()->transform(function ($order) {
            return [
                'id' => $order->id,
                'order_id' => $order->id,
                'paymob_transaction_id' => $order->order_number,
                'amount' => (float) $order->total,
                'payment_method' => $order->payment_method ?? 'cash_on_delivery',
                'payment_status' => $order->payment_status ?? 'pending',
                'transaction_date' => $order->created_at?->format('Y-m-d H:i:s') ?? null,
                'refund_amount' => (float) ($order->refunded_amount ?? 0),
                'refund_date' => $order->refunded_at?->format('Y-m-d H:i:s') ?? null,
                'refund_reason' => $order->refund_reason,
                'created_at' => $order->created_at?->format('Y-m-d H:i:s') ?? null,
                'updated_at' => $order->updated_at?->format('Y-m-d H:i:s') ?? null,
                'order' => $order,
            ];
        });

        return response()->json($transactions);
    }

    public function promoCodes(Request $request)
    {
        $query = PromoCode::query();

        if ($request->filled('search')) {
            $query->where('code', 'like', "%{$request->search}%");
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $promoCodes = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 20));

        return response()->json($promoCodes);
    }

    public function createPromoCode(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:promo_codes',
            'type' => 'required|in:percentage,fixed_amount',
            'value' => 'required|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'valid_from' => 'required|date',
            'valid_until' => 'required|date|after:valid_from',
            'is_active' => 'boolean',
        ]);

        $promoCode = PromoCode::create($validated);

        return response()->json($promoCode, 201);
    }

    public function updatePromoCode(Request $request, $id)
    {
        $promoCode = PromoCode::findOrFail($id);

        $validated = $request->validate([
            'is_active' => 'sometimes|boolean',
            'usage_limit' => 'sometimes|integer|min:1',
            'valid_until' => 'sometimes|date',
        ]);

        $promoCode->update($validated);

        return response()->json($promoCode);
    }

    public function deletePromoCode($id)
    {
        $promoCode = PromoCode::findOrFail($id);
        $promoCode->delete();

        return response()->json(['message' => 'Promo code deleted successfully']);
    }

    public function promoCodesAnalytics()
    {
        try {
            $now = now();

            // Check if columns exist to avoid errors
            $hasPromoCodeId = \Schema::hasColumn('orders', 'promo_code_id');
            $hasDiscountAmount = \Schema::hasColumn('orders', 'discount_amount');

            $data = [
                'total_codes' => PromoCode::count(),
                'active_codes' => PromoCode::where('is_active', true)
                    ->where('valid_from', '<=', $now)
                    ->where('valid_until', '>=', $now)
                    ->count(),
                'expired_codes' => PromoCode::where('valid_until', '<', $now)->count(),
                'scheduled_codes' => PromoCode::where('valid_from', '>', $now)->count(),
                'total_usage' => PromoCode::sum('used_count') ?? 0,
                'total_discount_given' => $hasPromoCodeId && $hasDiscountAmount 
                    ? (Order::whereNotNull('promo_code_id')
                        ->where('payment_status', 'completed')
                        ->sum('discount_amount') ?? 0)
                    : 0,
                'revenue_with_promo' => $hasPromoCodeId 
                    ? (Order::whereNotNull('promo_code_id')
                        ->where('payment_status', 'completed')
                        ->sum('total') ?? 0)
                    : 0,
                'orders_with_promo' => $hasPromoCodeId 
                    ? Order::whereNotNull('promo_code_id')->count() 
                    : 0,
                'most_used_codes' => PromoCode::orderBy('used_count', 'desc')
                    ->limit(5)
                    ->get(['id', 'code', 'type', 'value', 'used_count', 'usage_limit']),
                'recent_codes' => PromoCode::orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get(['id', 'code', 'type', 'value', 'valid_from', 'valid_until', 'is_active', 'used_count']),
                'codes_by_type' => PromoCode::select('type', DB::raw('count(*) as count'))
                    ->groupBy('type')
                    ->get(),
            ];

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            \Log::error('Promo codes analytics error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch promo codes analytics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
