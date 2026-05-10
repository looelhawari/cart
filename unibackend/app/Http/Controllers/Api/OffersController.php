<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OfferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class OffersController extends Controller
{
    public function index(Request $request, OfferService $offerService): JsonResponse
    {
        $filters = [
            'status' => $request->query('status', 'all'),
            'type' => $request->query('type'),
            'applies_to' => $request->query('applies_to'),
            'ending_soon' => $request->boolean('ending_soon'),
            'for_you' => $request->boolean('for_you'),
            'search' => $request->query('search'),
            'sort' => $request->query('sort', 'recommended'),
        ];

        $user = Auth::guard('sanctum')->user();
        $sessionId = $request->header('X-Session-ID') ?? $request->cookie('session_id');

        // Personalized offers (for_you) bypass cache; generic lists cached for 5 min
        $isPersonalized = $filters['for_you'] || $user;

        if ($isPersonalized) {
            $data = $offerService->listOffers($filters, $user?->id, $sessionId);
        } else {
            // SECURITY HARDENED (audit C3): cache key uses ONLY the controlled
            // filter set above, with `search` normalised + length-capped so
            // an attacker can't fill Redis by spamming arbitrary search
            // strings.
            $cacheFilters = $filters;
            if (is_string($cacheFilters['search'])) {
                $cacheFilters['search'] = mb_substr(mb_strtolower($cacheFilters['search']), 0, 50);
            } else {
                $cacheFilters['search'] = null;
            }
            $cacheKey = 'offers:list:' . md5(json_encode($cacheFilters));
            $data = Cache::remember($cacheKey, 300, function () use ($offerService, $filters, $sessionId) {
                return $offerService->listOffers($filters, null, $sessionId);
            });
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ], 200, ['Content-Type' => 'application/json; charset=utf-8'], JSON_UNESCAPED_UNICODE);
    }

    public function summary(Request $request, OfferService $offerService): JsonResponse
    {
        $user = Auth::guard('sanctum')->user();
        $sessionId = $request->header('X-Session-ID') ?? $request->cookie('session_id');

        // Summary is generic (counts/highlights) — cache for 5 minutes
        $summary = Cache::remember('offers:summary', 300, function () use ($offerService, $user, $sessionId) {
            return $offerService->getSummary($user?->id, $sessionId);
        });

        return response()->json([
            'success' => true,
            'data' => $summary,
        ], 200, ['Content-Type' => 'application/json; charset=utf-8'], JSON_UNESCAPED_UNICODE);
    }
}
