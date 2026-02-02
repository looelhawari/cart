<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register Redis Cart Service
        $this->app->singleton(\App\Services\RedisCartService::class, function ($app) {
            return new \App\Services\RedisCartService(
                $app->make(\App\Services\CartService::class)
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    /**
     * Configure API rate limiting.
     * 
     * CRITICAL for single-server protection:
     * - Prevents abuse
     * - Stops infinite loops from buggy clients
     * - Protects against DDoS
     */
    protected function configureRateLimiting(): void
    {
        // Default API rate limit: 120 requests per minute per user/IP (reasonable for mobile apps)
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by(
                $request->user()?->id ?: $request->ip()
            )->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many requests. Please slow down.',
                    'retry_after' => $headers['Retry-After'] ?? 60,
                ], 429, $headers);
            });
        });

        // Auth rate limit: 60 requests per minute (like big tech apps)
        // Users may retry login, have network issues, or use multiple forms
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(60)->by(
                $request->ip()  // Rate limit by IP only, not email (user might try different emails)
            )->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many authentication attempts. Please wait a moment.',
                    'retry_after' => $headers['Retry-After'] ?? 60,
                ], 429, $headers);
            });
        });

        // Login-specific: Track failed attempts separately (like Google/Facebook)
        // Allow 10 failed attempts per 15 minutes before temporary block
        RateLimiter::for('login', function (Request $request) {
            $key = 'login:' . ($request->input('email') ?: $request->ip());
            return Limit::perMinutes(15, 10)->by($key)->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many failed login attempts. Please try again in 15 minutes.',
                    'retry_after' => $headers['Retry-After'] ?? 900,
                ], 429, $headers);
            });
        });

        // Cart rate limit: High limit for cart operations (users add/remove items frequently)
        RateLimiter::for('cart', function (Request $request) {
            return Limit::perMinute(200)->by(
                $request->user()?->id ?: $request->header('X-Session-Id') ?: $request->ip()
            );
        });

        // Checkout rate limit: Reasonable limit (60 per minute covers retries)
        RateLimiter::for('checkout', function (Request $request) {
            return Limit::perMinute(60)->by(
                $request->user()?->id ?: $request->ip()
            )->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many checkout attempts. Please wait.',
                    'retry_after' => $headers['Retry-After'] ?? 60,
                ], 429, $headers);
            });
        });

        // Admin rate limit: Higher for admin operations
        RateLimiter::for('admin', function (Request $request) {
            return Limit::perMinute(200)->by(
                $request->user()?->id ?: $request->ip()
            );
        });

        // Heavy queries rate limit: For reports and analytics
        RateLimiter::for('heavy', function (Request $request) {
            return Limit::perMinute(20)->by(
                $request->user()?->id ?: $request->ip()
            )->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Report requests are rate limited. Please wait.',
                    'retry_after' => $headers['Retry-After'] ?? 60,
                ], 429, $headers);
            });
        });

        // OTP rate limit: 5 per 10 minutes (allows retries but prevents abuse)
        RateLimiter::for('otp', function (Request $request) {
            return Limit::perMinutes(10, 5)->by(
                $request->input('email') ?: $request->input('phone') ?: $request->ip()
            )->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many OTP requests. Please wait a few minutes.',
                    'retry_after' => $headers['Retry-After'] ?? 600,
                ], 429, $headers);
            });
        });
    }
}
