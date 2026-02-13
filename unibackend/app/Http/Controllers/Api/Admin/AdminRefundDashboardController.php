<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OrderRefund;
use App\Services\OrderCancellationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * AdminRefundDashboardController — Admin refund management & analytics.
 *
 * Provides:
 * - Refund listing with advanced filtering (type, status, date, amount)
 * - Refund detail view
 * - Refund statistics & analytics
 * - Manual reconciliation trigger
 * - Partial item refund for card-paid orders
 */
class AdminRefundDashboardController extends Controller
{
    private OrderCancellationService $cancellationService;

    public function __construct(OrderCancellationService $cancellationService)
    {
        $this->cancellationService = $cancellationService;
    }

    /**
     * List all refunds with advanced filtering.
     * GET /api/v1/admin/refund-dashboard
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = OrderRefund::with(['order:id,order_number,total,status,payment_method', 'user:id,first_name,last_name,email']);

            // ── Filters ──
            if ($request->has('status')) {
                $statuses = is_array($request->status) ? $request->status : [$request->status];
                $query->whereIn('status', $statuses);
            }

            if ($request->has('type')) {
                $types = is_array($request->type) ? $request->type : [$request->type];
                $query->whereIn('type', $types);
            }

            if ($request->has('initiated_by')) {
                $query->where('initiated_by', $request->initiated_by);
            }

            if ($request->has('refund_method')) {
                $query->where('refund_method', $request->refund_method);
            }

            if ($request->has('date_from')) {
                $query->where('created_at', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
            }

            if ($request->has('min_amount')) {
                $query->where('refund_amount', '>=', $request->min_amount);
            }

            if ($request->has('max_amount')) {
                $query->where('refund_amount', '<=', $request->max_amount);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->whereHas('order', function ($oq) use ($search) {
                        $oq->where('order_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhere('paymob_refund_id', 'like', "%{$search}%");
                });
            }

            // ── Sorting ──
            $sortBy = $request->input('sort_by', 'created_at');
            $sortOrder = $request->input('sort_order', 'desc');
            $allowedSorts = ['id', 'created_at', 'refund_amount', 'status', 'type', 'completed_at', 'order_id'];
            if (in_array($sortBy, $allowedSorts)) {
                $query->orderBy($sortBy, $sortOrder);
            }

            // ── Pagination ──
            $perPage = min((int) $request->input('per_page', 20), 100);
            $refunds = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => [
                    'refunds' => $refunds->items(),
                    'pagination' => [
                        'current_page' => $refunds->currentPage(),
                        'per_page' => $refunds->perPage(),
                        'total' => $refunds->total(),
                        'last_page' => $refunds->lastPage(),
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('[ADMIN REFUND DASHBOARD] List error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to retrieve refunds'], 500);
        }
    }

    /**
     * Get single refund detail.
     * GET /api/v1/admin/refund-dashboard/{id}
     */
    public function show(int $id): JsonResponse
    {
        try {
            $refund = OrderRefund::with([
                'order:id,order_number,total,status,payment_method,payment_status,user_id,created_at',
                'order.items:id,order_id,product_name,quantity,price,subtotal,refunded',
                'user:id,first_name,last_name,email,phone',
                'admin:id,first_name,last_name',
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => ['refund' => $refund],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Refund not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to retrieve refund'], 500);
        }
    }

    /**
     * Refund statistics for dashboard cards.
     * GET /api/v1/admin/refund-dashboard/stats
     */
    public function stats(Request $request): JsonResponse
    {
        try {
            $dateFrom = $request->input('date_from', now()->startOfMonth()->toDateString());
            $dateTo = $request->input('date_to', now()->toDateString());

            $stats = DB::table('order_refunds')
                ->selectRaw("
                    COUNT(*) as total_refunds,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_refunds,
                    SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_refunds,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_refunds,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_refunds,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN refund_amount ELSE 0 END), 0) as total_refunded_amount,
                    COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'full' THEN refund_amount ELSE 0 END), 0) as full_refund_amount,
                    COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'penalty' THEN refund_amount ELSE 0 END), 0) as penalty_refund_amount,
                    COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'partial' THEN refund_amount ELSE 0 END), 0) as partial_refund_amount,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN penalty_amount ELSE 0 END), 0) as total_penalty_collected,
                    COALESCE(AVG(CASE WHEN status = 'completed' THEN refund_amount ELSE NULL END), 0) as avg_refund_amount,
                    SUM(CASE WHEN initiated_by = 'customer' THEN 1 ELSE 0 END) as customer_initiated,
                    SUM(CASE WHEN initiated_by = 'admin' THEN 1 ELSE 0 END) as admin_initiated
                ")
                ->whereBetween('created_at', [$dateFrom, $dateTo . ' 23:59:59'])
                ->first();

            // Daily breakdown for chart
            $dailyBreakdown = DB::table('order_refunds')
                ->selectRaw("
                    DATE(created_at) as date,
                    COUNT(*) as count,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN refund_amount ELSE 0 END), 0) as amount
                ")
                ->whereBetween('created_at', [$dateFrom, $dateTo . ' 23:59:59'])
                ->groupByRaw('DATE(created_at)')
                ->orderBy('date')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'daily_breakdown' => $dailyBreakdown,
                    'date_range' => ['from' => $dateFrom, 'to' => $dateTo],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('[ADMIN REFUND DASHBOARD] Stats error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to retrieve refund stats'], 500);
        }
    }

    /**
     * Admin-initiated partial item refund for card-paid orders.
     * POST /api/v1/admin/refund-dashboard/partial-item-refund
     */
    public function partialItemRefund(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|integer|exists:orders,id',
            'item_ids' => 'required|array|min:1',
            'item_ids.*' => 'integer',
            'reason' => 'required|string|max:500',
        ]);

        try {
            $admin = $request->user();
            $result = $this->cancellationService->partialItemRefund(
                $validated['order_id'],
                $validated['item_ids'],
                $validated['reason'],
                $admin->id
            );

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => [
                    'refund' => $result['refund'],
                    'order' => $result['order'],
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
