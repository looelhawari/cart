<?php

/**
 * Enterprise Rate Limiting Configuration
 * 
 * Multi-layered rate limiting system inspired by Facebook, Instagram,
 * Stripe, and other big tech implementations.
 * 
 * Algorithms: Token Bucket (default) + Sliding Window Counter
 * Storage: Redis with Lua script atomicity
 * 
 * Dimensions:
 *   - Per-IP (DDoS / brute force protection)
 *   - Per-User (fair usage enforcement)
 *   - Per-Endpoint (resource-specific limits)
 *   - Per-API-Key (third-party integrations)
 *   - Global (system-wide circuit breaker)
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Default Algorithm
    |--------------------------------------------------------------------------
    | Supported: "token_bucket", "sliding_window", "fixed_window"
    | Token Bucket is recommended for production — allows bursts while
    | enforcing long-term averages (used by Stripe, AWS, Google Cloud).
    */
    'algorithm' => env('RATE_LIMIT_ALGORITHM', 'token_bucket'),

    /*
    |--------------------------------------------------------------------------
    | Storage Driver
    |--------------------------------------------------------------------------
    | Where rate limit counters are stored.
    | "redis" — recommended for distributed, atomic, low-latency
    | "cache" — fallback to Laravel cache (database, file, etc.)
    */
    'storage' => env('RATE_LIMIT_STORAGE', 'redis'),

    /*
    |--------------------------------------------------------------------------
    | Redis Connection
    |--------------------------------------------------------------------------
    */
    'redis_connection' => env('RATE_LIMIT_REDIS_CONNECTION', 'default'),

    /*
    |--------------------------------------------------------------------------
    | Key Prefix
    |--------------------------------------------------------------------------
    */
    'key_prefix' => env('RATE_LIMIT_PREFIX', 'rl:'),

    /*
    |--------------------------------------------------------------------------
    | Fail-Open vs Fail-Closed
    |--------------------------------------------------------------------------
    | When Redis is unavailable:
    |   true  = allow requests (preserve availability)
    |   false = block requests (preserve security)
    | 
    | Recommendation: true for APIs, false for login/payment endpoints
    */
    'fail_open' => env('RATE_LIMIT_FAIL_OPEN', true),

    /*
    |--------------------------------------------------------------------------
    | Global Rate Limit (Circuit Breaker)
    |--------------------------------------------------------------------------
    | Maximum requests per second across the entire system.
    | Acts as a last resort to protect the server from total overload.
    */
    'global' => [
        'enabled' => env('RATE_LIMIT_GLOBAL_ENABLED', true),
        'max_per_second' => env('RATE_LIMIT_GLOBAL_MAX', 5000),
    ],

    /*
    |--------------------------------------------------------------------------
    | IP-Based Limits (DDoS / Brute Force)
    |--------------------------------------------------------------------------
    */
    'ip' => [
        'enabled' => true,
        'max_per_minute' => env('RATE_LIMIT_IP_PER_MINUTE', 300),
        'max_per_second' => env('RATE_LIMIT_IP_PER_SECOND', 30),
        'burst_capacity' => env('RATE_LIMIT_IP_BURST', 50),
        // IPs that bypass rate limiting (monitoring, health checks)
        'whitelist' => array_filter(explode(',', env('RATE_LIMIT_IP_WHITELIST', '127.0.0.1,::1'))),
        // IPs permanently blocked
        'blacklist' => array_filter(explode(',', env('RATE_LIMIT_IP_BLACKLIST', ''))),
    ],

    /*
    |--------------------------------------------------------------------------
    | User-Based Limits (Fair Usage)
    |--------------------------------------------------------------------------
    */
    'user' => [
        'enabled' => true,
        'max_per_minute' => env('RATE_LIMIT_USER_PER_MINUTE', 120),
        'burst_capacity' => env('RATE_LIMIT_USER_BURST', 30),
    ],

    /*
    |--------------------------------------------------------------------------
    | Endpoint-Specific Limits
    |--------------------------------------------------------------------------
    | Fine-grained control per route pattern.
    | Uses the most specific match (exact > prefix > wildcard).
    */
    'endpoints' => [
        // Authentication — strict to prevent brute force
        'auth/login' => [
            'max_per_minute' => 10,
            'max_per_15_minutes' => 30,
            'burst_capacity' => 5,
            'key_by' => 'ip+input:email', // Track by IP AND email
            'fail_open' => env('RATE_LIMIT_FAIL_OPEN', false),         // Security-critical: fail closed
            'penalty_multiplier' => 2,    // Double penalty on repeated violations
        ],
        'auth/register' => [
            'max_per_minute' => 5,
            'max_per_hour' => 20,
            'burst_capacity' => 3,
            'key_by' => 'ip',
            'fail_open' => env('RATE_LIMIT_FAIL_OPEN', false),
        ],
        'auth/forgot-password' => [
            'max_per_minute' => 3,
            'max_per_hour' => 10,
            'burst_capacity' => 2,
            'key_by' => 'ip+input:email',
            'fail_open' => env('RATE_LIMIT_FAIL_OPEN', false),
        ],
        'auth/verify-email' => [
            'max_per_minute' => 10,
            'burst_capacity' => 5,
            'key_by' => 'ip',
            'fail_open' => env('RATE_LIMIT_FAIL_OPEN', false),
        ],
        'auth/resend-otp' => [
            'max_per_minute' => 3,
            'max_per_10_minutes' => 10,
            'burst_capacity' => 2,
            'key_by' => 'ip+input:email',
            'fail_open' => env('RATE_LIMIT_FAIL_OPEN', false),
        ],
        'auth/google' => [
            'max_per_minute' => 10,
            'burst_capacity' => 5,
            'key_by' => 'ip',
            'fail_open' => env('RATE_LIMIT_FAIL_OPEN', false),
        ],
        'auth/apple' => [
            'max_per_minute' => 10,
            'burst_capacity' => 5,
            'key_by' => 'ip',
            'fail_open' => env('RATE_LIMIT_FAIL_OPEN', false),
        ],
        'auth/refresh' => [
            'max_per_minute' => 30,
            'burst_capacity' => 10,
            'key_by' => 'ip',
        ],

        // Checkout & Payments — moderate, prevents abuse
        'checkout/*' => [
            'max_per_minute' => 30,
            'burst_capacity' => 10,
            'key_by' => 'user',
            'fail_open' => false,
        ],
        'payments/*' => [
            'max_per_minute' => 20,
            'burst_capacity' => 5,
            'key_by' => 'user',
            'fail_open' => false,
        ],

        // Cart — high tolerance (users click fast)
        'cart/*' => [
            'max_per_minute' => 200,
            'burst_capacity' => 40,
            'key_by' => 'user_or_session',
        ],

        // Search — moderate (prevent scraping)
        'products/search' => [
            'max_per_minute' => 60,
            'burst_capacity' => 15,
            'key_by' => 'ip',
        ],
        'search/suggestions' => [
            'max_per_minute' => 120,
            'burst_capacity' => 30,
            'key_by' => 'ip',
        ],

        // Product listing — generous (users browse)
        'products' => [
            'max_per_minute' => 120,
            'burst_capacity' => 30,
            'key_by' => 'ip',
        ],
        'products/*' => [
            'max_per_minute' => 120,
            'burst_capacity' => 30,
            'key_by' => 'ip',
        ],

        // Categories
        'categories' => [
            'max_per_minute' => 60,
            'burst_capacity' => 15,
            'key_by' => 'ip',
        ],

        // Orders — moderate
        'orders' => [
            'max_per_minute' => 60,
            'burst_capacity' => 15,
            'key_by' => 'user',
        ],
        'orders/*' => [
            'max_per_minute' => 60,
            'burst_capacity' => 15,
            'key_by' => 'user',
        ],

        // Profile
        'profile' => [
            'max_per_minute' => 30,
            'burst_capacity' => 10,
            'key_by' => 'user',
        ],
        'profile/*' => [
            'max_per_minute' => 30,
            'burst_capacity' => 10,
            'key_by' => 'user',
        ],

        // Admin endpoints — generous but tracked
        'admin/*' => [
            'max_per_minute' => 300,
            'burst_capacity' => 60,
            'key_by' => 'user',
        ],

        // Admin analytics — heavy queries
        'admin/analytics/*' => [
            'max_per_minute' => 30,
            'burst_capacity' => 10,
            'key_by' => 'user',
        ],
        'admin/financial/*' => [
            'max_per_minute' => 20,
            'burst_capacity' => 5,
            'key_by' => 'user',
        ],

        // Driver
        'driver/*' => [
            'max_per_minute' => 120,
            'burst_capacity' => 30,
            'key_by' => 'user',
        ],

        // Notifications
        'notifications' => [
            'max_per_minute' => 60,
            'burst_capacity' => 15,
            'key_by' => 'user',
        ],

        // Webhooks — trusted but tracked
        'webhooks/*' => [
            'max_per_minute' => 100,
            'burst_capacity' => 20,
            'key_by' => 'ip',
        ],

        // Paymob payment webhooks — fail-closed to prevent abuse
        'paymob/*' => [
            'max_per_minute' => 100,
            'burst_capacity' => 25,
            'key_by' => 'ip',
            'fail_open' => false,
        ],
        'payment/response' => [
            'max_per_minute' => 100,
            'burst_capacity' => 25,
            'key_by' => 'ip',
        ],

        // Favorites
        'favorites/*' => [
            'max_per_minute' => 60,
            'burst_capacity' => 15,
            'key_by' => 'user',
        ],

        // Complaints & support chat
        'complaints/*' => [
            'max_per_minute' => 30,
            'burst_capacity' => 10,
            'key_by' => 'user',
        ],

        // Wallet — financial operations
        'wallet/*' => [
            'max_per_minute' => 30,
            'burst_capacity' => 10,
            'key_by' => 'user',
            'fail_open' => false,
        ],

        // Payment methods — sensitive
        'payment-methods/*' => [
            'max_per_minute' => 30,
            'burst_capacity' => 10,
            'key_by' => 'user',
        ],

        // Broadcasting auth (WebSocket)
        'broadcasting/*' => [
            'max_per_minute' => 60,
            'burst_capacity' => 20,
            'key_by' => 'user',
        ],

        // Promotions & offers — public listings
        'promotions/*' => [
            'max_per_minute' => 120,
            'burst_capacity' => 30,
            'key_by' => 'ip',
        ],
        'offers/*' => [
            'max_per_minute' => 120,
            'burst_capacity' => 30,
            'key_by' => 'ip',
        ],

        // Reviews
        'reviews/*' => [
            'max_per_minute' => 60,
            'burst_capacity' => 15,
            'key_by' => 'ip',
        ],

        // Promo codes — prevent brute-force
        'promo-codes/*' => [
            'max_per_minute' => 30,
            'burst_capacity' => 10,
            'key_by' => 'ip',
        ],

        // Static pages & store settings — cacheable, generous
        'pages/*' => [
            'max_per_minute' => 120,
            'burst_capacity' => 30,
            'key_by' => 'ip',
        ],
        'store/*' => [
            'max_per_minute' => 120,
            'burst_capacity' => 30,
            'key_by' => 'ip',
        ],

        // Delivery zones
        'delivery-zones/*' => [
            'max_per_minute' => 60,
            'burst_capacity' => 15,
            'key_by' => 'ip',
        ],

        // Watchlist & flash sales
        'watchlist/*' => [
            'max_per_minute' => 60,
            'burst_capacity' => 15,
            'key_by' => 'user',
        ],
        'flash-sales/*' => [
            'max_per_minute' => 120,
            'burst_capacity' => 30,
            'key_by' => 'ip',
        ],

        // Addresses
        'addresses/*' => [
            'max_per_minute' => 60,
            'burst_capacity' => 15,
            'key_by' => 'user',
        ],

        // Health check
        'health' => [
            'max_per_minute' => 60,
            'burst_capacity' => 10,
            'key_by' => 'ip',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Abuse Detection (Adaptive Rate Limiting)
    |--------------------------------------------------------------------------
    | When a client repeatedly hits rate limits, escalate penalties.
    | Inspired by Instagram/Facebook progressive blocking.
    */
    'abuse_detection' => [
        'enabled' => env('RATE_LIMIT_ABUSE_DETECTION', true),
        // After N violations in the window, start escalating
        'violation_threshold' => 5,
        'violation_window_minutes' => 15,
        // Escalation tiers
        'tiers' => [
            // Tier 1: Warnings (5-10 violations) — reduce limits by 50%
            ['min_violations' => 5, 'max_violations' => 10, 'limit_multiplier' => 0.5, 'block_duration_seconds' => 60],
            // Tier 2: Throttle (11-20 violations) — reduce limits by 75%
            ['min_violations' => 11, 'max_violations' => 20, 'limit_multiplier' => 0.25, 'block_duration_seconds' => 300],
            // Tier 3: Soft ban (21-50 violations) — 90% reduction
            ['min_violations' => 21, 'max_violations' => 50, 'limit_multiplier' => 0.1, 'block_duration_seconds' => 900],
            // Tier 4: Hard ban (50+ violations) — blocked for 1 hour
            ['min_violations' => 51, 'max_violations' => PHP_INT_MAX, 'limit_multiplier' => 0, 'block_duration_seconds' => 3600],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Response Headers
    |--------------------------------------------------------------------------
    | Standard rate limit headers returned with every response.
    */
    'headers' => [
        'enabled' => true,
        'limit' => 'X-RateLimit-Limit',
        'remaining' => 'X-RateLimit-Remaining',
        'reset' => 'X-RateLimit-Reset',
        'retry_after' => 'Retry-After',
        'policy' => 'X-RateLimit-Policy', // Which policy was applied
    ],

    /*
    |--------------------------------------------------------------------------
    | Logging & Monitoring
    |--------------------------------------------------------------------------
    */
    'logging' => [
        'enabled' => env('RATE_LIMIT_LOGGING', true),
        'channel' => env('RATE_LIMIT_LOG_CHANNEL', 'daily'),
        // Log all blocked requests
        'log_blocked' => true,
        // Log when clients approach limits (>80% consumed)
        'log_warnings' => true,
        // Log abuse escalations
        'log_abuse' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Fingerprinting
    |--------------------------------------------------------------------------
    | Beyond IP: use request fingerprinting to detect evasion.
    */
    'fingerprinting' => [
        'enabled' => env('RATE_LIMIT_FINGERPRINT', true),
        'factors' => [
            'user_agent',
            'accept_language',
            'accept_encoding',
        ],
    ],
];
