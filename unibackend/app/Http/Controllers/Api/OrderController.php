<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateOrderRequest;
use App\Models\Cart;
use App\Models\PromoCode;
use App\Services\CartService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    protected OrderService $orderService;
    protected CartService $cartService;

    public function __construct(OrderService $orderService, CartService $cartService)
    {
        $this->orderService = $orderService;
        $this->cartService = $cartService;
    }

    /**
     * Get user's orders
     * GET /api/v1/orders
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $status = $request->query('status');
            $perPage = $request->query('per_page', 10);

            $orders = $this->orderService->getUserOrders($user->id, $status, $perPage);

            return response()->json([
                'success' => true,
                'data' => [
                    'orders' => $orders->items(),
                    'pagination' => [
                        'current_page' => $orders->currentPage(),
                        'per_page' => $orders->perPage(),
                        'total' => $orders->total(),
                        'last_page' => $orders->lastPage(),
                    ],
                ],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve orders',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single order details
     * GET /api/v1/orders/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $order = $this->orderService->getOrder($id, $user->id);

            return response()->json([
                'success' => true,
                'data' => ['order' => $order],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create order from cart
     * POST /api/v1/orders
     */
    public function store(CreateOrderRequest $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required. Please login to place an order.',
                ], 401);
            }

            // Get user's cart
            $sessionId = $request->header('X-Session-ID');
            $cart = $this->cartService->getCart($user->id, $sessionId);

            if ($cart->items->count() === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cart is empty',
                ], 422);
            }

            // Validate promo code if provided
            $promoCode = null;
            if ($request->promo_code) {
                $promoCode = $this->cartService->validatePromoCode(
                    $request->promo_code,
                    $cart,
                    $user->id
                );
            }

            // Create order
            $order = $this->orderService->createOrderFromCart(
                $cart,
                $user->id,
                $request->delivery_address_id,
                $request->payment_method,
                $request->delivery_date,
                $request->delivery_time_slot,
                $request->notes,
                $promoCode
            );

            return response()->json([
                'success' => true,
                'message' => 'Order placed successfully',
                'data' => ['order' => $order],
            ], 201, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get live tracking data for an order
     * GET /api/v1/orders/{id}/tracking
     */
    public function tracking(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $order = $this->orderService->getOrder($id, $user->id);

            // Build tracking response
            $trackingData = [
                'order_id'     => $order->id,
                'order_number' => $order->order_number,
                'status'       => $order->status,
                'status_label' => $order->status_label,

                // Timeline with timestamps
                'timeline' => [
                    [
                        'status'    => 'pending',
                        'label'     => 'Order Placed',
                        'completed' => true,
                        'time'      => $order->created_at?->toIso8601String(),
                    ],
                    [
                        'status'    => 'confirmed',
                        'label'     => 'Order Confirmed',
                        'completed' => in_array($order->status, ['confirmed', 'preparing', 'out_for_delivery', 'delivered']),
                        'time'      => null, // From status_history if available
                    ],
                    [
                        'status'    => 'preparing',
                        'label'     => 'Preparing Your Order',
                        'completed' => in_array($order->status, ['preparing', 'out_for_delivery', 'delivered']),
                        'time'      => null,
                    ],
                    [
                        'status'    => 'out_for_delivery',
                        'label'     => 'Out for Delivery',
                        'completed' => in_array($order->status, ['out_for_delivery', 'delivered']),
                        'time'      => $order->driver_picked_up_at?->toIso8601String(),
                    ],
                    [
                        'status'    => 'delivered',
                        'label'     => 'Delivered',
                        'completed' => $order->status === 'delivered',
                        'time'      => $order->actual_delivered_at?->toIso8601String(),
                    ],
                ],

                // Delivery location
                'delivery' => [
                    'lat'             => (float) $order->delivery_lat,
                    'lng'             => (float) $order->delivery_lng,
                    'zone_name'       => $order->zone_name,
                    'address'         => $order->deliveryAddress ? [
                        'street'   => $order->deliveryAddress->street,
                        'city'     => $order->deliveryAddress->city,
                        'area'     => $order->deliveryAddress->area,
                        'building' => $order->deliveryAddress->building,
                        'floor'    => $order->deliveryAddress->floor,
                        'apartment' => $order->deliveryAddress->apartment,
                    ] : null,
                    'estimated_minutes' => $order->estimated_delivery_minutes,
                ],

                // Driver info (only if assigned)
                'driver' => null,
            ];

            // If driver is assigned, include driver data + live location
            if ($order->driver_id) {
                $driver = $order->driver;
                $trackingData['driver'] = [
                    'id'         => $driver->id,
                    'name'       => trim(($driver->first_name ?? '') . ' ' . ($driver->last_name ?? '')),
                    'phone'      => $driver->phone,
                    'photo'      => $driver->profile_photo,
                    'rating'     => (float) ($driver->average_rating ?? 0),
                    'location'   => [
                        'lat'     => (float) ($driver->current_lat ?? 0),
                        'lng'     => (float) ($driver->current_lng ?? 0),
                        'heading' => null,
                        'updated_at' => $driver->location_updated_at?->toIso8601String(),
                    ],
                    'assigned_at'  => $order->driver_assigned_at?->toIso8601String(),
                    'picked_up_at' => $order->driver_picked_up_at?->toIso8601String(),
                ];

                // Get latest heading from location history
                $latestLocation = DB::table('driver_location_history')
                    ->where('driver_id', $driver->id)
                    ->where('order_id', $order->id)
                    ->orderByDesc('recorded_at')
                    ->first();

                if ($latestLocation) {
                    $trackingData['driver']['location']['heading'] = (float) $latestLocation->heading;
                }
            }

            // Calculate ETA
            if ($order->status === 'out_for_delivery' && $order->estimated_delivery_minutes) {
                $pickupTime = $order->driver_picked_up_at ?? now();
                $eta = $pickupTime->copy()->addMinutes($order->estimated_delivery_minutes);
                $minutesRemaining = max(0, (int) now()->diffInMinutes($eta, false));

                $trackingData['eta'] = [
                    'estimated_arrival' => $eta->toIso8601String(),
                    'minutes_remaining' => $minutesRemaining,
                    'total_minutes'     => $order->estimated_delivery_minutes,
                ];
            } else {
                $trackingData['eta'] = null;
            }

            return response()->json([
                'success' => true,
                'data'    => $trackingData,
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve tracking data',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel order
     * POST /api/v1/orders/{id}/cancel
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 400);
        }

        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $order = $this->orderService->cancelOrder($id, $user->id, $request->input('reason', 'Cancelled by user'));

            return response()->json([
                'success' => true,
                'message' => 'Order cancelled successfully',
                'data' => ['order' => $order],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found or cannot be cancelled',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reorder from previous order
     * POST /api/v1/orders/{id}/reorder
     */
    public function reorder(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $sessionId = $request->header('X-Session-ID');
            $reorderResult = $this->orderService->reorder($id, $user->id, $sessionId);

            $cartDetails = $this->cartService->getCartDetails($reorderResult['cart']);

            return response()->json([
                'success' => true,
                'message' => 'Items added to cart',
                'data' => [
                    'cart' => $cartDetails,
                    'added_items' => $reorderResult['added_items'],
                    'unavailable_items' => $reorderResult['unavailable_items'],
                    'summary' => $reorderResult['summary'],
                ],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reorder',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
