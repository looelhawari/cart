<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Services\DeliveryZoneService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Driver-facing controller for delivery management.
 */
class DriverController extends Controller
{
    private DeliveryZoneService $zoneService;

    public function __construct(DeliveryZoneService $zoneService)
    {
        $this->zoneService = $zoneService;
    }

    /**
     * Get driver dashboard (current orders, stats).
     */
    public function dashboard(Request $request): JsonResponse
    {
        $driver = $request->user();

        $activeOrders = Order::where('driver_id', $driver->id)
            ->whereNotIn('status', ['delivered', 'cancelled', 'failed'])
            ->with(['deliveryAddress', 'user:id,first_name,last_name,phone'])
            ->orderBy('created_at', 'desc')
            ->get();

        $todayStats = Order::where('driver_id', $driver->id)
            ->whereDate('created_at', today())
            ->selectRaw('
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = "delivered" THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = "delivered" THEN delivery_fee ELSE 0 END) as total_earnings
            ')
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'active_orders' => $activeOrders,
                'is_available' => $driver->is_available,
                'assigned_zone' => $driver->assignedZone,
                'today_stats' => [
                    'total_orders' => (int) $todayStats->total_orders,
                    'delivered' => (int) $todayStats->delivered,
                    'cancelled' => (int) $todayStats->cancelled,
                    'total_earnings' => (float) $todayStats->total_earnings,
                ],
            ],
        ]);
    }

    /**
     * Toggle driver availability.
     */
    public function toggleAvailability(Request $request): JsonResponse
    {
        $driver = $request->user();
        $driver->update([
            'is_available' => !$driver->is_available,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'is_available' => $driver->is_available,
            ],
            'message' => $driver->is_available ? __('driver.now_online') : __('driver.now_offline'),
        ]);
    }

    /**
     * Update driver GPS location.
     */
    public function updateLocation(Request $request): JsonResponse
    {
        $driver = $request->user();

        $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'speed'     => 'nullable|numeric|min:0',
            'heading'   => 'nullable|numeric|between:0,360',
            'accuracy'  => 'nullable|numeric|min:0',
            // SECURITY HARDENED (audit Chain E): scope order_id to THIS driver.
            // Previously a malicious driver could send order_id of another
            // driver's order — the broadcast then fired on that order's
            // tracking channel showing this driver's GPS as the assigned one.
            'order_id'  => [
                'nullable',
                \Illuminate\Validation\Rule::exists('orders', 'id')->where(function ($q) use ($driver) {
                    $q->where('driver_id', $driver->id);
                }),
            ],
        ]);

        $this->zoneService->updateDriverLocation($driver, $request->latitude, $request->longitude, [
            'order_id' => $request->order_id,
            'speed'    => $request->speed,
            'heading'  => $request->heading,
            'accuracy' => $request->accuracy,
        ]);

        return response()->json([
            'success' => true,
            'message' => __('driver.location_updated'),
        ]);
    }

    /**
     * Get assigned orders for this driver.
     */
    public function orders(Request $request): JsonResponse
    {
        $driver = $request->user();
        $status = $request->input('status');

        $query = Order::where('driver_id', $driver->id)
            ->with(['deliveryAddress', 'user:id,first_name,last_name,phone', 'items.product'])
            ->orderBy('created_at', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        $orders = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    /**
     * Get single order details.
     */
    public function orderDetails(Request $request, int $orderId): JsonResponse
    {
        $order = Order::where('driver_id', $request->user()->id)
            ->with(['deliveryAddress', 'user:id,first_name,last_name,phone', 'items.product', 'customerRating'])
            ->findOrFail($orderId);

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    /**
     * Accept an assigned order.
     */
    public function acceptOrder(Request $request, int $orderId): JsonResponse
    {
        $driver = $request->user();

        $order = Order::where('id', $orderId)
            ->where('driver_id', $driver->id)
            ->where('status', 'confirmed')
            ->firstOrFail();

        // SECURITY HARDENED (audit M2): for online (card) orders, refuse to
        // accept until payment_status is in a non-failed state. Without this
        // a driver could accept an unpaid card order, deliver it, and then
        // the company is out the goods.
        if ($order->payment_method === 'card' && $order->payment_status !== 'completed') {
            return response()->json([
                'success' => false,
                'message' => __('driver.cannot_accept_unpaid'),
            ], 400);
        }

        $order->update([
            'status' => 'preparing',
        ]);

        return response()->json([
            'success' => true,
            'message' => __('driver.order_accepted'),
            'data' => $order->fresh(),
        ]);
    }

    /**
     * Mark order as picked up (out for delivery).
     */
    public function pickupOrder(Request $request, int $orderId): JsonResponse
    {
        $driver = $request->user();

        $order = Order::where('id', $orderId)
            ->where('driver_id', $driver->id)
            ->where('status', 'preparing')
            ->firstOrFail();

        $order->update([
            'status' => 'out_for_delivery',
            'driver_picked_up_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => __('driver.order_picked_up'),
            'data' => $order->fresh(),
        ]);
    }

    /**
     * Mark order as delivered.
     */
    public function deliverOrder(Request $request, int $orderId): JsonResponse
    {
        $driver = $request->user();

        $order = Order::where('id', $orderId)
            ->where('driver_id', $driver->id)
            ->where('status', 'out_for_delivery')
            ->firstOrFail();

        // SECURITY HARDENED (audit M3): for COD orders, require a confirmation
        // code that proves the customer was present at delivery. The code is
        // derived deterministically from order_id + order_number; the customer
        // sees it in their app on the "Order delivered?" screen and reads it
        // to the driver, who enters it here. Mitigates driver-side fraud
        // (mark delivered without actually delivering / collecting cash).
        if ($order->payment_method === 'cash_on_delivery') {
            $request->validate([
                'confirmation_code' => 'required|string|size:6',
            ]);

            $expected = self::deliveryConfirmationCode($order);
            if (!hash_equals($expected, strtoupper($request->input('confirmation_code')))) {
                return response()->json([
                    'success' => false,
                    'message' => __('driver.invalid_confirmation_code'),
                ], 422);
            }
        }

        DB::transaction(function () use ($order, $driver) {
            $updates = [
                'status' => 'delivered',
                'actual_delivered_at' => now(),
            ];

            if ($order->completePaymentOnDelivery()) {
                $updates['payment_status'] = $order->payment_status;
            }

            $order->update($updates);

            // Update driver stats
            $driver->increment('total_deliveries');
        });

        return response()->json([
            'success' => true,
            'message' => __('driver.order_delivered'),
            'data' => $order->fresh(),
        ]);
    }

    /**
     * Deterministic 6-character delivery confirmation code derived from a
     * server-side secret. The customer sees this in their app's order screen.
     * The driver requests it from the customer and enters it on delivery.
     */
    public static function deliveryConfirmationCode(Order $order): string
    {
        $hmac = hash_hmac(
            'sha256',
            "delivery_confirm:{$order->id}:{$order->order_number}",
            (string) config('app.key'),
        );
        // 6 hex chars uppercase, easy to read aloud
        return strtoupper(substr($hmac, 0, 6));
    }

    /**
     * Get driver performance stats.
     */
    public function stats(Request $request): JsonResponse
    {
        $driver = $request->user();
        $period = $request->input('period', '7d');

        $dateFrom = match($period) {
            '1d'  => now()->subDay(),
            '7d'  => now()->subDays(7),
            '30d' => now()->subDays(30),
            'all' => null,
            default => now()->subDays(7),
        };

        $query = Order::where('driver_id', $driver->id);
        if ($dateFrom) {
            $query->where('created_at', '>=', $dateFrom);
        }

        $delivered = (clone $query)->where('status', 'delivered');

        return response()->json([
            'success' => true,
            'data' => [
                'total_orders' => $query->count(),
                'delivered' => $delivered->count(),
                'cancelled' => (clone $query)->where('status', 'cancelled')->count(),
                'total_earnings' => round($delivered->sum('delivery_fee'), 2),
                'average_rating' => $driver->average_rating,
                'total_deliveries_all_time' => $driver->total_deliveries,
            ],
        ]);
    }

    /**
     * Reject an assigned order — triggers reassignment to next nearest driver.
     */
    public function rejectOrder(Request $request, int $orderId): JsonResponse
    {
        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $driver = $request->user();

        $order = Order::where('id', $orderId)
            ->where('driver_id', $driver->id)
            ->where('status', 'confirmed')
            ->firstOrFail();

        // Unassign current driver
        $order->update([
            'driver_id' => null,
            'driver_assigned_at' => null,
        ]);

        // Try to reassign to next nearest available driver (excluding this one)
        $newDriver = $this->zoneService->assignDriver($order);

        return response()->json([
            'success' => true,
            'message' => __('driver.order_rejected'),
            'data' => [
                'reassigned' => $newDriver !== null,
                'new_driver_name' => $newDriver ? trim($newDriver->first_name . ' ' . $newDriver->last_name) : null,
            ],
        ]);
    }
}
