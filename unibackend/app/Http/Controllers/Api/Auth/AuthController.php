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
use App\Services\OtpService;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

    public function __construct(OtpService $otpService, CartService $cartService)
    {
        $this->otpService = $otpService;
        $this->cartService = $cartService;
    }

    /**
     * Register a new user.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
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

        // Create tokens
        $accessToken = $user->createToken('access_token', ['*'], Carbon::now()->addMinutes(30))->plainTextToken;
        $refreshToken = $user->createToken('refresh_token', ['refresh'], Carbon::now()->addDays(30))->plainTextToken;

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
                'expires_in' => 1800, // 30 minutes in seconds
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

        // Create new tokens
        $accessToken = $user->createToken('access_token', ['*'], Carbon::now()->addMinutes(30))->plainTextToken;
        $refreshToken = $user->createToken('refresh_token', ['refresh'], Carbon::now()->addDays(30))->plainTextToken;

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

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
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
                'expires_in' => 1800, // 30 minutes in seconds
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

        // Revoke old tokens
        $user->tokens()->delete();

        // Create new tokens
        $accessToken = $user->createToken('access_token', ['*'], Carbon::now()->addMinutes(30))->plainTextToken;
        $refreshToken = $user->createToken('refresh_token', ['refresh'], Carbon::now()->addDays(30))->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Token refreshed successfully.',
            'data' => [
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type' => 'Bearer',
                'expires_in' => 1800,
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

        // TODO: Calculate statistics when order system is implemented
        $statistics = [
            'total_orders' => 0,
            'completed_orders' => 0,
            'total_spent' => 0.0,
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'language' => $user->language,
                'is_verified' => $user->is_verified,
                'created_at' => $user->created_at,
                'statistics' => $statistics,
            ],
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
}
