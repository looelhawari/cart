<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\Admin\RefundController as AdminRefundController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\SocialAuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\WalletController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // Auth routes (guest only) - throttled to 5 requests per minute per APIs.md
    Route::middleware(['guest', 'throttle:5,1'])->group(function () {
        Route::post('auth/register', [AuthController::class, 'register']);
        Route::post('auth/verify-email', [AuthController::class, 'verifyEmail']);
        Route::post('auth/resend-otp', [AuthController::class, 'resendOtp']);
        Route::post('auth/login', [AuthController::class, 'login']);
        Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('auth/verify-reset-otp', [AuthController::class, 'verifyResetOtp']);
        Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);
        Route::post('auth/check-email', [AuthController::class, 'checkEmail']);
        Route::post('auth/check-phone', [AuthController::class, 'checkPhone']);

        // Social authentication
        Route::post('auth/google', [SocialAuthController::class, 'google']);
        Route::post('auth/apple', [SocialAuthController::class, 'apple']);
    });

    // Refresh token (no auth required) - throttled to 5 requests per minute
    Route::middleware('throttle:5,1')->post('auth/refresh', [AuthController::class, 'refreshToken']);

    // Cart routes (guest or authenticated) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('cart')->group(function () {
        Route::get('/', [CartController::class, 'index']);
        Route::post('/items', [CartController::class, 'addItem']);
        Route::put('/items/{id}', [CartController::class, 'updateItem']);
        Route::delete('/items/{id}', [CartController::class, 'removeItem']);
        Route::delete('/clear', [CartController::class, 'clear']);
        Route::post('/apply-promo', [CartController::class, 'applyPromo']);
        Route::delete('/remove-promo', [CartController::class, 'removePromo']);
    });

    // Product routes (public) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('products', [ProductController::class, 'index']);
        Route::get('products/featured', [ProductController::class, 'featured']);
        Route::get('products/flash-deals', [ProductController::class, 'flashDeals']);
        Route::get('products/{barcode}', [ProductController::class, 'show']);
    });

    // Category routes (public) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index']);
        Route::get('/featured-with-products', [CategoryController::class, 'featuredWithProducts']);
        Route::get('/{id}', [CategoryController::class, 'show']);
        Route::get('/{id}/products', [CategoryController::class, 'products']);
    });

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);

        // User profile endpoints
        Route::get('profile', [AuthController::class, 'getProfile']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::post('profile/avatar', [AuthController::class, 'uploadAvatar']);
        Route::delete('profile/avatar', [AuthController::class, 'deleteAvatar']);
        Route::put('profile/change-password', [AuthController::class, 'changePassword']);

        // Address management endpoints
        Route::get('addresses', [AddressController::class, 'index']);
        Route::post('addresses', [AddressController::class, 'store']);
        Route::get('addresses/{id}', [AddressController::class, 'show']);
        Route::put('addresses/{id}', [AddressController::class, 'update']);
        Route::delete('addresses/{id}', [AddressController::class, 'destroy']);
        Route::post('addresses/{id}/default', [AddressController::class, 'setDefault']);

        // Checkout endpoints
        Route::prefix('checkout')->group(function () {
            Route::get('/addresses', [CheckoutController::class, 'getAddresses']);
            Route::get('/delivery-slots', [CheckoutController::class, 'getDeliverySlots']);
            Route::get('/payment-methods', [CheckoutController::class, 'getPaymentMethods']);
            Route::post('/calculate', [CheckoutController::class, 'calculateSummary']);
            Route::post('/process-payment', [CheckoutController::class, 'processPayment']);
            Route::get('/payment-options/{orderId}', [CheckoutController::class, 'getPaymentOptions']);
            Route::post('/validate-promo', [CheckoutController::class, 'validatePromoCode']);
        });

        // Order endpoints
        Route::prefix('orders')->group(function () {
            Route::get('/', [OrderController::class, 'index']);
            Route::post('/', [OrderController::class, 'store']);
            Route::get('/{id}', [OrderController::class, 'show']);
            Route::post('/{id}/cancel', [OrderController::class, 'cancel']);
            Route::post('/{id}/reorder', [OrderController::class, 'reorder']);
        });

        // Payment endpoints (protected)
        Route::prefix('payments')->group(function () {
            // Pre-check payment (NEW - validates Paymob BEFORE order creation)
            Route::post('/paymob/pre-check', [PaymentController::class, 'preCheckPayment']);

            // Initiate payment (creates payment record)
            Route::post('/paymob/initiate', [PaymentController::class, 'initiatePayment']);

            // Get payment status
            Route::get('/order/{orderId}/status', [PaymentController::class, 'getPaymentStatus']);
        });

        // Wallet endpoints (protected)
        Route::prefix('wallet')->group(function () {
            Route::get('/', [WalletController::class, 'index']);
            Route::get('/transactions', [WalletController::class, 'transactions']);
            Route::post('/recharge', [WalletController::class, 'recharge']);
        });

        // Phone verification for social login users
        Route::post('auth/send-phone-otp', [SocialAuthController::class, 'sendPhoneOtp']);
        Route::post('auth/verify-phone-otp', [SocialAuthController::class, 'verifyPhoneOtp']);

        // Admin routes (requires admin role)
        Route::middleware('admin')->prefix('admin')->group(function () {
            Route::prefix('refunds')->group(function () {
                Route::post('/full', [AdminRefundController::class, 'fullRefund']);
                Route::post('/partial', [AdminRefundController::class, 'partialRefund']);
                Route::get('/history/{orderId}', [AdminRefundController::class, 'getRefundHistory']);
            });
        });
    });

    // Paymob callbacks (public - no auth required, HMAC verified internally)
    Route::middleware('throttle:60,1')->group(function () {
        Route::post('paymob/processed', [PaymentController::class, 'processedCallback']);
        Route::get('payment/response', [PaymentController::class, 'responseCallback']);
    });

});
