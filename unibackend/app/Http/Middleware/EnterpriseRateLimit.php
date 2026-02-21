<?php

namespace App\Http\Middleware;

use App\Services\RateLimiterService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enterprise Rate Limit Middleware
 * 
 * Multi-layered enforcement:
 * 1. IP blacklist check
 * 2. IP whitelist bypass
 * 3. Global circuit breaker (system-wide protection)
 * 4. Abuse detection with progressive penalties
 * 5. Token bucket / sliding window per-endpoint limits
 * 
 * Attaches standard X-RateLimit-* headers to ALL responses (allowed or blocked).
 * Returns HTTP 429 with structured JSON + Retry-After on block.
 */
class EnterpriseRateLimit
{
    public function __construct(
        protected RateLimiterService $rateLimiter,
    ) {}

    /**
     * Handle an incoming request.
     * 
     * @param  Request  $request
     * @param  Closure  $next
     * @param  string|null  $endpointOverride  Optional: force a specific endpoint pattern
     * @return Response
     */
    public function handle(Request $request, Closure $next, ?string $endpointOverride = null): Response
    {
        // Skip rate limiting for preflight CORS requests
        if ($request->isMethod('OPTIONS')) {
            return $next($request);
        }

        $result = $this->rateLimiter->check($request, $endpointOverride);

        if (!$result->allowed) {
            // Log blocked request to dedicated rate-limiting channel
            if (config('rate-limiting.logging.enabled', true)) {
                Log::channel('rate-limiting')->warning('Rate limit blocked', [
                    'ip' => $request->ip(),
                    'user_id' => $request->user()?->id,
                    'method' => $request->method(),
                    'path' => $request->path(),
                    'reason' => $result->reason ?? 'rate_limited',
                    'retry_after' => $result->retryAfter,
                ]);
            }

            return response()->json($result->responseBody(), 429, $result->headers());
        }

        // Request allowed — proceed and attach rate limit headers to response
        $response = $next($request);

        foreach ($result->headers() as $header => $value) {
            $response->headers->set($header, (string) $value);
        }

        return $response;
    }
}
