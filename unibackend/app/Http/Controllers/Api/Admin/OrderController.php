<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Services\PushNotificationService;
use App\Services\EnterpriseNotificationService;
use App\Services\DeliveryZoneService;
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
        $query = Order::with(['user', 'deliveryAddress', 'items'])
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

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
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
        ];

        return response()->json([
            'data' => $orders->items(),
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

        return response()->json(['data' => $order]);
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

        if ($request->status === 'delivered' && $order->payment_method === 'cash_on_delivery' && $order->payment_status === 'pending') {
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
     * Cancel an order
     */
    public function cancel(Request $request, $id)
    {
        $request->validate([
            'cancellation_reason' => 'required|string',
        ]);

        $order = Order::findOrFail($id);

        if (in_array($order->status, ['delivered', 'cancelled'])) {
            return response()->json([
                'message' => 'Cannot cancel an order that is already ' . $order->status,
            ], 422);
        }

        $order->status = 'cancelled';
        $order->cancelled_at = now();
        $order->cancellation_reason = $request->cancellation_reason;
        $order->save();

        // Send push notification for cancellation
        if ($order->user_id) {
            $this->pushNotificationService->sendOrderStatusNotification(
                $order->user_id,
                $order->id,
                $order->order_number,
                'cancelled',
                $request->cancellation_reason
            );
        }

        return response()->json([
            'message' => 'Order cancelled successfully',
            'data' => $order,
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
