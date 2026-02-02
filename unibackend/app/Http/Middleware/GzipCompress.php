<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gzip Compression Middleware
 * 
 * Compresses JSON responses to reduce bandwidth by 60-80%.
 * Critical for handling 25k+ concurrent users.
 */
class GzipCompress
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only compress if client accepts gzip
        if (!$this->shouldCompress($request, $response)) {
            return $response;
        }

        // Get content
        $content = $response->getContent();
        
        // Skip if content is too small (compression overhead not worth it)
        if (strlen($content) < 1024) {
            return $response;
        }

        // Compress content
        $compressed = gzencode($content, 6); // Level 6 is good balance of speed/ratio

        if ($compressed === false) {
            return $response;
        }

        // Update response
        $response->setContent($compressed);
        $response->headers->set('Content-Encoding', 'gzip');
        $response->headers->set('Content-Length', strlen($compressed));
        $response->headers->set('Vary', 'Accept-Encoding');

        return $response;
    }

    /**
     * Check if response should be compressed.
     */
    protected function shouldCompress(Request $request, Response $response): bool
    {
        // Check if client accepts gzip
        if (!str_contains($request->header('Accept-Encoding', ''), 'gzip')) {
            return false;
        }

        // Only compress successful responses
        if ($response->getStatusCode() >= 400) {
            return false;
        }

        // Only compress JSON responses
        $contentType = $response->headers->get('Content-Type', '');
        if (!str_contains($contentType, 'application/json')) {
            return false;
        }

        // Don't double-compress
        if ($response->headers->has('Content-Encoding')) {
            return false;
        }

        return true;
    }
}
