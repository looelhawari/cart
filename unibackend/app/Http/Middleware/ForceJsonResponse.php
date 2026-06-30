<?php

namespace App\Http\Middleware;

use App\Support\SafeApiExceptionResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceJsonResponse
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $request->headers->set('Accept', 'application/json');

        $response = $next($request);

        // Ensure response is JSON
        if (!$response->headers->has('Content-Type')) {
            $response->headers->set('Content-Type', 'application/json');
        }

        if ($response->getStatusCode() >= 400
            && str_contains(strtolower((string) $response->headers->get('Content-Type')), 'json')) {
            $payload = json_decode((string) $response->getContent(), true);

            if (is_array($payload) && json_last_error() === JSON_ERROR_NONE) {
                $sanitized = SafeApiExceptionResponse::sanitizePayload($payload, $response->getStatusCode());

                if ($sanitized !== $payload) {
                    $response->setContent(json_encode($sanitized, JSON_UNESCAPED_UNICODE));
                }
            }
        }

        return $response;
    }
}
