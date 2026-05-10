<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderStatusController extends Controller
{
    protected OrderService $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Mark COD order as delivered (finalizes payment + promo usage)
     * POST /api/v1/admin/orders/{orderId}/deliver
     */
    public function markDelivered(Request $request, int $orderId): JsonResponse
    {
        $user = $request->user();

        if (!$user || !$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $order = Order::findOrFail($orderId);

        if (!Order::isOnDeliveryPayment($order->payment_method)) {
            return response()->json([
                'success' => false,
                'message' => 'Only pay-on-delivery orders (cash or card machine) can be marked delivered through this endpoint',
            ], 422);
        }

        if ($order->status === 'delivered' && $order->payment_status === 'completed') {
            return response()->json([
                'success' => true,
                'message' => 'Order already delivered',
                'data' => ['order' => $order],
            ]);
        }

        $order = $this->orderService->markCodOrderDelivered($order);

        return response()->json([
            'success' => true,
            'message' => 'Order marked as delivered',
            'data' => ['order' => $order],
        ]);
    }
}
