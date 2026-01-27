<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Payment Configuration
    |--------------------------------------------------------------------------
    |
    | Configure payment flows, thresholds, and feature flags.
    | These settings control the decision tree for MOTO vs 3DS flows.
    |
    */

    // Decision Tree Thresholds
    'high_value_threshold' => env('PAYMENT_HIGH_VALUE_THRESHOLD', 200000), // 2000 EGP in cents
    'moto_max_attempts' => 1, // Only try MOTO once per payment, then fallback
    'recent_failure_lookback_days' => 30,
    'recent_failure_threshold' => 2, // Force 3DS if user has 2+ failures in last 30 days

    // Feature Flags (for staged rollout)
    'enable_moto' => env('PAYMENT_ENABLE_MOTO', true),
    'enable_saved_cards' => env('PAYMENT_ENABLE_SAVED_CARDS', true),
    'enable_unified_checkout' => env('PAYMENT_ENABLE_UNIFIED', true),
    'force_3ds_for_new_users' => env('PAYMENT_FORCE_3DS_NEW_USERS', false),

    // Payment Key TTL (JWT expires in 1 hour per Paymob)
    'payment_key_ttl_seconds' => 3600,

    // Frontend polling configuration
    'status_polling_interval_ms' => 2000, // 2 seconds
    'status_polling_max_duration_ms' => 60000, // 60 seconds max

];
