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

        $query = Review::with(['user:id,first_name,last_name,email', 'product:barcode,name_en,name_ar'])
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
    public function analytics(Request $request)
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = Review::query();
        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Overview stats
        $totalReviews = (clone $query)->count();
        $pendingReviews = (clone $query)->where('is_approved', false)->count();
        $approvedReviews = (clone $query)->where('is_approved', true)->count();
        $averageRating = round((clone $query)->where('is_approved', true)->avg('rating') ?? 0, 2);

        // Rating distribution
        $ratingDistribution = [
            '1' => (clone $query)->where('rating', 1)->count(),
            '2' => (clone $query)->where('rating', 2)->count(),
            '3' => (clone $query)->where('rating', 3)->count(),
            '4' => (clone $query)->where('rating', 4)->count(),
            '5' => (clone $query)->where('rating', 5)->count(),
        ];

        // By type (product, order, store)
        $byType = [
            'product' => [
                'count' => (clone $query)->where('rating_type', 'product')->count(),
                'average' => round((clone $query)->where('rating_type', 'product')->avg('rating') ?? 0, 2),
            ],
            'order' => [
                'count' => (clone $query)->where('rating_type', 'order')->count(),
                'average' => round((clone $query)->where('rating_type', 'order')->avg('rating') ?? 0, 2),
            ],
            'store' => [
                'count' => (clone $query)->where('rating_type', 'store')->count(),
                'average' => round((clone $query)->where('rating_type', 'store')->avg('rating') ?? 0, 2),
            ],
        ];

        // By status
        $byStatus = [
            'pending' => $pendingReviews,
            'approved' => $approvedReviews,
            'rejected' => 0, // No rejected status in current schema
        ];

        // Trend data (last 30 days)
        $trend = Review::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as count'),
                DB::raw('ROUND(AVG(rating), 2) as average_rating')
            )
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date', 'asc')
            ->get();

        // Top products by review count
        $topProducts = Review::select(
                'product_id',
                DB::raw('COUNT(*) as review_count'),
                DB::raw('ROUND(AVG(rating), 2) as average_rating')
            )
            ->whereNotNull('product_id')
            ->groupBy('product_id')
            ->orderByDesc('review_count')
            ->limit(5)
            ->with('product:barcode,name_en,name_ar')
            ->get();

        $stats = [
            'overview' => [
                'total_reviews' => $totalReviews,
                'average_rating' => $averageRating,
                'pending_reviews' => $pendingReviews,
                'rating_distribution' => $ratingDistribution,
            ],
            'by_type' => $byType,
            'by_status' => $byStatus,
            'trend' => $trend,
            'top_products' => $topProducts,
            'order_rating_rate' => $totalReviews > 0 ? round(($byType['order']['count'] / $totalReviews) * 100, 2) : 0,
            'date_range' => [
                'from' => $dateFrom ?? now()->subDays(30)->toDateString(),
                'to' => $dateTo ?? now()->toDateString(),
            ],
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
        $reviews = Review::with(['user:id,first_name,last_name,email', 'product:barcode,name_en,name_ar'])
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
