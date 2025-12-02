<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\SocialAuthController;
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
        Route::post('auth/login', [AuthController::class, 'login']);
        Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('auth/verify-reset-otp', [AuthController::class, 'verifyResetOtp']);
        Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);

        // Social authentication
        Route::post('auth/google', [SocialAuthController::class, 'google']);
        Route::post('auth/apple', [SocialAuthController::class, 'apple']);
    });

    // Refresh token (no auth required) - throttled to 5 requests per minute
    Route::middleware('throttle:5,1')->post('auth/refresh', [AuthController::class, 'refreshToken']);

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

        // Phone verification for social login users
        Route::post('auth/send-phone-otp', [SocialAuthController::class, 'sendPhoneOtp']);
        Route::post('auth/verify-phone-otp', [SocialAuthController::class, 'verifyPhoneOtp']);
    });

});
