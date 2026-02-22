<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting Configuration
    |--------------------------------------------------------------------------
    |
    | These values are used by AppServiceProvider to configure API rate limiters.
    | Using config() instead of env() ensures values survive config:cache.
    |
    */

    'api' => (int) env('RATE_LIMIT_API', 120),
    'auth' => (int) env('RATE_LIMIT_AUTH', 60),
    'login' => (int) env('RATE_LIMIT_LOGIN', 10),
    'cart' => (int) env('RATE_LIMIT_CART', 200),
    'checkout' => (int) env('RATE_LIMIT_CHECKOUT', 60),
    'admin' => (int) env('RATE_LIMIT_ADMIN', 200),
    'heavy' => (int) env('RATE_LIMIT_HEAVY', 20),
    'otp' => (int) env('RATE_LIMIT_OTP', 5),

];
