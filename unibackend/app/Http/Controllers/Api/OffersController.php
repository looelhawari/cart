<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OfferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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

        $data = $offerService->listOffers($filters, $user?->id, $sessionId);

        return response()->json([
            'success' => true,
            'data' => $data,
        ], 200, ['Content-Type' => 'application/json; charset=utf-8'], JSON_UNESCAPED_UNICODE);
    }

    public function summary(Request $request, OfferService $offerService): JsonResponse
    {
        $user = Auth::guard('sanctum')->user();
        $sessionId = $request->header('X-Session-ID') ?? $request->cookie('session_id');

        $summary = $offerService->getSummary($user?->id, $sessionId);

        return response()->json([
            'success' => true,
            'data' => $summary,
        ], 200, ['Content-Type' => 'application/json; charset=utf-8'], JSON_UNESCAPED_UNICODE);
    }
}
