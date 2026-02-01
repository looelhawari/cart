<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\Admin\ActivityLogController;
use App\Http\Controllers\Api\Admin\AdminLogController;
use App\Http\Controllers\Api\Admin\AdminCategoryController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\AdminProductController;
use App\Http\Controllers\Api\Admin\AnalyticsController;
use App\Http\Controllers\Api\Admin\ComprehensiveAnalyticsController;
use App\Http\Controllers\Api\Admin\FinancialController;
use App\Http\Controllers\Api\Admin\OrderStatusController;
use App\Http\Controllers\Api\Admin\RefundController as AdminRefundController;
use App\Http\Controllers\Api\Admin\SupportController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Admin\PromotionController as AdminPromotionController;
use App\Http\Controllers\Api\Admin\AdminNotificationController;
use App\Http\Controllers\Api\Admin\PromoCodeController as AdminPromoCodeController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\SocialAuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OffersController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PaymentMethodController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PromoCodeApiController;
use App\Http\Controllers\Api\PromotionController;
use App\Http\Controllers\Api\StaticPageController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\Admin\StaticPageController as AdminStaticPageController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Http\Request;

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

    // Promo code routes (public and authenticated) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('promo-codes')->group(function () {
        // Public routes
        Route::get('/available', [PromoCodeApiController::class, 'available']);
        Route::post('/validate', [PromoCodeApiController::class, 'validate']);
        Route::post('/preview', [PromoCodeApiController::class, 'preview']);
        Route::get('/details/{code}', [PromoCodeApiController::class, 'details']);
        Route::get('/suggestions', [PromoCodeApiController::class, 'suggestions']);

        // Authenticated routes
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/recommendations', [PromoCodeApiController::class, 'recommendations']);
            Route::get('/my-usage', [PromoCodeApiController::class, 'myUsage']);
        });
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

    // Promotion routes (public - for mobile app) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('promotions')->group(function () {
        Route::get('/', [PromotionController::class, 'index']);
        Route::get('/featured', [PromotionController::class, 'featured']);
        Route::get('/{id}', [PromotionController::class, 'show']);
        Route::get('/{id}/products', [PromotionController::class, 'products']);
    });

    // Offers routes (public - promo codes for mobile app) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('offers')->group(function () {
        Route::get('/', [OffersController::class, 'index']);
        Route::get('/summary', [OffersController::class, 'summary']);
    });

    // Reviews routes (public - for viewing reviews) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('reviews')->group(function () {
        Route::get('/product/{productId}', [\App\Http\Controllers\Api\V1\ReviewController::class, 'getProductReviews']);
        Route::get('/{id}', [\App\Http\Controllers\Api\V1\ReviewController::class, 'show']);
    });

    // Static pages routes (public - Terms, Privacy, About for mobile app) - throttled to 60 requests per minute
    Route::middleware('throttle:60,1')->prefix('pages')->group(function () {
        Route::get('/', [StaticPageController::class, 'index']);
        Route::get('/{slug}', [StaticPageController::class, 'show']);
    });

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/confirm-password', [AuthController::class, 'confirmPassword']);

        // Broadcasting auth (Universal for Admin & Customer)
        Route::post('/broadcasting/auth', function (Request $request) {
            try {
                $user = $request->user();
                if (!$user) {
                    \Log::warning('Broadcasting Auth: No authenticated user');
                    return response()->json(['error' => 'Unauthenticated'], 401);
                }
                
                $channelName = $request->channel_name;
                $socketId = $request->socket_id;
                
                \Log::info('Broadcasting Auth Request:', [
                    'user_id' => $user->id,
                    'channel' => $channelName,
                    'socket_id' => $socketId
                ]);
                
                // Try Laravel's built-in auth first
                $response = Broadcast::auth($request);
                
                // If Broadcast::auth returns a valid response, use it
                if ($response && !is_null($response)) {
                    \Log::info('Broadcasting Auth Success via Broadcast::auth');
                    return $response;
                }
                
                // Manual Pusher auth as fallback
                // Check if user is authorized for this channel
                $channelWithoutPrefix = str_replace('private-', '', $channelName);
                
                // For complaints channels, verify ownership
                if (str_starts_with($channelWithoutPrefix, 'complaints.')) {
                    $complaintId = (int) str_replace('complaints.', '', $channelWithoutPrefix);
                    $complaint = \App\Models\Complaint::find($complaintId);
                    
                    if (!$complaint) {
                        \Log::warning("Broadcasting Auth Failed: Complaint {$complaintId} not found");
                        return response()->json(['error' => 'Channel not found'], 403);
                    }
                    
                    $isOwner = (int) $user->id === (int) $complaint->user_id;
                    $isAdmin = method_exists($user, 'isAdmin') ? $user->isAdmin() : false;
                    
                    if (!$isOwner && !$isAdmin) {
                        \Log::warning("Broadcasting Auth Failed: User {$user->id} not authorized for complaint {$complaintId}");
                        return response()->json(['error' => 'Unauthorized'], 403);
                    }
                }
                
                // Generate Pusher signature manually
                $pusherKey = config('broadcasting.connections.pusher.key');
                $pusherSecret = config('broadcasting.connections.pusher.secret');
                
                if (!$pusherKey || !$pusherSecret) {
                    \Log::error('Broadcasting Auth Failed: Pusher credentials not configured');
                    return response()->json(['error' => 'Pusher not configured'], 500);
                }
                
                $stringToSign = $socketId . ':' . $channelName;
                $signature = hash_hmac('sha256', $stringToSign, $pusherSecret);
                
                $authResponse = [
                    'auth' => $pusherKey . ':' . $signature
                ];
                
                \Log::info('Broadcasting Auth Success (manual):', [
                    'user_id' => $user->id,
                    'channel' => $channelName
                ]);
                
                return response()->json($authResponse);
            } catch (\Throwable $e) {
                \Log::error('Broadcasting Auth Error:', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json(['error' => 'Broadcasting auth failed: ' . $e->getMessage()], 500);
            }
        });

        // User profile endpoints - password required for sensitive changes
        Route::get('profile', [AuthController::class, 'getProfile']);
        Route::middleware('password.confirm')->group(function () {
            Route::put('profile', [AuthController::class, 'updateProfile']);
            Route::delete('profile/avatar', [AuthController::class, 'deleteAvatar']);
            Route::put('profile/change-password', [AuthController::class, 'changePassword']);
        });
        Route::post('profile/avatar', [AuthController::class, 'uploadAvatar']);

        // Address management endpoints
        Route::get('addresses', [AddressController::class, 'index']);
        Route::post('addresses', [AddressController::class, 'store']);
        Route::get('addresses/{id}', [AddressController::class, 'show']);
        Route::put('addresses/{id}', [AddressController::class, 'update']);
        Route::delete('addresses/{id}', [AddressController::class, 'destroy']);
        Route::post('addresses/{id}/default', [AddressController::class, 'setDefault']);
        // Payment Methods CRUD (Phase 4) - password required for deletion
        Route::prefix('payment-methods')->group(function () {
            Route::get('/', [PaymentMethodController::class, 'index']);
            Route::put('/{id}/default', [PaymentMethodController::class, 'setDefault']);
            Route::middleware('password.confirm')->delete('/{id}', [PaymentMethodController::class, 'destroy']);
        });
        // Checkout endpoints - password required for payment processing
        Route::prefix('checkout')->group(function () {
            Route::get('/addresses', [CheckoutController::class, 'getAddresses']);
            Route::get('/delivery-slots', [CheckoutController::class, 'getDeliverySlots']);
            Route::get('/payment-methods', [CheckoutController::class, 'getPaymentMethods']);
            Route::post('/calculate', [CheckoutController::class, 'calculateSummary']);
            Route::middleware('password.confirm')->post('/process-payment', [CheckoutController::class, 'processPayment']);
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

        // Notification endpoints
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
            Route::put('/{id}/read', [NotificationController::class, 'markAsRead']);
            Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
            Route::delete('/{id}', [NotificationController::class, 'destroy']);
            Route::post('/token', [NotificationController::class, 'saveToken']);
            Route::delete('/token', [NotificationController::class, 'removeToken']);
            Route::get('/preferences', [NotificationController::class, 'getPreferences']);
            Route::put('/preferences', [NotificationController::class, 'updatePreferences']);
        });

        // Payment endpoints (protected) - password required for payment initiation
        Route::prefix('payments')->group(function () {
            // Pre-check payment (NEW - validates Paymob BEFORE order creation)
            Route::middleware('password.confirm')->post('/paymob/pre-check', [PaymentController::class, 'preCheckPayment']);

            // Initiate payment (creates payment record)
            Route::middleware('password.confirm')->post('/paymob/initiate', [PaymentController::class, 'initiatePayment']);

            // Initiate payment with saved card (Phase 5)
            Route::middleware('password.confirm')->post('/paymob/initiate-with-saved-card', [PaymentController::class, 'initiateSavedCardPayment']);

            // Check payment status for polling (per-payment query)
            Route::get('/status/{paymentId}', [PaymentController::class, 'checkStatus']);

            // Get payment status by order ID (LEGACY: per-order query)
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

        // Favorites endpoints
        Route::prefix('favorites')->group(function () {
            Route::get('/', [FavoriteController::class, 'index']);
            Route::post('/', [FavoriteController::class, 'store']);
            Route::delete('/{id}', [FavoriteController::class, 'destroy']);
            Route::get('/check/{productId}', [FavoriteController::class, 'check']);
        });

        // Complaints endpoints
        Route::prefix('complaints')->group(function () {
            Route::get('/', [ComplaintController::class, 'index']);
            Route::post('/', [ComplaintController::class, 'store']);
            Route::get('/{id}', [ComplaintController::class, 'show']);
            Route::post('/{id}/messages', [ComplaintController::class, 'addMessage']);
            Route::post('/{id}/typing', [ComplaintController::class, 'typing']);
        });

        // Reviews endpoints (protected)
        Route::prefix('reviews')->group(function () {
            Route::post('/', [\App\Http\Controllers\Api\V1\ReviewController::class, 'store']);
            Route::get('/my-reviews', [\App\Http\Controllers\Api\V1\ReviewController::class, 'getUserReviews']);
            Route::get('/can-review/{productId}', [\App\Http\Controllers\Api\V1\ReviewController::class, 'canReview']);
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\ReviewController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\ReviewController::class, 'destroy']);
            Route::post('/{id}/helpful', [\App\Http\Controllers\Api\V1\ReviewController::class, 'markHelpful']);
        });

        // Admin routes (requires admin role)
        Route::middleware(['admin', 'log.admin.activity'])->prefix('admin')->group(function () {
            // Activity Logs (legacy - for app-level logs like user registrations, logins)
            Route::prefix('activity-logs')->group(function () {
                Route::get('/', [ActivityLogController::class, 'index']);
                Route::get('/statistics', [ActivityLogController::class, 'statistics']);
                Route::get('/users', [ActivityLogController::class, 'users']);
                Route::get('/entity-types', [ActivityLogController::class, 'entityTypes']);
                Route::get('/export', [ActivityLogController::class, 'export']);
                Route::get('/{id}', [ActivityLogController::class, 'show']);
            });

            // Admin Logs (detailed admin action tracking)
            Route::prefix('admin-logs')->group(function () {
                Route::get('/', [AdminLogController::class, 'index']);
                Route::get('/statistics', [AdminLogController::class, 'statistics']);
                Route::get('/users', [AdminLogController::class, 'users']);
                Route::get('/entity-types', [AdminLogController::class, 'entityTypes']);
                Route::get('/modules', [AdminLogController::class, 'modules']);
                Route::get('/action-types', [AdminLogController::class, 'actionTypes']);
                Route::get('/export', [AdminLogController::class, 'export']);
                Route::get('/recent', [AdminLogController::class, 'recent']);
                Route::get('/entity-history', [AdminLogController::class, 'entityHistory']);
                Route::get('/user-activity/{userId}', [AdminLogController::class, 'userActivity']);
                Route::get('/{id}', [AdminLogController::class, 'show']);
            });

            // Products Management
            Route::prefix('products')->group(function () {
                Route::get('/', [AdminProductController::class, 'index']);
                Route::post('/', [AdminProductController::class, 'store']);
                Route::get('/{barcode}', [AdminProductController::class, 'show']);
                Route::put('/{barcode}', [AdminProductController::class, 'update']);
                Route::delete('/{barcode}', [AdminProductController::class, 'destroy']);
                Route::post('/{barcode}/upload-image', [AdminProductController::class, 'uploadImage']);
            });

            // Categories Management
            Route::prefix('categories')->group(function () {
                Route::get('/', [AdminCategoryController::class, 'index']);
                Route::post('/', [AdminCategoryController::class, 'store']);
                Route::get('/{id}', [AdminCategoryController::class, 'show']);
                Route::put('/{id}', [AdminCategoryController::class, 'update']);
                Route::delete('/{id}', [AdminCategoryController::class, 'destroy']);
                Route::post('/{id}/upload-image', [AdminCategoryController::class, 'uploadImage']);
            });

            // Orders Management
            Route::prefix('orders')->group(function () {
                Route::get('/', [AdminOrderController::class, 'index']);
                Route::get('/status/{status}', [AdminOrderController::class, 'byStatus']);
                Route::get('/{id}', [AdminOrderController::class, 'show']);
                Route::put('/{id}/status', [AdminOrderController::class, 'updateStatus']);
                Route::post('/{id}/cancel', [AdminOrderController::class, 'cancel']);
                Route::post('/{orderId}/deliver', [OrderStatusController::class, 'markDelivered']);
            });

            // Support Tickets
            Route::prefix('support')->group(function () {
                Route::get('/tickets', [SupportController::class, 'index']);
                Route::post('/tickets', [SupportController::class, 'store']);
                Route::get('/tickets/{id}', [SupportController::class, 'show']);
                Route::put('/tickets/{id}', [SupportController::class, 'update']);
                Route::put('/tickets/{id}/status', [SupportController::class, 'updateStatus']);
                Route::put('/tickets/{id}/priority', [SupportController::class, 'updatePriority']);
                Route::post('/tickets/{id}/assign', [SupportController::class, 'assignTicket']);
                Route::post('/tickets/{id}/messages', [SupportController::class, 'addMessage']);
                Route::post('/tickets/{id}/typing', [SupportController::class, 'typing']);
                Route::get('/tickets/{id}/suggestions', [SupportController::class, 'getSuggestions']);
                Route::post('/tickets/{id}/read', [SupportController::class, 'markAsRead']);
                Route::get('/tickets/{id}/customer-history', [SupportController::class, 'getCustomerHistory']);
                Route::get('/analytics', [SupportController::class, 'analytics']);
            });

            // Canned Responses
            Route::prefix('canned-responses')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'index']);
                Route::post('/', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'store']);
                Route::get('/categories', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'categories']);
                Route::get('/{cannedResponse}', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'show']);
                Route::put('/{cannedResponse}', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'update']);
                Route::delete('/{cannedResponse}', [\App\Http\Controllers\Api\Admin\CannedResponseController::class, 'destroy']);
            });

            // Financial Management
            Route::prefix('financial')->group(function () {
                Route::get('/dashboard', [FinancialController::class, 'dashboard']);
                Route::get('/transactions', [FinancialController::class, 'transactions']);
                Route::get('/promo-codes', [FinancialController::class, 'promoCodes']);
                Route::post('/promo-codes', [FinancialController::class, 'createPromoCode']);
                Route::put('/promo-codes/{id}', [FinancialController::class, 'updatePromoCode']);
                Route::delete('/promo-codes/{id}', [FinancialController::class, 'deletePromoCode']);
                Route::get('/promo-codes/analytics', [FinancialController::class, 'promoCodesAnalytics']);
            });

            // Promotions Management
            Route::prefix('promotions')->group(function () {
                Route::get('/', [AdminPromotionController::class, 'index']);
                Route::post('/', [AdminPromotionController::class, 'store']);
                Route::get('/summary-analytics', [AdminPromotionController::class, 'summaryAnalytics']);
                Route::get('/{id}', [AdminPromotionController::class, 'show']);
                Route::put('/{id}', [AdminPromotionController::class, 'update']);
                Route::delete('/{id}', [AdminPromotionController::class, 'destroy']);
                Route::post('/{id}/feature', [AdminPromotionController::class, 'setFeatured']);
                Route::get('/{id}/analytics', [AdminPromotionController::class, 'analytics']);
                Route::post('/sync-status', [AdminPromotionController::class, 'syncStatus']);
            });

            // Notification Management
            Route::prefix('notifications')->group(function () {
                Route::get('/', [AdminNotificationController::class, 'index']);
                Route::get('/analytics', [AdminNotificationController::class, 'analytics']);
                Route::get('/{id}', [AdminNotificationController::class, 'show']);
                Route::delete('/{id}', [AdminNotificationController::class, 'destroy']);
                Route::post('/{id}/resend', [AdminNotificationController::class, 'resend']);
                Route::post('/broadcast', [AdminNotificationController::class, 'sendBroadcast']);
                Route::post('/send-to-users', [AdminNotificationController::class, 'sendToUsers']);
                Route::post('/send-promotion', [AdminNotificationController::class, 'sendPromotion']);
            });

            // Static Pages Management (Terms, Privacy, About)
            Route::prefix('pages')->group(function () {
                Route::get('/', [AdminStaticPageController::class, 'index']);
                Route::get('/{slug}', [AdminStaticPageController::class, 'show']);
                Route::put('/{slug}', [AdminStaticPageController::class, 'update']);
                Route::post('/{slug}/toggle-status', [AdminStaticPageController::class, 'toggleStatus']);
                Route::get('/{slug}/history', [AdminStaticPageController::class, 'history']);
            });

            // Customer Management
            Route::prefix('customers')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'index']);
                Route::get('/stats', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'stats']);
                Route::get('/{id}', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'show']);
                Route::get('/{id}/activity', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'activity']);
                Route::put('/{id}', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'update']);
                Route::post('/{id}/notes', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'storeNote']);
                Route::post('/{id}/reset-password', [\App\Http\Controllers\Api\Admin\CustomerController::class, 'resetPassword']);
            });

            // User Management
            Route::prefix('users')->group(function () {
                Route::get('/', [UserController::class, 'index']);
                Route::post('/', [UserController::class, 'store']);
                Route::get('/{id}', [UserController::class, 'show']);
                Route::put('/{id}', [UserController::class, 'update']);
                Route::delete('/{id}', [UserController::class, 'destroy']);
            });

            // Analytics & Reporting
            Route::prefix('analytics')->group(function () {
                Route::get('/dashboard', [AnalyticsController::class, 'dashboard']);
                Route::get('/products', [AnalyticsController::class, 'productPerformance']);
                Route::get('/customers', [AnalyticsController::class, 'customerInsights']);

                // Comprehensive Analytics
                Route::get('/overview', [ComprehensiveAnalyticsController::class, 'overview']);
                Route::get('/sales', [ComprehensiveAnalyticsController::class, 'salesAnalytics']);
                Route::get('/customers-detailed', [ComprehensiveAnalyticsController::class, 'customerAnalytics']);
                Route::get('/products-detailed', [ComprehensiveAnalyticsController::class, 'productAnalytics']);
                Route::get('/orders-detailed', [ComprehensiveAnalyticsController::class, 'orderAnalytics']);
                Route::get('/marketing', [ComprehensiveAnalyticsController::class, 'marketingAnalytics']);
                Route::get('/financial', [ComprehensiveAnalyticsController::class, 'financialAnalytics']);
                Route::get('/inventory', [ComprehensiveAnalyticsController::class, 'inventoryAnalytics']);
                Route::get('/operational', [ComprehensiveAnalyticsController::class, 'operationalAnalytics']);
                Route::get('/export', [ComprehensiveAnalyticsController::class, 'exportAnalytics']);
            });

            // Refunds
            Route::prefix('refunds')->group(function () {
                Route::post('/full', [AdminRefundController::class, 'fullRefund']);
                Route::post('/partial', [AdminRefundController::class, 'partialRefund']);
                Route::get('/history/{orderId}', [AdminRefundController::class, 'getRefundHistory']);
            });

            // Promo Code Analytics & Management
            Route::prefix('promo-codes')->group(function () {
                // CRUD operations
                Route::get('/', [AdminPromoCodeController::class, 'index']);
                Route::post('/', [AdminPromoCodeController::class, 'store']);
                Route::get('/products', [AdminPromoCodeController::class, 'getProducts']);
                Route::get('/categories', [AdminPromoCodeController::class, 'getCategories']);
                Route::post('/compare', [AdminPromoCodeController::class, 'compare']);
                Route::post('/bulk-status', [AdminPromoCodeController::class, 'bulkUpdateStatus']);
                Route::get('/export', [AdminPromoCodeController::class, 'export']);

                // Single promo code operations
                Route::get('/{id}', [AdminPromoCodeController::class, 'show']);
                Route::put('/{id}', [AdminPromoCodeController::class, 'update']);
                Route::delete('/{id}', [AdminPromoCodeController::class, 'destroy']);
                Route::post('/{id}/duplicate', [AdminPromoCodeController::class, 'duplicate']);
                Route::get('/{id}/analytics', [AdminPromoCodeController::class, 'analytics']);
                Route::get('/{id}/usage-history', [AdminPromoCodeController::class, 'usageHistory']);
                Route::get('/{id}/users', [AdminPromoCodeController::class, 'users']);
                Route::get('/{id}/user/{userId}', [AdminPromoCodeController::class, 'userUsage']);
            });
        });
    });

    // Paymob callbacks (public - no auth required, HMAC verified internally)
    Route::middleware('throttle:60,1')->group(function () {
        Route::post('paymob/processed', [PaymentController::class, 'processedCallback']);
        Route::get('payment/response', [PaymentController::class, 'responseCallback']);
    });

    // TESTING ONLY - Manual webhook completion (remove in production)
    // Use when Paymob webhook can't reach localhost during development
    Route::post('test/complete-payment/{orderId}', function ($orderId) {
        $order = \App\Models\Order::find($orderId);
        $payment = \App\Models\PaymobPayment::where('order_id', $orderId)->first();

        if (!$order || !$payment) {
            return response()->json(['error' => 'Order or payment not found'], 404);
        }

        if ($payment->status !== 'PENDING') {
            return response()->json([
                'error' => 'Payment already processed',
                'current_status' => $payment->status
            ], 400);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($order, $payment) {
            $txnId = 'TEST-' . time();

            $payment->update([
                'status' => 'PAID',
                'transaction_id' => $txnId,
                'paid_at' => now(),
                'paymob_response' => ['test_completion' => true],
            ]);

            \App\Models\PaymentTransaction::create([
                'order_id' => $order->id,
                'transaction_id' => $txnId,
                'payment_method' => 'card',
                'amount' => $order->total,
                'status' => 'completed',
                'gateway_response' => ['test_completion' => true],
                'processed_at' => now(),
            ]);

            $order->update([
                'status' => 'confirmed',
                'payment_status' => 'completed',
            ]);

            $cart = \App\Models\Cart::where('user_id', $order->user_id)->first();
            if ($cart) {
                $cart->items()->delete();
                $cart->delete();
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Payment completed successfully',
            'order_id' => $orderId,
            'status' => 'PAID',
            'payment_status' => 'completed',
        ]);
    });

});
