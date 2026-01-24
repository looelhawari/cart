<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Paymob Response Callback - Redirect to app after payment
Route::get('/payment-success', function () {
    // Extract query parameters
    $orderId = request()->query('merchant_order_id');
    $success = request()->query('success', 'false');
    $txnResponse = request()->query('txn_response_code');

    // Build deep link to open the app
    // This will be caught by the WebView navigation handler in payment-webview.tsx
    return view('payment-redirect', [
        'orderId' => $orderId,
        'success' => $success === 'true',
        'txnResponse' => $txnResponse,
    ]);
});
