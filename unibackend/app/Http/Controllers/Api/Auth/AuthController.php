<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RefreshTokenRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Requests\Auth\VerifyPhoneRequest;
use App\Models\ActivityLog;
use App\Models\User;
use App\Models\UserLoginHistory;
use App\Services\OtpService;
use App\Services\CartService;
use App\Services\PushNotificationService;
use App\Services\EnterpriseNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use App\Services\CloudinaryService;
use Carbon\Carbon;

class AuthController extends Controller
{
    protected OtpService $otpService;
    protected CartService $cartService;
    protected PushNotificationService $pushNotificationService;
    protected ?EnterpriseNotificationService $enterpriseNotificationService;

    public function __construct(
        OtpService $otpService,
        CartService $cartService,
        PushNotificationService $pushNotificationService
    ) {
        $this->otpService = $otpService;
        $this->cartService = $cartService;
        $this->pushNotificationService = $pushNotificationService;
        try {
            $this->enterpriseNotificationService = app(EnterpriseNotificationService::class);
        } catch (\Exception $e) {
            $this->enterpriseNotificationService = null;
        }
    }

    /**
     * Register a new user.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        // NOTE: Cleanup of stale unverified records is handled in
        // RegisterRequest::prepareForValidation() — before unique validation runs.

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'language' => $request->language,
            'role' => 'customer',
            'is_active' => true,
            'is_verified' => false,
        ]);

        // Log registration activity
        ActivityLog::log('user_registered', $user->id, 'User', $user->id, [
            'email' => $user->email,
            'phone' => $user->phone,
        ]);

        // Generate and send OTP for email verification
        $otp = $this->otpService->createEmailVerificationOtp($user->email);
        $this->otpService->sendEmail($user->email, $otp->otp, 'Email Verification');

        return response()->json([
            'success' => true,
            'message' => 'Registration successful. Please verify your email address.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'language' => $user->language,
                    'is_verified' => $user->is_verified,
                ],
            ],
        ], 201);
    }

    /**
     * Verify email with OTP.
     */
    public function verifyEmail(VerifyPhoneRequest $request): JsonResponse
    {
        $otpRecord = $this->otpService->verify(
            $request->email,
            $request->otp,
            'email_verification'
        );

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired OTP.',
            ], 400);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        $user->update([
            'is_verified' => true,
            'email_verified_at' => Carbon::now(),
        ]);

        $otpRecord->markAsUsed();

        // Send welcome notification (will be delivered when user registers push token)
        $this->pushNotificationService->sendWelcomeNotification($user->id, $user->first_name);

        // Create tokens - standard 24 hour session for new registrations
        $accessToken = $user->createToken('access_token', ['*'], Carbon::now()->addHours(24))->plainTextToken;
        $refreshToken = $user->createToken('refresh_token', ['refresh', 'standard'], Carbon::now()->addDays(30))->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'avatar' => $user->avatar,
                    'language' => $user->language,
                    'role' => $user->role,
                    'is_verified' => $user->is_verified,
                ],
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type' => 'Bearer',
                'expires_in' => 86400, // 24 hours in seconds
            ],
        ]);
    }

    /**
     * Login user.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            // Log failed login attempt
            ActivityLog::log('login_failed', $user?->id, null, null, [
                'email' => $request->email,
                'reason' => 'invalid_credentials',
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been deactivated.',
            ], 403);
        }

        if (!$user->is_verified) {
            // Resend OTP
            $otp = $this->otpService->createEmailVerificationOtp($user->email);
            $this->otpService->sendEmail($user->email, $otp->otp, 'Email Verification');

            return response()->json([
                'success' => false,
                'message' => 'Please verify your email address. A new OTP has been sent.',
                'requires_verification' => true,
            ], 403);
        }

        // Revoke all existing tokens
        $user->tokens()->delete();

        // Create new tokens - extend lifetime significantly for better UX
        $rememberMe = (bool) $request->input('remember_me', false);

        // Access token: 30 days with remember_me, 7 days otherwise
        $accessTokenExpiry = $rememberMe ? Carbon::now()->addDays(30) : Carbon::now()->addDays(7);
        $accessToken = $user->createToken('access_token', ['*'], $accessTokenExpiry)->plainTextToken;

        // Refresh token: 180 days (6 months) with remember_me, 90 days otherwise
        $refreshTokenExpiry = $rememberMe ? Carbon::now()->addDays(180) : Carbon::now()->addDays(90);
        $refreshToken = $user->createToken('refresh_token', ['refresh', $rememberMe ? 'remember' : 'standard'], $refreshTokenExpiry)->plainTextToken;

        // Merge guest cart if session ID is provided
        $sessionId = $request->header('X-Session-ID') ?? $request->cookie('session_id');
        if ($sessionId) {
            try {
                $this->cartService->mergeGuestCart($sessionId, $user->id);
            } catch (\Exception $e) {
                // Log error but don't fail login
                Log::error('Cart merge failed: ' . $e->getMessage());
            }
        }

        // Log successful login
        ActivityLog::log('user_logged_in', $user->id, 'User', $user->id);

        // Record login for security tracking and send notification if new device
        if ($this->enterpriseNotificationService) {
            try {
                // Extract actual IP address from request
                $ipAddress = $request->ip() ?? $request->getClientIp() ?? 'unknown';
                $userAgent = $request->header('User-Agent');

                $loginRecord = UserLoginHistory::recordLogin($user->id, $ipAddress, $userAgent);

                if ($loginRecord && $loginRecord->is_new_device) {
                    $this->enterpriseNotificationService->notifyNewDeviceFromHistory($user->id, $loginRecord);
                } elseif ($loginRecord && $loginRecord->is_suspicious) {
                    $this->enterpriseNotificationService->notifySuspiciousLoginActivity($user->id, 'Unusual login pattern detected', $loginRecord->city ?? $loginRecord->country);
                } elseif ($loginRecord) {
                    // Regular login notification (can be disabled by user preferences)
                    $this->enterpriseNotificationService->notifyNewLoginFromHistory($user->id, $loginRecord);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to record login or send notification', ['error' => $e->getMessage()]);
            }
        }

        // Build user data
        $userData = [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'language' => $user->language,
            'role' => $user->role,
            'is_verified' => $user->is_verified,
        ];

        // Include driver-specific fields in login response
        if ($user->role === 'driver') {
            $user->load('assignedZone:id,name,name_ar');
            $userData['is_available'] = (bool) $user->is_available;
            $userData['current_lat'] = $user->current_lat;
            $userData['current_lng'] = $user->current_lng;
            $userData['assigned_zone_id'] = $user->assigned_zone_id;
            $userData['vehicle_type'] = $user->vehicle_type;
            $userData['vehicle_plate'] = $user->vehicle_plate;
            $userData['total_deliveries'] = (int) ($user->total_deliveries ?? 0);
            $userData['average_rating'] = $user->average_rating;
            $userData['assigned_zone'] = $user->assignedZone;
        }

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data' => [
                'user' => $userData,
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type' => 'Bearer',
                'expires_in' => $rememberMe ? 604800 : 86400, // 7 days or 24 hours in seconds
            ],
        ]);
    }

    /**
     * Refresh access token.
     */
    public function refreshToken(RefreshTokenRequest $request): JsonResponse
    {
        // Parse the refresh token to get token ID
        $tokenParts = explode('|', $request->refresh_token);

        if (count($tokenParts) !== 2) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid token format.',
            ], 401);
        }

        $tokenId = $tokenParts[0];
        $token = \Laravel\Sanctum\PersonalAccessToken::find($tokenId);

        if (!$token || !$token->can('refresh') || $token->expires_at < Carbon::now()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired refresh token.',
            ], 401);
        }

        $user = $token->tokenable;

        // Check if the refresh token was created with remember_me
        $wasRemembered = $token->can('remember');

        // Revoke old tokens
        $user->tokens()->delete();

        // Create new tokens - preserve remember_me setting from original login
        $accessTokenExpiry = $wasRemembered ? Carbon::now()->addDays(7) : Carbon::now()->addHours(24);
        $accessToken = $user->createToken('access_token', ['*'], $accessTokenExpiry)->plainTextToken;

        $refreshTokenExpiry = $wasRemembered ? Carbon::now()->addDays(90) : Carbon::now()->addDays(30);
        $refreshToken = $user->createToken('refresh_token', ['refresh', $wasRemembered ? 'remember' : 'standard'], $refreshTokenExpiry)->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Token refreshed successfully.',
            'data' => [
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type' => 'Bearer',
                'expires_in' => $wasRemembered ? 604800 : 86400, // 7 days or 24 hours
            ],
        ]);
    }

    /**
     * Get authenticated user profile.
     * Endpoint #8 from apis.md: GET /api/v1/profile
     */
    public function getProfile(): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $data = [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'full_name' => $user->first_name . ' ' . $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'date_of_birth' => $user->date_of_birth?->format('Y-m-d'),
            'gender' => $user->gender,
            'avatar' => $user->avatar,
            'language' => $user->language,
            'role' => $user->role,
            'is_verified' => $user->is_verified,
            'is_social_only' => $user->is_social_only,
            'has_google' => !empty($user->google_id),
            'has_apple' => !empty($user->apple_id),
            'email_verified_at' => $user->email_verified_at,
            'phone_verified_at' => $user->phone_verified_at,
            'registration_source' => $user->registration_source,
            'created_at' => $user->created_at,
        ];

        // Include driver-specific fields
        if ($user->role === 'driver') {
            $user->load('assignedZone:id,name,name_ar');
            $data['is_available'] = (bool) $user->is_available;
            $data['current_lat'] = $user->current_lat;
            $data['current_lng'] = $user->current_lng;
            $data['assigned_zone_id'] = $user->assigned_zone_id;
            $data['vehicle_type'] = $user->vehicle_type;
            $data['vehicle_plate'] = $user->vehicle_plate;
            $data['total_deliveries'] = (int) ($user->total_deliveries ?? 0);
            $data['average_rating'] = $user->average_rating;
            $data['assigned_zone'] = $user->assignedZone;
            // Calculate real stats from orders
            $data['statistics'] = [
                'total_orders' => \App\Models\Order::where('driver_id', $user->id)->count(),
                'completed_orders' => \App\Models\Order::where('driver_id', $user->id)->where('status', 'delivered')->count(),
                'total_earnings' => (float) \App\Models\Order::where('driver_id', $user->id)->where('status', 'delivered')->sum('delivery_fee'),
            ];
        } else {
            $data['statistics'] = [
                'total_orders' => \App\Models\Order::where('user_id', $user->id)->count(),
                'completed_orders' => \App\Models\Order::where('user_id', $user->id)->where('status', 'delivered')->count(),
                'total_spent' => (float) \App\Models\Order::where('user_id', $user->id)->where('status', 'delivered')->sum('total'),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Logout user.
     */
    public function logout(): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();
        $user->tokens()->delete();

        // Log logout activity
        ActivityLog::log('user_logged_out', $user->id, 'User', $user->id);

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Send password reset OTP.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        // Check if user's email is verified
        if (!$user->email_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Your email is not verified. Please verify your email first before resetting your password.',
                'requires_verification' => true,
            ], 403);
        }

        $otp = $this->otpService->createPasswordResetOtp($user->email);
        $this->otpService->sendEmail($user->email, $otp->otp, 'Password Reset');

        return response()->json([
            'success' => true,
            'message' => 'Password reset OTP sent to your email.',
        ]);
    }

    /**
     * Verify reset password OTP without changing password.
     */
    public function verifyResetOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'otp' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $otpRecord = $this->otpService->verify(
            $request->email,
            $request->otp,
            'password_reset'
        );

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired OTP.',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'OTP verified successfully.',
        ]);
    }

    /**
     * Reset password with OTP.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $otpRecord = $this->otpService->verify(
            $request->email,
            $request->otp,
            'password_reset'
        );

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired OTP.',
            ], 400);
        }

        $user = User::where('email', $request->email)->first();
        $user->update([
            'password' => Hash::make($request->password),
        ]);

        $otpRecord->markAsUsed();

        // Log password change activity
        ActivityLog::log('password_changed', $user->id, 'User', $user->id);

        // Revoke all existing tokens
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully.',
        ]);
    }

    /**
     * Update authenticated user profile.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validated();

        // ─── EMAIL PROTECTION ────────────────────────────────────────────
        // Email changes are NEVER allowed through the regular profile update.
        // • Social-only users: email is permanently read-only.
        // • Password users: must use the dedicated POST /profile/request-email-change flow.
        if (isset($data['email']) && strtolower($data['email']) !== strtolower($user->email)) {
            return response()->json([
                'success' => false,
                'message' => 'Email cannot be changed through profile update. Use the dedicated email change flow.',
                'error_code' => 'EMAIL_CHANGE_NOT_ALLOWED',
            ], 403);
        }
        // Strip email from payload even if unchanged (defence-in-depth)
        unset($data['email']);

        // Update full_name if first_name or last_name changed
        if (isset($data['first_name']) || isset($data['last_name'])) {
            $firstName = $data['first_name'] ?? $user->first_name;
            $lastName = $data['last_name'] ?? $user->last_name;
            $data['full_name'] = $firstName . ' ' . $lastName;
        }

        $user->update($data);

        ActivityLog::log('profile_updated', $user->id, 'User', $user->id);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'date_of_birth' => $user->date_of_birth,
                    'gender' => $user->gender,
                    'avatar' => $user->avatar,
                    'language' => $user->language,
                    'is_social_only' => (bool) $user->is_social_only,
                    'has_google' => !empty($user->google_id),
                    'has_apple' => !empty($user->apple_id),
                    'email_verified_at' => $user->email_verified_at,
                    'registration_source' => $user->registration_source,
                    'is_verified' => $user->is_verified,
                ],
            ],
        ]);
    }

    /**
     * Upload user avatar.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048|dimensions:min_width=100,min_height=100',
        ]);

        $user = $request->user();
        $cloudinary = new CloudinaryService();

        // Delete old avatar from Cloudinary if exists
        if ($user->avatar) {
            $oldPublicId = $cloudinary->getPublicIdFromUrl($user->avatar);
            if ($oldPublicId) {
                $cloudinary->deleteImage($oldPublicId);
            }
        }

        // Upload to Cloudinary
        $result = $cloudinary->uploadImage(
            $request->file('avatar'),
            'avatars',
            ['public_id' => 'user_' . $user->id . '_' . time()]
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload avatar',
            ], 500);
        }

        $user->update(['avatar' => $result['url']]);

        ActivityLog::log('avatar_uploaded', $user->id, 'User', $user->id);

        return response()->json([
            'success' => true,
            'message' => 'Avatar uploaded successfully',
            'data' => [
                'avatar_url' => $result['url'],
            ],
        ]);
    }

    /**
     * Delete user avatar.
     */
    public function deleteAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        $cloudinary = new CloudinaryService();

        // Delete from Cloudinary if exists
        if ($user->avatar) {
            $publicId = $cloudinary->getPublicIdFromUrl($user->avatar);
            if ($publicId) {
                $cloudinary->deleteImage($publicId);
            }
        }

        $user->update(['avatar' => null]);

        ActivityLog::log('avatar_deleted', $user->id, 'User', $user->id);

        return response()->json([
            'success' => true,
            'message' => 'Avatar deleted successfully',
        ]);
    }

    /**
     * Change user password.
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        // Revoke all existing tokens except current
        $currentToken = $user->currentAccessToken();
        $user->tokens()->where('id', '!=', $currentToken->id)->delete();

        ActivityLog::log('password_changed', $user->id, 'User', $user->id);

        // Send security notification for password change
        if ($this->enterpriseNotificationService) {
            try {
                $this->enterpriseNotificationService->notifyPasswordChanged($user->id);
            } catch (\Exception $e) {
                Log::warning('Failed to send password change notification', ['error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
        ]);
    }

    /**
     * Resend OTP for email verification.
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        // Only allow resending OTP for unverified users
        if ($user->is_verified) {
            return response()->json([
                'success' => false,
                'message' => 'Email is already verified.',
            ], 400);
        }

        // Generate and send new OTP
        $otp = $this->otpService->createEmailVerificationOtp($user->email);
        $this->otpService->sendEmail($user->email, $otp->otp, 'Email Verification');

        return response()->json([
            'success' => true,
            'message' => 'OTP has been resent to your email.',
        ]);
    }

    /**
     * Check if email is available.
     */
    public function checkEmail(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if email exists and is verified
        $user = User::where('email', $request->email)->first();

        if ($user && $user->is_verified) {
            return response()->json([
                'success' => false,
                'message' => 'Email already exists',
                'errors' => [
                    'email' => ['The email has already been taken.'],
                ],
            ], 422);
        }

        // If user exists but not verified, it's okay (they can re-register)
        return response()->json([
            'success' => true,
            'message' => 'Email is available',
        ]);
    }

    /**
     * Check if phone is available.
     */
    public function checkPhone(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if phone exists and is verified
        $user = User::where('phone', $request->phone)->first();

        if ($user && $user->is_verified) {
            return response()->json([
                'success' => false,
                'message' => 'Phone number already exists',
                'errors' => [
                    'phone' => ['The phone number has already been taken.'],
                ],
            ], 422);
        }

        // If user exists but not verified, it's okay (they can re-register)
        return response()->json([
            'success' => true,
            'message' => 'Phone number is available',
        ]);
    }

    /**
     * Confirm user password for sensitive actions.
     * POST /api/v1/auth/confirm-password
     */
    public function confirmPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password',
                'errors' => [
                    'password' => ['The provided password is incorrect.'],
                ],
            ], 401);
        }

        // Store password confirmation timestamp in session
        $request->session()->put('auth.password_confirmed_at', now());

        return response()->json([
            'success' => true,
            'message' => 'Password confirmed successfully',
            'data' => [
                'confirmed_at' => now()->toISOString(),
                'valid_for_minutes' => 30,
            ],
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CHANGE EMAIL – Enterprise-grade verified flow
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Step 1: Request an email change.
     * Validates current password, checks the new email is unique,
     * then sends a 6-digit OTP to the NEW email.
     *
     * POST /api/v1/profile/request-email-change
     */
    public function requestEmailChange(Request $request): JsonResponse
    {
        // ── Social-only guard ──────────────────────────────────────────
        $user = $request->user();

        if ($user->is_social_only) {
            return response()->json([
                'success' => false,
                'message' => 'Social-only accounts cannot change their email address.',
                'error_code' => 'SOCIAL_ONLY_EMAIL_LOCKED',
            ], 403);
        }

        // ── Validation ─────────────────────────────────────────────────
        $validator = Validator::make($request->all(), [
            'new_email' => [
                'required',
                'email',
                'max:255',
                'different:current_email',
                \Illuminate\Validation\Rule::unique('users', 'email')->ignore($user->id),
            ],
            'current_password' => 'required|string',
        ], [
            'new_email.required'  => 'New email address is required.',
            'new_email.email'     => 'Please provide a valid email address.',
            'new_email.unique'    => 'This email address is already in use.',
            'new_email.different' => 'New email must be different from your current email.',
            'current_password.required' => 'Current password is required for security.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // ── Password re-authentication ─────────────────────────────────
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password.',
                'errors' => ['current_password' => ['The provided password is incorrect.']],
            ], 401);
        }

        // ── Rate-limit: max 3 OTPs per hour per user ──────────────────
        $recentOtps = \App\Models\Otp::where('identifier', strtolower($request->new_email))
            ->where('type', 'email_change')
            ->where('created_at', '>=', Carbon::now()->subHour())
            ->count();

        if ($recentOtps >= 3) {
            return response()->json([
                'success' => false,
                'message' => 'Too many email change requests. Please try again later.',
                'error_code' => 'EMAIL_CHANGE_RATE_LIMITED',
            ], 429);
        }

        // ── Send OTP to the new email ──────────────────────────────────
        $newEmail = strtolower(trim($request->new_email));
        $otp = $this->otpService->createEmailChangeOtp($newEmail);
        $this->otpService->sendEmail($newEmail, $otp->otp, 'Email Change Verification');

        ActivityLog::log('email_change_requested', $user->id, 'User', $user->id);

        return response()->json([
            'success' => true,
            'message' => 'Verification code sent to your new email address.',
            'data' => [
                'new_email' => $newEmail,
                'expires_in_minutes' => 10,
            ],
        ]);
    }

    /**
     * Step 2: Verify OTP and apply the email change.
     * Checks the OTP sent to the new email, then atomically updates the user's email.
     *
     * POST /api/v1/profile/verify-email-change
     */
    public function verifyEmailChange(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->is_social_only) {
            return response()->json([
                'success' => false,
                'message' => 'Social-only accounts cannot change their email address.',
                'error_code' => 'SOCIAL_ONLY_EMAIL_LOCKED',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'new_email' => 'required|email|max:255',
            'otp'       => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $newEmail = strtolower(trim($request->new_email));

        // ── Verify OTP ────────────────────────────────────────────────
        $otpRecord = $this->otpService->verify($newEmail, $request->otp, 'email_change');

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired verification code.',
                'error_code' => 'INVALID_OTP',
            ], 400);
        }

        // ── Re-check uniqueness right before writing ──────────────────
        $emailTaken = User::where('email', $newEmail)
            ->where('id', '!=', $user->id)
            ->exists();

        if ($emailTaken) {
            return response()->json([
                'success' => false,
                'message' => 'This email address is already in use.',
                'error_code' => 'EMAIL_ALREADY_TAKEN',
            ], 409);
        }

        // ── Apply change atomically ───────────────────────────────────
        $oldEmail = $user->email;
        $user->update([
            'email'             => $newEmail,
            'email_verified_at' => Carbon::now(), // new email is verified by OTP
        ]);

        $otpRecord->markAsUsed();

        ActivityLog::log('email_changed', $user->id, 'User', $user->id, [
            'old_email' => $oldEmail,
            'new_email' => $newEmail,
        ]);

        Log::info("User #{$user->id} changed email from {$oldEmail} to {$newEmail}");

        return response()->json([
            'success' => true,
            'message' => 'Email changed successfully.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'date_of_birth' => $user->date_of_birth,
                    'gender' => $user->gender,
                    'avatar' => $user->avatar,
                    'language' => $user->language,
                    'is_social_only' => (bool) $user->is_social_only,
                    'has_google' => !empty($user->google_id),
                    'has_apple' => !empty($user->apple_id),
                    'email_verified_at' => $user->email_verified_at,
                    'registration_source' => $user->registration_source,
                    'is_verified' => $user->is_verified,
                ],
            ],
        ]);
    }

    /**
     * Delete user account permanently (API — authenticated user).
     */
    public function deleteAccount(Request $request): JsonResponse
    {
        $user = $request->user();

        // Password confirmation required for non-social-only accounts
        if (!$user->is_social_only) {
            $validator = Validator::make($request->all(), [
                'password' => 'required|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Password is required to delete your account.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            if (!Hash::check($request->password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Incorrect password. Please try again.',
                    'error_code' => 'INVALID_PASSWORD',
                ], 401);
            }
        }

        // Check for active orders (not delivered/cancelled)
        $activeOrders = $user->orders()
            ->whereNotIn('status', ['delivered', 'cancelled', 'refunded'])
            ->count();

        if ($activeOrders > 0) {
            return response()->json([
                'success' => false,
                'message' => 'You have active orders. Please wait for all orders to be completed or cancelled before deleting your account.',
                'error_code' => 'ACTIVE_ORDERS_EXIST',
                'data' => ['active_orders_count' => $activeOrders],
            ], 409);
        }

        try {
            DB::beginTransaction();

            $userId = $user->id;
            $userEmail = $user->email;

            // Revoke all API tokens
            $user->tokens()->delete();

            // Delete personal data and related records
            // 1. Addresses
            $user->addresses()->delete();

            // 2. Favorites / Wishlist
            $user->favorites()->delete();

            // 3. Notification preferences & notifications
            $user->notificationPreferences()->delete();
            $user->notifications()->delete();

            // 4. Complaints and complaint messages
            $user->complaintMessages()->delete();
            $user->complaints()->delete();

            // 5. Cart items
            DB::table('carts')->where('user_id', $userId)->delete();
            DB::table('cart_reminders')->where('user_id', $userId)->delete();

            // 6. Login history
            UserLoginHistory::where('user_id', $userId)->delete();

            // 7. Wallet (delete balance)
            $user->wallet()->delete();

            // 8. Customer notes
            $user->notes()->delete();

            // 9. Activity logs referencing this user
            ActivityLog::where('user_id', $userId)->delete();

            // 10. Reviews — anonymize instead of deleting (retain for product integrity)
            DB::table('reviews')->where('user_id', $userId)->update([
                'user_id' => null,
                'updated_at' => now(),
            ]);

            // 11. Orders — anonymize but retain for financial/tax compliance
            DB::table('orders')->where('user_id', $userId)->update([
                'user_id' => null,
                'updated_at' => now(),
            ]);

            // 12. Delete the user record permanently
            $user->forceDelete();

            DB::commit();

            // Log the deletion (without PII)
            Log::info("Account deleted: user #{$userId}, email hash: " . hash('sha256', $userEmail));

            return response()->json([
                'success' => true,
                'message' => 'Your account and all personal data have been permanently deleted.',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Account deletion failed for user #{$user->id}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while deleting your account. Please try again or contact support.',
                'error_code' => 'DELETION_FAILED',
            ], 500);
        }
    }

    /**
     * Delete user account via web form (unauthenticated — email + password verification).
     */
    public function deleteAccountWeb(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
            'reason' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a valid email address and password.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::where('email', strtolower(trim($request->email)))
            ->where('role', 'customer')
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No account found with this email address.',
                'error_code' => 'USER_NOT_FOUND',
            ], 404);
        }

        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password. Please try again.',
                'error_code' => 'INVALID_PASSWORD',
            ], 401);
        }

        // Check for active orders
        $activeOrders = $user->orders()
            ->whereNotIn('status', ['delivered', 'cancelled', 'refunded'])
            ->count();

        if ($activeOrders > 0) {
            return response()->json([
                'success' => false,
                'message' => 'This account has active orders. Please wait for all orders to be completed or cancelled before requesting deletion.',
                'error_code' => 'ACTIVE_ORDERS_EXIST',
            ], 409);
        }

        try {
            DB::beginTransaction();

            $userId = $user->id;
            $userEmail = $user->email;
            $reason = $request->reason;

            // Revoke all API tokens
            $user->tokens()->delete();

            // Delete personal data (same as API method)
            $user->addresses()->delete();
            $user->favorites()->delete();
            $user->notificationPreferences()->delete();
            $user->notifications()->delete();
            $user->complaintMessages()->delete();
            $user->complaints()->delete();
            DB::table('carts')->where('user_id', $userId)->delete();
            DB::table('cart_reminders')->where('user_id', $userId)->delete();
            UserLoginHistory::where('user_id', $userId)->delete();
            $user->wallet()->delete();
            $user->notes()->delete();
            ActivityLog::where('user_id', $userId)->delete();

            // Anonymize reviews and orders
            DB::table('reviews')->where('user_id', $userId)->update([
                'user_id' => null,
                'updated_at' => now(),
            ]);
            DB::table('orders')->where('user_id', $userId)->update([
                'user_id' => null,
                'updated_at' => now(),
            ]);

            // Delete user permanently
            $user->forceDelete();

            DB::commit();

            Log::info("Web account deletion: user #{$userId}, email hash: " . hash('sha256', $userEmail) . ", reason: " . ($reason ?? 'none'));

            return response()->json([
                'success' => true,
                'message' => 'Your account and all personal data have been permanently deleted.',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Web account deletion failed: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while deleting your account. Please try again or contact support at support@cartshop.site.',
                'error_code' => 'DELETION_FAILED',
            ], 500);
        }
    }
}
