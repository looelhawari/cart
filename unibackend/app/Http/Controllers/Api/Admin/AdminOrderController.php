<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Jobs\ProcessOrderAsync;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminOrderController extends Controller
{
    /**
     * List all orders with advanced filtering for admin/employee dashboard
     */
    public function index(Request $request)
    {
        $query = Order::query()->with(['user', 'items.product', 'deliveryAddress']);

        // Search by order number, customer name, email, or phone
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by order status (can be multiple statuses)
        if ($request->filled('status')) {
            if (is_array($request->status)) {
                $query->whereIn('status', $request->status);
            } else {
                $query->where('status', $request->status);
            }
        }

        // Filter by payment status
        if ($request->filled('payment_status')) {
            if (is_array($request->payment_status)) {
                $query->whereIn('payment_status', $request->payment_status);
            } else {
                $query->where('payment_status', $request->payment_status);
            }
        }

        // Filter by payment method
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        // Date range filters
        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        // Delivery date filters
        if ($request->filled('delivery_date')) {
            $query->whereDate('scheduled_delivery_date', $request->delivery_date);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Get summary statistics
        $summary = [
            'total_orders' => (clone $query)->count(),
            'total_revenue' => (clone $query)->where('payment_status', 'completed')->sum('total'),
            'pending' => (clone $query)->where('status', 'pending')->count(),
            'confirmed' => (clone $query)->where('status', 'confirmed')->count(),
            'preparing' => (clone $query)->where('status', 'preparing')->count(),
            'out_for_delivery' => (clone $query)->where('status', 'out_for_delivery')->count(),
            'delivered' => (clone $query)->where('status', 'delivered')->count(),
            'cancelled' => (clone $query)->where('status', 'cancelled')->count(),
            'failed' => (clone $query)->where('status', 'failed')->count(),
        ];

        // Pagination
        $perPage = min($request->get('per_page', 20), 100); // Max 100 per page
        $orders = $query->paginate($perPage);

        return response()->json([
            'orders' => $orders,
            'summary' => $summary,
        ]);
    }

    /**
     * Get detailed order information
     */
    public function show($id)
    {
        $order = Order::with([
            'user',
            'items',
            'deliveryAddress'
        ])->findOrFail($id);

        return new OrderResource($order);
    }

    /**
     * Update order status with validation and business logic
     */
    public function updateStatus(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,preparing,out_for_delivery,delivered,cancelled,failed',
            'notes' => 'nullable|string|max:500',
        ]);

        // Prevent status changes for delivered or cancelled orders
        if (in_array($order->status, ['delivered', 'cancelled'])) {
            return response()->json([
                'message' => 'Cannot update status for delivered or cancelled orders'
            ], 422);
        }

        // Validate status transitions
        $allowedTransitions = [
            'pending' => ['confirmed', 'cancelled', 'failed'],
            'confirmed' => ['preparing', 'cancelled'],
            'preparing' => ['out_for_delivery', 'cancelled'],
            'out_for_delivery' => ['delivered', 'failed'],
            'failed' => ['confirmed'], // Allow retry
        ];

        $currentStatus = $order->status;
        $newStatus = $validated['status'];

        if (!isset($allowedTransitions[$currentStatus]) || 
            !in_array($newStatus, $allowedTransitions[$currentStatus])) {
            return response()->json([
                'message' => "Invalid status transition from {$currentStatus} to {$newStatus}"
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Update order status
            $order->update(['status' => $newStatus]);

            // Auto-complete payment for COD when delivered
            if ($newStatus === 'delivered' && $order->payment_method === 'cash_on_delivery') {
                $order->update(['payment_status' => 'completed']);
            }

            DB::commit();
            
            // Dispatch async processing (notifications, analytics)
            ProcessOrderAsync::dispatch($order, $newStatus);

            return response()->json([
                'message' => 'Order status updated successfully',
                'order' => $order->fresh(['user', 'items.product', 'deliveryAddress']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update order status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel an order with reason
     */
    public function cancel(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        // Cannot cancel delivered orders
        if ($order->status === 'delivered') {
            return response()->json([
                'message' => 'Cannot cancel delivered orders. Please use refund instead.'
            ], 422);
        }

        // Cannot cancel already cancelled orders
        if ($order->status === 'cancelled') {
            return response()->json([
                'message' => 'Order is already cancelled'
            ], 422);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
            'cancelled_by' => 'nullable|in:customer,admin,system',
        ]);

        DB::beginTransaction();
        try {
            $order->update([
                'status' => 'cancelled',
                'cancellation_reason' => $validated['reason'],
                'cancelled_by' => $validated['cancelled_by'] ?? 'admin',
                'cancelled_at' => now(),
            ]);

            // Restore product stock if order was confirmed or preparing
            if (in_array($order->status, ['confirmed', 'preparing'])) {
                foreach ($order->items as $item) {
                    if ($item->product) {
                        $item->product->increment('stock_quantity', $item->quantity);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Order cancelled successfully',
                'order' => $order->fresh(['user', 'items.product', 'deliveryAddress']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to cancel order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get orders by specific status for employee workflows
     * Example: GET /api/v1/admin/orders/status/preparing
     */
    public function byStatus(Request $request, $status)
    {
        $validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'failed'];
        
        if (!in_array($status, $validStatuses)) {
            return response()->json([
                'message' => 'Invalid status',
                'valid_statuses' => $validStatuses
            ], 422);
        }

        $query = Order::query()
            ->with(['user', 'items.product', 'deliveryAddress'])
            ->where('status', $status);

        // Additional filters
        if ($request->filled('delivery_date')) {
            $query->whereDate('scheduled_delivery_date', $request->delivery_date);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = min($request->get('per_page', 20), 100);
        $orders = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'status' => $status,
            'orders' => $orders,
        ]);
    }
}
