<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ContentVersionService;
use Illuminate\Http\JsonResponse;

class AppContentController extends Controller
{
    public function __construct(private ContentVersionService $versions) {}

    /**
     * GET /api/v1/app/content-version
     *
     * The mobile app calls this on startup / resume / reconnect, compares the
     * returned version with its locally stored version, and if different
     * clears caches + refetches before showing (possibly stale) content.
     */
    public function version(): JsonResponse
    {
        $snapshot = $this->versions->snapshot();

        return response()->json([
            'success'         => true,
            'version'         => $snapshot['version'],
            'types'           => $snapshot['types'],
            'last_updated_at' => $snapshot['last_updated_at'],
        ]);
    }
}
