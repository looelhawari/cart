<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class RatingController extends Controller
{
    /**
     * Customer rates driver after delivery
     * POST /api/v1/orders/{id}/rate-driver
     */
    public function rateDriver(Request $request, int $orderId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();

        // Find the order belonging to this customer
        $order = Order::where('id', $orderId)
            ->where('user_id', $user->id)
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found.',
            ], 404);
        }

        // Order must be delivered
        if ($order->status !== 'delivered') {
            return response()->json([
                'success' => false,
                'message' => 'You can only rate the driver after delivery.',
            ], 403);
        }

        // Order must have a driver
        if (!$order->driver_id) {
            return response()->json([
                'success' => false,
                'message' => 'This order has no assigned driver.',
            ], 422);
        }

        // Check if already rated
        $existing = Review::where('order_id', $orderId)
            ->where('user_id', $user->id)
            ->where('rating_type', 'driver')
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'You have already rated the driver for this order.',
            ], 409);
        }

        DB::beginTransaction();
        try {
            $review = Review::create([
                'rating_type' => 'driver',
                'order_id' => $orderId,
                'user_id' => $user->id,
                'rated_user_id' => $order->driver_id,
                'product_id' => null,
                'rating' => $request->rating,
                'comment' => $request->comment,
                'status' => 'approved', // Auto-approve driver/customer ratings
                'is_approved' => true,
            ]);

            // Update driver's average_rating
            $this->updateUserAverageRating($order->driver_id, 'driver');

            DB::commit();

            // Invalidate related caches
            Cache::forget("rating:driver:{$orderId}");
            Cache::forget("rating:can-rate-driver:{$user->id}:{$orderId}");

            return response()->json([
                'success' => true,
                'message' => 'Thank you for rating the driver!',
                'data' => [
                    'review_id' => $review->id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit rating.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Driver rates customer after delivery
     * POST /api/v1/driver/orders/{id}/rate-customer
     */
    public function rateCustomer(Request $request, int $orderId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $driver = Auth::user();

        // Find the order assigned to this driver
        $order = Order::where('id', $orderId)
            ->where('driver_id', $driver->id)
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found or not assigned to you.',
            ], 404);
        }

        // Order must be delivered
        if ($order->status !== 'delivered') {
            return response()->json([
                'success' => false,
                'message' => 'You can only rate the customer after delivery.',
            ], 403);
        }

        // Check if already rated
        $existing = Review::where('order_id', $orderId)
            ->where('user_id', $driver->id)
            ->where('rating_type', 'customer')
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'You have already rated the customer for this order.',
            ], 409);
        }

        DB::beginTransaction();
        try {
            $review = Review::create([
                'rating_type' => 'customer',
                'order_id' => $orderId,
                'user_id' => $driver->id,
                'rated_user_id' => $order->user_id,
                'product_id' => null,
                'rating' => $request->rating,
                'comment' => $request->comment,
                'status' => 'approved',
                'is_approved' => true,
            ]);

            // Update customer's average_rating
            $this->updateUserAverageRating($order->user_id, 'customer');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Thank you for rating the customer!',
                'data' => [
                    'review_id' => $review->id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit rating.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check if customer can rate the driver for an order
     * GET /api/v1/orders/{id}/can-rate-driver
     */
    public function canRateDriver(Request $request, int $orderId): JsonResponse
    {
        $user = Auth::user();
        $cacheKey = "rating:can-rate-driver:{$user->id}:{$orderId}";

        $data = Cache::remember($cacheKey, 600, function () use ($user, $orderId) {
            $order = Order::where('id', $orderId)
                ->where('user_id', $user->id)
                ->first();

            if (!$order || $order->status !== 'delivered' || !$order->driver_id) {
                return ['can_rate' => false];
            }

            $alreadyRated = Review::where('order_id', $orderId)
                ->where('user_id', $user->id)
                ->where('rating_type', 'driver')
                ->exists();

            return [
                'can_rate' => !$alreadyRated,
                'already_rated' => $alreadyRated,
                'driver' => [
                    'id' => $order->driver_id,
                    'name' => $order->driver ? $order->driver->first_name . ' ' . $order->driver->last_name : null,
                ],
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Check if driver can rate the customer for an order
     * GET /api/v1/driver/orders/{id}/can-rate-customer
     */
    public function canRateCustomer(Request $request, int $orderId): JsonResponse
    {
        $driver = Auth::user();

        $order = Order::where('id', $orderId)
            ->where('driver_id', $driver->id)
            ->first();

        if (!$order || $order->status !== 'delivered') {
            return response()->json([
                'success' => true,
                'data' => ['can_rate' => false],
            ]);
        }

        $alreadyRated = Review::where('order_id', $orderId)
            ->where('user_id', $driver->id)
            ->where('rating_type', 'customer')
            ->exists();

        return response()->json([
            'success' => true,
            'data' => [
                'can_rate' => !$alreadyRated,
                'already_rated' => $alreadyRated,
                'customer' => [
                    'id' => $order->user_id,
                    'name' => $order->user ? $order->user->first_name . ' ' . $order->user->last_name : null,
                ],
            ],
        ]);
    }

    /**
     * Get driver's rating for an order (visible to customer)
     * GET /api/v1/orders/{id}/driver-rating
     */
    public function getDriverRating(Request $request, int $orderId): JsonResponse
    {
        $user = Auth::user();

        $order = Order::where('id', $orderId)
            ->where('user_id', $user->id)
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found.',
            ], 404);
        }

        // Once a rating exists, it never changes — cache indefinitely (24h)
        $ratingData = Cache::remember("rating:driver:{$orderId}", 86400, function () use ($orderId) {
            $rating = Review::where('order_id', $orderId)
                ->where('rating_type', 'driver')
                ->first();

            return $rating ? [
                'rating' => $rating->rating,
                'comment' => $rating->comment,
                'created_at' => $rating->created_at,
            ] : null;
        });

        return response()->json([
            'success' => true,
            'data' => $ratingData,
        ]);
    }

    /**
     * Recalculate and update a user's average rating
     */
    private function updateUserAverageRating(int $userId, string $ratingType): void
    {
        $avg = Review::where('rated_user_id', $userId)
            ->where('rating_type', $ratingType)
            ->where('is_approved', true)
            ->avg('rating');

        User::where('id', $userId)->update([
            'average_rating' => round($avg ?? 0, 2),
        ]);
    }
}
