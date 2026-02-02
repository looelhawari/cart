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
        // Default API rate limit: 60 requests per minute per user/IP
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by(
                $request->user()?->id ?: $request->ip()
            )->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many requests. Please slow down.',
                    'retry_after' => $headers['Retry-After'] ?? 60,
                ], 429, $headers);
            });
        });

        // Auth rate limit: 5 requests per minute (login, register, OTP)
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by(
                $request->input('email') ?: $request->ip()
            )->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many authentication attempts. Please wait.',
                    'retry_after' => $headers['Retry-After'] ?? 60,
                ], 429, $headers);
            });
        });

        // Cart rate limit: Higher limit for cart operations
        RateLimiter::for('cart', function (Request $request) {
            return Limit::perMinute(120)->by(
                $request->user()?->id ?: $request->header('X-Session-Id') ?: $request->ip()
            );
        });

        // Checkout rate limit: Strict limit to prevent order spam
        RateLimiter::for('checkout', function (Request $request) {
            return Limit::perMinute(10)->by(
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
            return Limit::perMinute(100)->by(
                $request->user()?->id ?: $request->ip()
            );
        });

        // Heavy queries rate limit: For reports and analytics
        RateLimiter::for('heavy', function (Request $request) {
            return Limit::perMinute(10)->by(
                $request->user()?->id ?: $request->ip()
            )->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Report requests are rate limited. Please wait.',
                    'retry_after' => $headers['Retry-After'] ?? 60,
                ], 429, $headers);
            });
        });

        // OTP rate limit: Very strict to prevent abuse
        RateLimiter::for('otp', function (Request $request) {
            return Limit::perMinute(3)->by(
                $request->input('email') ?: $request->ip()
            )->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many OTP requests. Please wait 1 minute.',
                    'retry_after' => $headers['Retry-After'] ?? 60,
                ], 429, $headers);
            });
        });
    }
}
