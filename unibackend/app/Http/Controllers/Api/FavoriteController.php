<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Favorite\StoreFavoriteRequest;
use App\Http\Resources\FavoriteResource;
use App\Models\Favorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    /**
     * List user's favorites
     * GET /api/v1/favorites
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $perPage = (int) $request->get('per_page', 20);

        $favorites = Favorite::with('product')
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'favorites' => FavoriteResource::collection($favorites->items()),
                'pagination' => [
                    'current_page' => $favorites->currentPage(),
                    'per_page' => $favorites->perPage(),
                    'total' => $favorites->total(),
                    'last_page' => $favorites->lastPage(),
                ],
            ],
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Add product to favorites
     * POST /api/v1/favorites
     */
    public function store(StoreFavoriteRequest $request): JsonResponse
    {
        $userId = $request->user()->id;

        $favorite = Favorite::firstOrCreate([
            'user_id' => $userId,
            'product_id' => (int) $request->product_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => $favorite->wasRecentlyCreated
                ? __('favorite.added')
                : __('favorite.already_added'),
            'data' => [
                'favorite' => new FavoriteResource($favorite->load('product')),
            ],
        ], 201, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Remove product from favorites
     * DELETE /api/v1/favorites/{productId}
     */
    public function destroy(Request $request, int $productId): JsonResponse
    {
        $userId = $request->user()->id;

        $favorite = Favorite::where('user_id', $userId)
            ->where('product_id', $productId)
            ->first();

        if (!$favorite) {
            return response()->json([
                'success' => false,
                'message' => __('favorite.not_found'),
            ], 404, [], JSON_UNESCAPED_UNICODE);
        }

        $favorite->delete();

        return response()->json([
            'success' => true,
            'message' => __('favorite.removed'),
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
}
