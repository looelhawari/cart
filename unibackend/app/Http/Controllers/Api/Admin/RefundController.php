<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Exception;

class RefundController extends Controller
{
    private RefundService $refundService;

    public function __construct(RefundService $refundService)
    {
        $this->refundService = $refundService;
    }

    /**
     * Initiate full refund for an order
     * POST /api/v1/admin/refunds/full
     */
    public function fullRefund(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|exists:orders,id',
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $order = Order::with(['items', 'user'])->findOrFail($request->order_id);

            // Check if already refunded
            if ($order->payment_status === 'refunded') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order already fully refunded',
                ], 400);
            }

            // Check if order was paid
            if ($order->payment_status !== 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot refund unpaid order',
                ], 400);
            }

            // Process refund
            $admin = $request->user();
            $this->refundService->refundOrder($order, $request->reason, $admin);

            Log::info('Admin initiated full refund', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'amount' => $order->total,
                'admin_id' => $admin->id,
                'reason' => $request->reason,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Order refunded successfully',
                'data' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'refunded_amount' => $order->total,
                    'refunded_to' => 'wallet',
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Full refund failed', [
                'error' => $e->getMessage(),
                'order_id' => $request->order_id ?? null,
                'admin_id' => $request->user()->id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Initiate partial refund for specific order items
     * POST /api/v1/admin/refunds/partial
     */
    public function partialRefund(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|exists:orders,id',
            'item_ids' => 'required|array|min:1',
            'item_ids.*' => 'required|exists:order_items,id',
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $order = Order::with(['items'])->findOrFail($request->order_id);

            // Verify items belong to this order
            $validItems = $order->items->whereIn('id', $request->item_ids);
            if ($validItems->count() !== count($request->item_ids)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Some items do not belong to this order',
                ], 400);
            }

            // Check if items already refunded
            $alreadyRefunded = $validItems->where('refunded', true);
            if ($alreadyRefunded->isNotEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Some items have already been refunded',
                ], 400);
            }

            // Process partial refund
            $this->refundService->partialRefund($order, $request->item_ids, $request->reason);

            $refundedAmount = $validItems->sum('subtotal');

            Log::info('Admin initiated partial refund', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'item_ids' => $request->item_ids,
                'amount' => $refundedAmount,
                'admin_id' => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Partial refund processed successfully',
                'data' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'refunded_amount' => $refundedAmount,
                    'items_refunded' => count($request->item_ids),
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Partial refund failed', [
                'error' => $e->getMessage(),
                'order_id' => $request->order_id ?? null,
                'admin_id' => $request->user()->id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get refund history for an order
     * GET /api/v1/admin/refunds/history/{orderId}
     */
    public function getRefundHistory(int $orderId): JsonResponse
    {
        try {
            $order = Order::with(['items', 'user'])->findOrFail($orderId);

            $history = [];

            // Check for full refund
            if ($order->refunded_at) {
                $history[] = [
                    'type' => 'full',
                    'amount' => $order->refunded_amount,
                    'reason' => $order->refund_reason,
                    'refunded_at' => $order->refunded_at->toIso8601String(),
                    'refunded_by' => $order->refundedBy ? [
                        'id' => $order->refundedBy->id,
                        'name' => $order->refundedBy->first_name . ' ' . $order->refundedBy->last_name,
                    ] : null,
                ];
            }

            // Check for partial refunds
            $refundedItems = $order->items->where('refunded', true);
            if ($refundedItems->isNotEmpty()) {
                foreach ($refundedItems as $item) {
                    $history[] = [
                        'type' => 'partial',
                        'item_id' => $item->id,
                        'product_name' => $item->product->name_en ?? 'Unknown',
                        'amount' => $item->subtotal,
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'payment_status' => $order->payment_status,
                    'total' => $order->total,
                    'refunded_amount' => $order->refunded_amount,
                    'history' => $history,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get refund history', [
                'error' => $e->getMessage(),
                'order_id' => $orderId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve refund history',
            ], 500);
        }
    }
}
