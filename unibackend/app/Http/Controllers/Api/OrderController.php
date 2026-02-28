<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateOrderRequest;
use App\Models\Cart;
use App\Models\Order;
use App\Models\PromoCode;
use App\Services\CartService;
use App\Services\InvoiceService;
use App\Services\OrderCancellationService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use App\Mail\InvoiceMail;

class OrderController extends Controller
{
    protected OrderService $orderService;
    protected CartService $cartService;
    protected OrderCancellationService $cancellationService;
    protected InvoiceService $invoiceService;

    public function __construct(
        OrderService $orderService,
        CartService $cartService,
        OrderCancellationService $cancellationService,
        InvoiceService $invoiceService
    ) {
        $this->orderService = $orderService;
        $this->cartService = $cartService;
        $this->cancellationService = $cancellationService;
        $this->invoiceService = $invoiceService;
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
                    'message' => __('order.auth_required'),
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
                'message' => __('order.failed_retrieve_orders'),
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
                    'message' => __('order.auth_required'),
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
                'message' => __('order.order_not_found_short'),
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('order.failed_retrieve_order'),
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
                    'message' => __('order.auth_required_login'),
                ], 401);
            }

            // Get user's cart
            $sessionId = $request->header('X-Session-ID');
            $cart = $this->cartService->getCart($user->id, $sessionId);

            if ($cart->items->count() === 0) {
                return response()->json([
                    'success' => false,
                    'message' => __('order.cart_empty'),
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
                'message' => __('order.order_placed'),
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
                    'message' => __('order.auth_required'),
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
                        'label'     => __('order.timeline_placed'),
                        'completed' => true,
                        'time'      => $order->created_at?->toIso8601String(),
                    ],
                    [
                        'status'    => 'confirmed',
                        'label'     => __('order.timeline_confirmed'),
                        'completed' => in_array($order->status, ['confirmed', 'preparing', 'out_for_delivery', 'delivered']),
                        'time'      => null, // From status_history if available
                    ],
                    [
                        'status'    => 'preparing',
                        'label'     => __('order.timeline_preparing'),
                        'completed' => in_array($order->status, ['preparing', 'out_for_delivery', 'delivered']),
                        'time'      => null,
                    ],
                    [
                        'status'    => 'out_for_delivery',
                        'label'     => __('order.timeline_out_for_delivery'),
                        'completed' => in_array($order->status, ['out_for_delivery', 'delivered']),
                        'time'      => $order->driver_picked_up_at?->toIso8601String(),
                    ],
                    [
                        'status'    => 'delivered',
                        'label'     => __('order.timeline_delivered'),
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
                'message' => __('order.order_not_found_short'),
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('order.failed_retrieve_tracking'),
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel order with enterprise refund processing
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
                'message' => __('order.validation_failed'),
                'errors' => $validator->errors(),
            ], 400);
        }

        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => __('order.auth_required'),
                ], 401);
            }

            $result = $this->cancellationService->cancelOrder(
                $id,
                $user->id,
                $request->input('reason', __('order.cancelled_by_user'))
            );

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => [
                    'order' => $result['order'],
                    'refund' => $result['refund'],
                ],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => __('order.order_not_found'),
            ], 404);
        } catch (\Illuminate\Database\QueryException $e) {
            \Illuminate\Support\Facades\Log::error('[CANCEL] Database error', [
                'order_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => __('order.system_error'),
            ], 500);
        } catch (\Exception $e) {
            // Sanitize all error messages — never expose raw internal/HTTP/Paymob details
            $rawMsg = $e->getMessage();
            $isSafe = !str_contains($rawMsg, 'SQLSTATE')
                && !str_contains($rawMsg, 'HTTP request returned')
                && !str_contains($rawMsg, '{\"message\"')
                && !str_contains($rawMsg, 'status code')
                && !str_contains($rawMsg, 'Connection refused')
                && !str_contains($rawMsg, 'cURL error');

            $message = $isSafe
                ? $rawMsg
                : __('order.unexpected_error');

            \Illuminate\Support\Facades\Log::error('[CANCEL] Exception', [
                'order_id' => $id,
                'raw_error' => $rawMsg,
                'sanitized' => !$isSafe,
            ]);

            return response()->json([
                'success' => false,
                'message' => $message,
            ], 422);
        }
    }

    /**
     * Check if an order can be cancelled (pre-check for frontend UI).
     * GET /api/v1/orders/{id}/can-cancel
     */
    public function canCancel(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => __('order.auth_required'),
                ], 401);
            }

            $order = Order::where('id', $id)
                ->where('user_id', $user->id)
                ->firstOrFail();

            $eligibility = $this->cancellationService->getCancellationEligibility($order);

            return response()->json([
                'success' => true,
                'data' => $eligibility,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => __('order.order_not_found_short'),
            ], 404);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('[CAN-CANCEL] Error', [
                'order_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => __('order.failed_cancel_check'),
            ], 500);
        }
    }

    /**
     * Get refund history for an order.
     * GET /api/v1/orders/{id}/refunds
     */
    public function refundHistory(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => __('order.auth_required'),
                ], 401);
            }

            // Verify order belongs to user
            Order::where('id', $id)
                ->where('user_id', $user->id)
                ->firstOrFail();

            $refunds = $this->cancellationService->getRefundHistory($id);

            return response()->json([
                'success' => true,
                'data' => ['refunds' => $refunds],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => __('order.order_not_found_short'),
            ], 404);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('[REFUND-HISTORY] Error', [
                'order_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => __('order.failed_refund_history'),
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
                    'message' => __('order.auth_required'),
                ], 401);
            }

            $sessionId = $request->header('X-Session-ID');
            $reorderResult = $this->orderService->reorder($id, $user->id, $sessionId);

            $cartDetails = $this->cartService->getCartDetails($reorderResult['cart']);

            return response()->json([
                'success' => true,
                'message' => __('order.items_added_to_cart'),
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
                'message' => __('order.order_not_found_short'),
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('order.failed_reorder'),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get predefined cancellation reasons.
     * GET /api/v1/orders/cancellation-reasons
     */
    public function cancellationReasons(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->cancellationService->getCancellationReasons(),
        ]);
    }

    /**
     * Customer-initiated partial item cancellation/refund.
     * POST /api/v1/orders/{id}/partial-cancel
     */
    public function partialItemCancel(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => __('order.auth_required'),
                ], 401);
            }

            $validator = Validator::make($request->all(), [
                'item_ids' => 'required|array|min:1',
                'item_ids.*' => 'integer|exists:order_items,id',
                'reason' => 'required|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => __('order.validation_failed'),
                    'errors' => $validator->errors(),
                ], 422);
            }

            $result = $this->cancellationService->customerPartialItemCancel(
                $id,
                $user->id,
                $request->input('item_ids'),
                $request->input('reason')
            );

            return response()->json($result, 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => __('order.order_not_found'),
            ], 404);
        } catch (\Exception $e) {
            $statusCode = str_contains($e->getMessage(), 'Please wait') ? 429 : 400;
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $statusCode);
        }
    }

    /**
     * Get invoice data as JSON (for in-app receipt view).
     * GET /api/v1/orders/{id}/invoice
     */
    public function invoice(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => __('order.auth_required'),
                ], 401);
            }

            $order = Order::where('id', $id)
                ->where('user_id', $user->id)
                ->firstOrFail();

            $data = $this->invoiceService->buildInvoiceData($order);

            return response()->json([
                'success' => true,
                'data'    => $data,
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => __('order.order_not_found_short'),
            ], 404);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('[INVOICE] Error', [
                'order_id' => $id,
                'error'    => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => __('order.failed_generate_invoice_data'),
            ], 500);
        }
    }

    /**
     * Download invoice as PDF.
     * GET /api/v1/orders/{id}/invoice/download
     */
    public function invoiceDownload(Request $request, int $id)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => __('order.auth_required'),
                ], 401);
            }

            $order = Order::where('id', $id)
                ->where('user_id', $user->id)
                ->firstOrFail();

            // Try PDF generation first
            $pdfBytes = $this->invoiceService->generatePdf($order);

            if ($pdfBytes) {
                $filename = 'Invoice-' . $order->getOrCreateInvoiceNumber() . '.pdf';

                return response($pdfBytes, 200, [
                    'Content-Type'        => 'application/pdf',
                    'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                    'Content-Length'      => strlen($pdfBytes),
                ]);
            }

            // Fallback: return HTML for download
            $html = $this->invoiceService->renderHtml($order);
            $filename = 'Invoice-' . $order->getOrCreateInvoiceNumber() . '.html';

            return response($html, 200, [
                'Content-Type'        => 'text/html; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => __('order.order_not_found_short'),
            ], 404);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('[INVOICE-DOWNLOAD] Error', [
                'order_id' => $id,
                'error'    => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => __('order.failed_generate_invoice'),
            ], 500);
        }
    }

    /**
     * Email invoice PDF to the authenticated customer.
     * POST /api/v1/orders/{id}/invoice/email
     */
    public function emailInvoice(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => __('order.auth_required'),
                ], 401);
            }

            if (!$user->email) {
                return response()->json([
                    'success' => false,
                    'message' => __('order.no_email_on_account'),
                ], 422);
            }

            $order = Order::where('id', $id)
                ->where('user_id', $user->id)
                ->firstOrFail();

            // Generate PDF
            $pdfBytes = $this->invoiceService->generatePdf($order);

            if (!$pdfBytes) {
                return response()->json([
                    'success' => false,
                    'message' => __('order.unable_generate_invoice_pdf'),
                ], 500);
            }

            $filename = 'Invoice-' . $order->getOrCreateInvoiceNumber() . '.pdf';
            $invoiceData = $this->invoiceService->buildInvoiceData($order);

            Mail::to($user->email)->send(new InvoiceMail(
                $order->order_number,
                $user->name ?? 'Customer',
                $invoiceData['total'],
                $pdfBytes,
                $filename
            ));

            return response()->json([
                'success' => true,
                'message' => __('order.invoice_sent_to', ['email' => $user->email]),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => __('order.order_not_found_short'),
            ], 404);
        } catch (\Exception $e) {
            Log::error('[INVOICE-EMAIL] Error', [
                'order_id' => $id,
                'error'    => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => __('order.failed_send_invoice'),
            ], 500);
        }
    }
}
