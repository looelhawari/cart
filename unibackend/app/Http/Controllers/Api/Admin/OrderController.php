<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Services\PushNotificationService;
use App\Services\EnterpriseNotificationService;
use App\Services\DeliveryZoneService;
use App\Services\OrderCancellationService;
use App\Models\ActivityLog;
use App\Events\OrderStatusUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    protected PushNotificationService $pushNotificationService;
    protected ?EnterpriseNotificationService $enterpriseNotificationService;
    protected DeliveryZoneService $deliveryZoneService;

    public function __construct(PushNotificationService $pushNotificationService, DeliveryZoneService $deliveryZoneService)
    {
        $this->pushNotificationService = $pushNotificationService;
        $this->deliveryZoneService = $deliveryZoneService;
        try {
            $this->enterpriseNotificationService = app(EnterpriseNotificationService::class);
        } catch (\Exception $e) {
            $this->enterpriseNotificationService = null;
        }
    }

    /**
     * Display a listing of orders with filters
     */
    public function index(Request $request)
    {
        // FIXED (Wave 5 — Task 5 + Task 4):
        // (1) Eager-load `items.product` so each line item carries its
        //     product's image when serialised. Without `.product` here,
        //     OrderItemResource::toArray() reads `null` for product_image
        //     and dashboard order rows render no thumbnail.
        // (2) The list previously returned raw `$orders->items()` so
        //     `delivery_date` / `delivery_time_slot` reached the dashboard
        //     by accident but the dashboard couldn't render them properly.
        //     We now wrap with OrderResource::collection so every consumer
        //     sees a stable shape.
        $query = Order::with(['user', 'deliveryAddress', 'items.product'])
            ->select('orders.*');

        // Search by order number or customer name
        if ($search = $request->input('search')) {
            $query->where(function($q) use ($search) {
                $q->where('order_number', 'LIKE', "%{$search}%")
                  ->orWhereHas('user', function($userQuery) use ($search) {
                      $userQuery->where('first_name', 'LIKE', "%{$search}%")
                               ->orWhere('last_name', 'LIKE', "%{$search}%")
                               ->orWhere('email', 'LIKE', "%{$search}%");
                  });
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            if (is_array($status)) {
                $query->whereIn('status', $status);
            } else {
                $query->where('status', $status);
            }
        }

        // Payment status filter
        if ($paymentStatus = $request->input('payment_status')) {
            if (is_array($paymentStatus)) {
                $query->whereIn('payment_status', $paymentStatus);
            } else {
                $query->where('payment_status', $paymentStatus);
            }
        }

        // Payment method filter
        if ($paymentMethod = $request->input('payment_method')) {
            $query->where('payment_method', $paymentMethod);
        }

        // Date range filter
        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Total amount filter
        if ($minTotal = $request->input('min_total')) {
            $query->where('total', '>=', $minTotal);
        }
        if ($maxTotal = $request->input('max_total')) {
            $query->where('total', '<=', $maxTotal);
        }

        // Scheduled-vs-instant filter (Wave 5 — Task 4):
        // ?scheduled=1 returns only scheduled (delivery_date NOT NULL).
        // ?scheduled=0 returns only instant.
        // Anything else: no filter (returns both).
        if ($request->has('scheduled')) {
            $scheduledFlag = filter_var($request->input('scheduled'), FILTER_VALIDATE_BOOLEAN);
            if ($scheduledFlag) {
                $query->whereNotNull('delivery_date');
            } else {
                $query->whereNull('delivery_date');
            }
        }

        // Sorting — SECURITY HARDENED (audit C8 — SQL injection via sort).
        //
        // Eloquent's orderBy does NOT validate column names. The previous
        // code piped $request->input('sort_by') and $request->input('sort_order')
        // straight in, so an attacker could send
        //   ?sort_by=id&sort_order=desc,(SELECT SLEEP(5))
        // and Laravel/PDO would happily pass it through as a raw ORDER BY
        // fragment. That's blind SQLi via timing on an admin endpoint —
        // chained with C4 (write-by-viewer) it becomes a real escalation.
        // Whitelist + force asc/desc.
        $allowedSorts = ['id', 'order_number', 'total', 'status', 'payment_status', 'created_at', 'updated_at', 'delivery_date'];
        $sortBy = in_array($request->input('sort_by'), $allowedSorts, true)
            ? $request->input('sort_by')
            : 'created_at';
        $sortOrder = strtolower((string) $request->input('sort_order', 'desc')) === 'asc'
            ? 'asc'
            : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min($request->input('per_page', 20), 100);
        $orders = $query->paginate($perPage);

        // Calculate summary statistics
        $summary = [
            'total_orders' => Order::count(),
            'total_revenue' => Order::where('payment_status', 'completed')->sum('total'),
            'pending_count' => Order::where('status', 'pending')->count(),
            'confirmed_count' => Order::where('status', 'confirmed')->count(),
            'preparing_count' => Order::where('status', 'preparing')->count(),
            'out_for_delivery_count' => Order::where('status', 'out_for_delivery')->count(),
            'delivered_count' => Order::where('status', 'delivered')->count(),
            'cancelled_count' => Order::where('status', 'cancelled')->count(),
            'scheduled_count' => Order::whereNotNull('delivery_date')->count(),
        ];

        // Serialise through OrderResource so items[].product_image,
        // is_scheduled, delivery_date, delivery_time_slot all flow with a
        // stable shape (audit Tasks 4 + 5).
        return response()->json([
            'data' => \App\Http\Resources\OrderResource::collection($orders->items()),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
                'last_page' => $orders->lastPage(),
            ],
            'summary' => $summary,
        ]);
    }

    /**
     * Display the specified order
     */
    public function show($id)
    {
        $order = Order::with([
            'user',
            'deliveryAddress',
            'items.product',
        ])->findOrFail($id);

        // FIXED (Wave 5 — Task 5):
        // Previously returned the raw Eloquent model, which serialises as
        // `items[].product.image` (nested). The dashboard component reads
        // `items[].product_image` (flat) — produced ONLY when items are
        // serialised through OrderItemResource. Wrap in OrderResource here
        // so the field actually arrives.
        return response()->json([
            'data' => new \App\Http\Resources\OrderResource($order),
        ]);
    }

    /**
     * Update order status
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,confirmed,preparing,out_for_delivery,delivered,cancelled,failed',
            'cancellation_reason' => 'required_if:status,cancelled|string|nullable',
        ]);

        $order = Order::findOrFail($id);
        
        $oldStatus = $order->status;
        $order->status = $request->status;

        if ($request->status === 'cancelled') {
            $order->cancelled_at = now();
            $order->cancellation_reason = $request->cancellation_reason;
        }

        if ($request->status === 'delivered' && \App\Models\Order::isOnDeliveryPayment($order->payment_method) && $order->payment_status === 'pending') {
            $order->payment_status = 'completed';
        }

        $order->save();

        // Auto-assign nearest driver when order is confirmed
        if ($order->status === 'confirmed' && $oldStatus !== 'confirmed' && !$order->driver_id) {
            $this->deliveryZoneService->assignDriver($order);
            $order->refresh();
        }

        // Broadcast real-time status update to customer
        if ($oldStatus !== $order->status) {
            try {
                broadcast(new OrderStatusUpdated($order->load('driver')))->toOthers();
            } catch (\Exception $e) {
                Log::warning('Failed to broadcast order status update', ['error' => $e->getMessage()]);
            }
        }

        // Send enterprise notifications for status changes
        if ($oldStatus !== $order->status && $order->user_id && $this->enterpriseNotificationService) {
            try {
                switch ($order->status) {
                    case 'confirmed':
                        $this->enterpriseNotificationService->notifyOrderConfirmedFromOrder($order);
                        break;
                    case 'preparing':
                        $this->enterpriseNotificationService->notifyOrderPreparingFromOrder($order);
                        break;
                    case 'out_for_delivery':
                        $this->enterpriseNotificationService->notifyOutForDeliveryFromOrder($order);
                        break;
                    case 'delivered':
                        $this->enterpriseNotificationService->notifyOrderDeliveredFromOrder($order);
                        break;
                    case 'cancelled':
                        $this->enterpriseNotificationService->notifyOrderCancelledFromOrder($order, $request->cancellation_reason);
                        break;
                    case 'failed':
                        $this->enterpriseNotificationService->notifyDeliveryFailedFromOrder($order, 'Delivery attempt failed');
                        break;
                }
            } catch (\Exception $e) {
                Log::warning('Failed to send enterprise notification', ['error' => $e->getMessage()]);
            }
        }

        // Legacy: Send push notification for status change (fallback)
        if ($oldStatus !== $order->status && $order->user_id) {
            $this->pushNotificationService->sendOrderStatusNotification(
                $order->user_id,
                $order->id,
                $order->order_number,
                $order->status,
                $request->cancellation_reason
            );
        }

        return response()->json([
            'message' => 'Order status updated successfully',
            'data' => $order,
        ]);
    }

    /**
     * Cancel an order (admin-initiated).
     *
     * SECURITY/MONEY HARDENED (audit C2 — admin cancel bypass):
     * The previous version did `$order->status = 'cancelled'; $order->save()`
     * and nothing else. For card-paid orders this kept the customer's money
     * with Paymob, left no `OrderRefund` audit row, never rolled back the
     * promo_code used_count, never restored stock, and the admin actor was
     * silently dropped (`cancelled_by` is not on `Order::$fillable`).
     *
     * Routed through `OrderCancellationService::adminCancelOrder` so all
     * cancels — card, COD, card-on-delivery — flow through the single hardened
     * pipeline: Paymob refund (where applicable), `OrderRefund` audit row,
     * promo rollback, stock restore, notifications + email, idempotency-key
     * gating. ActivityLog records the admin actor explicitly.
     */
    public function cancel(Request $request, $id, OrderCancellationService $cancellationService)
    {
        $validated = $request->validate([
            'cancellation_reason'      => 'required|string|max:500',
            'override_penalty_percent' => 'sometimes|numeric|min:0|max:100',
        ]);

        $admin = $request->user();
        if (! $admin) {
            // Defense in depth — route is already auth:sanctum + admin gated.
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        try {
            $result = $cancellationService->adminCancelOrder(
                (int) $id,
                (int) $admin->id,
                $validated['cancellation_reason'],
                isset($validated['override_penalty_percent'])
                    ? (float) $validated['override_penalty_percent']
                    : null,
            );
        } catch (\Throwable $e) {
            Log::warning('admin-cancel: service threw', [
                'order_id' => $id,
                'admin_id' => $admin->id,
                'error'    => $e->getMessage(),
            ]);
            // Map known business-logic failures to 422; anything unrecognised
            // becomes a generic 422 with safe copy (never the raw exception).
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Cancellation failed',
            ], 422);
        }

        // Authoritative admin audit row — separate from the user-side
        // ActivityLog already in place inside the service.
        ActivityLog::log(
            'admin_order_cancel',
            $admin->id,
            'Order',
            (int) $id,
            [
                'reason'  => $validated['cancellation_reason'],
                'penalty' => $validated['override_penalty_percent'] ?? null,
            ],
        );

        return response()->json([
            'success' => true,
            'message' => $result['message'] ?? 'Order cancelled successfully',
            'data'    => [
                'refund' => $result['refund'] ?? null,
                'order'  => $result['order'] ?? null,
            ],
        ]);
    }

    /**
     * Get orders by status (for employee dashboard views)
     */
    public function byStatus($status)
    {
        $validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
        
        if (!in_array($status, $validStatuses)) {
            return response()->json(['message' => 'Invalid status'], 400);
        }

        $orders = Order::with(['user', 'deliveryAddress', 'items'])
            ->where('status', $status)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
                'last_page' => $orders->lastPage(),
            ],
        ]);
    }
}
