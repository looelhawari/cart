<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminReviewController extends Controller
{
    /**
     * Get all reviews with pagination and filters
     */
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 20);
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $status = $request->input('status');
        $rating = $request->input('rating');

        $query = Review::with(['user:id,name,email', 'product:id,name'])
            ->select('reviews.*');

        if ($status) {
            if ($status === 'approved') {
                $query->where('is_approved', true);
            } elseif ($status === 'pending') {
                $query->where('is_approved', false);
            }
        }

        if ($rating) {
            $query->where('rating', $rating);
        }

        $reviews = $query->orderBy($sortBy, $sortOrder)
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $reviews
        ]);
    }

    /**
     * Get reviews analytics
     */
    public function analytics()
    {
        $stats = [
            'total_reviews' => Review::count(),
            'pending_reviews' => Review::where('is_approved', false)->count(),
            'approved_reviews' => Review::where('is_approved', true)->count(),
            'rejected_reviews' => 0,
            'average_rating' => round(Review::where('is_approved', true)->avg('rating'), 2),
            'rating_distribution' => [
                '5' => Review::where('rating', 5)->where('is_approved', true)->count(),
                '4' => Review::where('rating', 4)->where('is_approved', true)->count(),
                '3' => Review::where('rating', 3)->where('is_approved', true)->count(),
                '2' => Review::where('rating', 2)->where('is_approved', true)->count(),
                '1' => Review::where('rating', 1)->where('is_approved', true)->count(),
            ],
            'recent_reviews' => Review::with(['user:id,name', 'product:id,name'])
                ->latest()
                ->take(5)
                ->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Get reviews for specific order
     */
    public function orderReviews($orderId)
    {
        $reviews = Review::with(['user:id,name,email', 'product:id,name'])
            ->where('order_id', $orderId)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $reviews
        ]);
    }

    /**
     * Get single review details
     */
    public function show($id)
    {
        $review = Review::with(['user', 'product', 'order'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $review
        ]);
    }

    /**
     * Get review history (status changes)
     */
    public function history($id)
    {
        $review = Review::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'review_id' => $review->id,
                'current_status' => $review->is_approved ? 'approved' : 'pending',
                'created_at' => $review->created_at,
                'updated_at' => $review->updated_at,
                // Add audit log if you have one
                'history' => []
            ]
        ]);
    }

    /**
     * Update review status
     */
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected',
            'reason' => 'nullable|string',
        ]);

        $review = Review::findOrFail($id);
        
        $isApproved = $validated['status'] === 'approved';
        $review->update([
            'is_approved' => $isApproved,
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Review status updated successfully',
            'data' => $review
        ]);
    }

    /**
     * Respond to a review
     */
    public function respond(Request $request, $id)
    {
        $validated = $request->validate([
            'response' => 'required|string',
        ]);

        $review = Review::findOrFail($id);
        $review->update([
            'response' => $validated['response'],
            'responded_at' => now(),
            'responded_by' => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Response added successfully',
            'data' => $review
        ]);
    }

    /**
     * Bulk update review status
     */
    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'review_ids' => 'required|array',
            'review_ids.*' => 'exists:reviews,id',
            'status' => 'required|in:pending,approved,rejected',
        ]);

        Review::whereIn('id', $validated['review_ids'])
            ->update([
                'is_approved' => $validated['status'] === 'approved',
                'status' => $validated['status'],
            ]);

        return response()->json([
            'success' => true,
            'message' => count($validated['review_ids']) . ' reviews updated successfully'
        ]);
    }

    /**
     * Delete a review
     */
    public function destroy($id)
    {
        $review = Review::findOrFail($id);
        $review->delete();

        return response()->json([
            'success' => true,
            'message' => 'Review deleted successfully'
        ]);
    }
}
