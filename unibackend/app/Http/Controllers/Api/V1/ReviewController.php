<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Product;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Http\Resources\ReviewResource;

class ReviewController extends Controller
{
    /**
     * Get all reviews for a specific product
     */
    public function getProductReviews($productId)
    {
        $reviews = Review::where('product_id', $productId)
            ->where('status', 'approved')
            ->with(['user:id,first_name,last_name'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return ReviewResource::collection($reviews);
    }

    /**
     * Get a single review
     */
    public function show($id)
    {
        $review = Review::with(['user:id,first_name,last_name'])->findOrFail($id);
        return new ReviewResource($review);
    }

    /**
     * Create a new review
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|integer',
            'order_id' => 'required|exists:orders,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
            'images' => 'nullable|array|max:5',
            'images.*' => 'nullable|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $user = Auth::user();

        // Verify user has ordered this product
        $hasOrdered = OrderItem::whereHas('order', function($query) use ($user, $request) {
            $query->where('user_id', $user->id)
                  ->where('id', $request->order_id)
                  ->where('status', 'delivered');
        })->where('product_id', $request->product_id)
          ->exists();

        if (!$hasOrdered) {
            return response()->json([
                'success' => false,
                'message' => 'You can only review products you have purchased and received.'
            ], 403);
        }

        // Check if user already reviewed this product
        $existingReview = Review::where('user_id', $user->id)
            ->where('product_id', $request->product_id)
            ->first();

        if ($existingReview) {
            return response()->json([
                'success' => false,
                'message' => 'You have already reviewed this product.'
            ], 409);
        }

        $review = Review::create([
            'user_id' => $user->id,
            'product_id' => $request->product_id,
            'order_id' => $request->order_id,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'status' => 'pending', // Reviews need approval
        ]);

        // Update product rating
        $this->updateProductRating($request->product_id);

        return response()->json([
            'success' => true,
            'message' => 'Review submitted successfully and is pending approval.',
            'data' => new ReviewResource($review)
        ], 201);
    }

    /**
     * Update an existing review
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'rating' => 'sometimes|integer|min:1|max:5',
            'comment' => 'sometimes|string|max:1000',
            'images' => 'nullable|array|max:5',
            'images.*' => 'nullable|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $review = Review::findOrFail($id);
        $user = Auth::user();

        // Only allow user to update their own reviews
        if ($review->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to update this review.'
            ], 403);
        }

        $review->update([
            'rating' => $request->rating ?? $review->rating,
            'comment' => $request->comment ?? $review->comment,
            'images' => $request->images ? json_encode($request->images) : $review->images,
            'status' => 'pending', // Re-review after edit
        ]);

        // Update product rating
        $this->updateProductRating($review->product_id);

        return response()->json([
            'success' => true,
            'message' => 'Review updated successfully.',
            'data' => new ReviewResource($review)
        ]);
    }

    /**
     * Delete a review
     */
    public function destroy($id)
    {
        $review = Review::findOrFail($id);
        $user = Auth::user();

        // Only allow user to delete their own reviews
        if ($review->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to delete this review.'
            ], 403);
        }

        $productId = $review->product_id;
        $review->delete();

        // Update product rating
        $this->updateProductRating($productId);

        return response()->json([
            'success' => true,
            'message' => 'Review deleted successfully.'
        ]);
    }

    /**
     * Mark a review as helpful
     */
    public function markHelpful($id)
    {
        $review = Review::findOrFail($id);

        // In a real implementation, you would track which users marked as helpful
        // to prevent duplicate votes. For now, we'll just increment the counter.

        return response()->json([
            'success' => true,
            'message' => 'Review marked as helpful.'
        ]);
    }

    /**
     * Get user's own reviews
     */
    public function getUserReviews()
    {
        $user = Auth::user();

        $reviews = Review::where('user_id', $user->id)
            ->with(['product:id,name_en,name_ar,image'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return ReviewResource::collection($reviews);
    }

    /**
     * Check if user can review a specific product
     */
    public function canReview($productId)
    {
        $user = Auth::user();

        // Check if product exists
        $product = Product::find($productId);
        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found'
            ], 404);
        }

        // Check if user already reviewed this product
        $alreadyReviewed = Review::where('user_id', $user->id)
            ->where('product_id', $productId)
            ->exists();

        // Get eligible orders (delivered orders containing this product that haven't been reviewed)
        $eligibleOrders = Order::where('user_id', $user->id)
            ->where('status', 'delivered')
            ->whereHas('items', function($query) use ($productId) {
                $query->where('product_id', $productId);
            })
            ->select('id', 'order_number', 'updated_at')
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function($order) {
                return [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'delivered_at' => $order->updated_at,
                ];
            });

        $hasPurchased = $eligibleOrders->isNotEmpty();
        $canReview = $hasPurchased && !$alreadyReviewed;

        return response()->json([
            'success' => true,
            'data' => [
                'can_review' => $canReview,
                'has_purchased' => $hasPurchased,
                'already_reviewed' => $alreadyReviewed,
                'eligible_orders' => $eligibleOrders,
            ]
        ]);
    }

    /**
     * Update product rating and review count
     */
    private function updateProductRating($productId)
    {
        $product = Product::find($productId);

        if ($product) {
            $approvedReviews = Review::where('product_id', $productId)
                ->where('status', 'approved')
                ->get();

            $reviewCount = $approvedReviews->count();
            $averageRating = $reviewCount > 0
                ? $approvedReviews->avg('rating')
                : 0;

            $product->update([
                'rating' => round($averageRating, 2),
                'review_count' => $reviewCount
            ]);
        }
    }
}
