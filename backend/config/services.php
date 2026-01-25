<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_WEB_CLIENT_ID'),
        'client_secret' => env('GOOGLE_WEB_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'apple' => [
        'client_id' => env('APPLE_CLIENT_ID'),
        'client_secret' => env('APPLE_CLIENT_SECRET'),
        'redirect' => env('APPLE_REDIRECT'),
    ],

    'paymob' => [
        'api_key' => env('PAYMOB_API_KEY'),
        'secret_key' => env('PAYMOB_SECRET_KEY'), // For Intention API authentication
        'public_key' => env('PAYMOB_PUBLIC_KEY'), // For Unified Checkout
        'hmac_secret' => env('PAYMOB_HMAC_SECRET'),
        'iframe_id' => env('PAYMOB_IFRAME_ID'),
        'card_integration_id' => env('PAYMOB_CARD_INTEGRATION_ID'),
        'integration_id_3ds' => env('PAYMOB_INTEGRATION_ID_3DS'), // For Intention API
        'wallet_integration_id' => env('PAYMOB_WALLET_INTEGRATION_ID'),
        'callback_url' => env('PAYMOB_CALLBACK_URL', env('APP_URL') . '/api/v1/paymob/processed'),
        'currency' => env('PAYMOB_CURRENCY', 'EGP'),
    ],

];
