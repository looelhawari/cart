<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\RatingLog;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    /**
     * Get all reviews with filtering and analytics
     */
    public function index(Request $request)
    {
        $query = Review::with(['user:id,first_name,last_name,email', 'order:id,order_number', 'product:barcode,name_en,name_ar']);

        // Filter by rating type
        if ($request->filled('rating_type')) {
            $query->where('rating_type', $request->rating_type);
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by rating value
        if ($request->filled('rating')) {
            $query->where('rating', $request->rating);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Filter by order
        if ($request->filled('order_id')) {
            $query->where('order_id', $request->order_id);
        }

        // Filter by customer
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by product
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        // Search in comments
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('comment', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $reviews = $query->paginate($request->get('per_page', 20));

        return response()->json($reviews);
    }

    /**
     * Get rating analytics and statistics
     */
    public function analytics(Request $request)
    {
        $dateFrom = $request->get('date_from', now()->subDays(30)->toDateString());
        $dateTo = $request->get('date_to', now()->toDateString());

        // Overall statistics
        $overall = Review::selectRaw('
            COUNT(*) as total_reviews,
            AVG(rating) as average_rating,
            SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
            SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
            SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
            SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
            SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
        ')
            ->whereBetween('created_at', [$dateFrom, $dateTo . ' 23:59:59'])
            ->first();

        // By rating type
        $byType = Review::selectRaw('
            rating_type,
            COUNT(*) as count,
            AVG(rating) as average_rating
        ')
            ->whereBetween('created_at', [$dateFrom, $dateTo . ' 23:59:59'])
            ->groupBy('rating_type')
            ->get()
            ->keyBy('rating_type');

        // Ratings per day trend
        $trend = Review::selectRaw('
            DATE(created_at) as date,
            COUNT(*) as count,
            AVG(rating) as average_rating
        ')
            ->whereBetween('created_at', [$dateFrom, $dateTo . ' 23:59:59'])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Ratings by status
        $byStatus = Review::selectRaw('status, COUNT(*) as count')
            ->whereBetween('created_at', [$dateFrom, $dateTo . ' 23:59:59'])
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        // Top rated products
        $topProducts = Review::selectRaw('
            product_id,
            COUNT(*) as review_count,
            AVG(rating) as average_rating
        ')
            ->where('rating_type', 'product')
            ->whereBetween('created_at', [$dateFrom, $dateTo . ' 23:59:59'])
            ->groupBy('product_id')
            ->orderByDesc('average_rating')
            ->limit(10)
            ->with('product:barcode,name_en,name_ar')
            ->get();

        // Recent reviews requiring attention (pending approval)
        $pendingCount = Review::where('status', 'pending')->count();

        // Orders with ratings
        $ordersWithRatings = Order::whereHas('reviews')
            ->whereBetween('created_at', [$dateFrom, $dateTo . ' 23:59:59'])
            ->count();

        $totalOrders = Order::where('status', 'delivered')
            ->whereBetween('created_at', [$dateFrom, $dateTo . ' 23:59:59'])
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'overview' => [
                    'total_reviews' => (int) $overall->total_reviews,
                    'average_rating' => round($overall->average_rating ?? 0, 2),
                    'pending_reviews' => $pendingCount,
                    'rating_distribution' => [
                        5 => (int) $overall->five_star,
                        4 => (int) $overall->four_star,
                        3 => (int) $overall->three_star,
                        2 => (int) $overall->two_star,
                        1 => (int) $overall->one_star,
                    ],
                ],
                'by_type' => [
                    'product' => [
                        'count' => (int) ($byType['product']->count ?? 0),
                        'average' => round($byType['product']->average_rating ?? 0, 2),
                    ],
                    'order' => [
                        'count' => (int) ($byType['order']->count ?? 0),
                        'average' => round($byType['order']->average_rating ?? 0, 2),
                    ],
                    'store' => [
                        'count' => (int) ($byType['store']->count ?? 0),
                        'average' => round($byType['store']->average_rating ?? 0, 2),
                    ],
                ],
                'by_status' => $byStatus,
                'trend' => $trend,
                'top_products' => $topProducts,
                'order_rating_rate' => $totalOrders > 0 
                    ? round(($ordersWithRatings / $totalOrders) * 100, 1) 
                    : 0,
                'date_range' => [
                    'from' => $dateFrom,
                    'to' => $dateTo,
                ],
            ],
        ]);
    }

    /**
     * Get a single review with full details and history
     */
    public function show($id)
    {
        $review = Review::with([
            'user:id,first_name,last_name,email,phone',
            'order:id,order_number,total,status,created_at',
            'product:barcode,name_en,name_ar,image',
            'logs.admin:id,first_name,last_name',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $review,
        ]);
    }

    /**
     * Update review status (approve/reject)
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,approved,rejected',
        ]);

        $review = Review::findOrFail($id);
        $oldStatus = $review->status;

        $review->update([
            'status' => $request->status,
            'is_approved' => $request->status === 'approved',
        ]);

        // Log the action
        RatingLog::logAction(
            $review->id,
            $request->status === 'approved' ? 'approved' : ($request->status === 'rejected' ? 'rejected' : 'updated'),
            Auth::id(),
            ['status' => $oldStatus],
            ['status' => $request->status]
        );

        // Update product rating if product review
        if ($review->product_id) {
            $this->updateProductRating($review->product_id);
        }

        return response()->json([
            'success' => true,
            'message' => 'Review status updated successfully',
            'data' => $review->fresh(),
        ]);
    }

    /**
     * Add admin response to review
     */
    public function respond(Request $request, $id)
    {
        $request->validate([
            'response' => 'required|string|max:1000',
        ]);

        $review = Review::findOrFail($id);

        $review->update([
            'response' => $request->response,
            'responded_at' => now(),
            'responded_by' => Auth::id(),
        ]);

        // Log the action
        RatingLog::logAction(
            $review->id,
            'responded',
            Auth::id(),
            null,
            ['response' => $request->response]
        );

        return response()->json([
            'success' => true,
            'message' => 'Response added successfully',
            'data' => $review->fresh()->load('respondedBy:id,first_name,last_name'),
        ]);
    }

    /**
     * Get reviews for a specific order
     */
    public function orderReviews($orderId)
    {
        $reviews = Review::where('order_id', $orderId)
            ->with(['user:id,first_name,last_name', 'product:barcode,name_en,name_ar'])
            ->get();

        $orderRating = $reviews->where('rating_type', 'order')->first();

        return response()->json([
            'success' => true,
            'data' => [
                'order_rating' => $orderRating,
                'product_reviews' => $reviews->where('rating_type', 'product')->values(),
                'has_order_rating' => $orderRating !== null,
                'average_product_rating' => $reviews->where('rating_type', 'product')->avg('rating'),
            ],
        ]);
    }

    /**
     * Get review history log for a review
     */
    public function history($id)
    {
        $logs = RatingLog::where('review_id', $id)
            ->with('admin:id,first_name,last_name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * Bulk approve/reject reviews
     */
    public function bulkUpdateStatus(Request $request)
    {
        $request->validate([
            'review_ids' => 'required|array|min:1',
            'review_ids.*' => 'exists:reviews,id',
            'status' => 'required|in:approved,rejected',
        ]);

        $affectedProducts = [];

        DB::transaction(function () use ($request, &$affectedProducts) {
            $reviews = Review::whereIn('id', $request->review_ids)->get();

            foreach ($reviews as $review) {
                $oldStatus = $review->status;

                $review->update([
                    'status' => $request->status,
                    'is_approved' => $request->status === 'approved',
                ]);

                RatingLog::logAction(
                    $review->id,
                    'bulk_' . $request->status,
                    Auth::id(),
                    ['status' => $oldStatus],
                    ['status' => $request->status]
                );

                if ($review->product_id) {
                    $affectedProducts[] = $review->product_id;
                }
            }
        });

        // Update product ratings
        foreach (array_unique($affectedProducts) as $productId) {
            $this->updateProductRating($productId);
        }

        return response()->json([
            'success' => true,
            'message' => count($request->review_ids) . ' reviews updated successfully',
        ]);
    }

    /**
     * Delete a review
     */
    public function destroy($id)
    {
        $review = Review::findOrFail($id);
        $productId = $review->product_id;

        // Log deletion
        RatingLog::logAction(
            $review->id,
            'deleted',
            Auth::id(),
            $review->toArray(),
            null
        );

        $review->delete();

        // Update product rating
        if ($productId) {
            $this->updateProductRating($productId);
        }

        return response()->json([
            'success' => true,
            'message' => 'Review deleted successfully',
        ]);
    }

    /**
     * Update product average rating
     */
    private function updateProductRating($productId)
    {
        $stats = Review::where('product_id', $productId)
            ->where('rating_type', 'product')
            ->where('status', 'approved')
            ->selectRaw('AVG(rating) as average, COUNT(*) as count')
            ->first();

        DB::table('products')
            ->where('barcode', $productId)
            ->update([
                'rating' => round($stats->average ?? 0, 2),
                'review_count' => $stats->count ?? 0,
            ]);
    }
}
