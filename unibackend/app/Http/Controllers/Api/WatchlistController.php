<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductWatchlist;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WatchlistController extends Controller
{
    /**
     * Get user's watchlist.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $watchlist = ProductWatchlist::with(['product' => function ($query) {
            $query->select('id', 'name', 'name_ar', 'price', 'sale_price', 'image_url', 'stock', 'is_active');
        }])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product' => $item->product,
                    'notify_back_in_stock' => $item->notify_back_in_stock,
                    'notify_price_drop' => $item->notify_price_drop,
                    'price_threshold' => $item->price_threshold,
                    'is_out_of_stock' => $item->product && $item->product->stock <= 0,
                    'created_at' => $item->created_at->toIso8601String(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $watchlist,
            'count' => $watchlist->count(),
        ]);
    }

    /**
     * Add product to watchlist.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'notify_back_in_stock' => 'boolean',
            'notify_price_drop' => 'boolean',
            'price_threshold' => 'nullable|numeric|min:0',
        ]);

        $user = $request->user();
        $productId = $request->input('product_id');

        // Check if already in watchlist
        $existing = ProductWatchlist::where('user_id', $user->id)
            ->where('product_id', $productId)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => __('watchlist.already_in_watchlist'),
            ], 409);
        }

        $watchlistItem = ProductWatchlist::addToWatchlist(
            $user->id,
            $productId,
            $request->input('notify_back_in_stock', true),
            $request->input('notify_price_drop', false),
            $request->input('price_threshold')
        );

        return response()->json([
            'success' => true,
            'message' => __('watchlist.added'),
            'data' => $watchlistItem,
        ], 201);
    }

    /**
     * Update watchlist item settings.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'notify_back_in_stock' => 'boolean',
            'notify_price_drop' => 'boolean',
            'price_threshold' => 'nullable|numeric|min:0',
        ]);

        $user = $request->user();

        $watchlistItem = ProductWatchlist::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$watchlistItem) {
            return response()->json([
                'success' => false,
                'message' => __('watchlist.not_found'),
            ], 404);
        }

        $watchlistItem->update($request->only([
            'notify_back_in_stock',
            'notify_price_drop',
            'price_threshold',
        ]));

        // Reset notification flags if settings changed
        if ($request->has('notify_back_in_stock') && $request->input('notify_back_in_stock')) {
            $watchlistItem->resetBackInStockFlag();
        }
        if ($request->has('notify_price_drop') && $request->input('notify_price_drop')) {
            $watchlistItem->resetPriceDropFlag();
        }

        return response()->json([
            'success' => true,
            'message' => __('watchlist.updated'),
            'data' => $watchlistItem->fresh(),
        ]);
    }

    /**
     * Remove product from watchlist.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $watchlistItem = ProductWatchlist::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$watchlistItem) {
            return response()->json([
                'success' => false,
                'message' => __('watchlist.not_found'),
            ], 404);
        }

        $watchlistItem->delete();

        return response()->json([
            'success' => true,
            'message' => __('watchlist.removed'),
        ]);
    }

    /**
     * Check if product is in watchlist.
     */
    public function check(Request $request, int $productId): JsonResponse
    {
        $user = $request->user();

        $watchlistItem = ProductWatchlist::where('user_id', $user->id)
            ->where('product_id', $productId)
            ->first();

        return response()->json([
            'success' => true,
            'in_watchlist' => $watchlistItem !== null,
            'data' => $watchlistItem,
        ]);
    }
}
