<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Paymob Response Callback - Simple success page for browser redirect after payment
Route::get('/payment-success', function () {
    return response()->json([
        'success' => true,
        'message' => 'Payment completed successfully',
        'note' => 'This is just a browser redirect endpoint. The actual payment processing is handled by the webhook.'
    ], 200);
});
