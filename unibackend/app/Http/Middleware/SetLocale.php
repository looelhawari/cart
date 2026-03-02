<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * SetLocale — Read Accept-Language header and set app locale.
 * Supports 'en' and 'ar'. Defaults to 'en'.
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->header('Accept-Language', 'en');

        // Normalize: take first part (e.g., "ar-EG" → "ar")
        $locale = strtolower(substr($locale, 0, 2));

        if (!in_array($locale, ['en', 'ar'])) {
            $locale = 'en';
        }

        app()->setLocale($locale);

        return $next($request);
    }
}
