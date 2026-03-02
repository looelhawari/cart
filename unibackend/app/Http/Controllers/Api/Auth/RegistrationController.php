<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use App\Services\OtpService;
use App\Services\PendingRegistrationService;
use App\Services\PushNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Carbon\Carbon;

/**
 * Enterprise-grade registration controller — deferred insertion pattern.
 *
 * No user record is created until OTP verification succeeds.
 * Registration data lives in pending_registrations (DB) + Redis (cache).
 *
 * Flow:
 *   POST /auth/register/step1   →  validate info, create/update pending record
 *   POST /auth/register/step2   →  set password, send OTP
 *   POST /auth/register/verify  →  verify OTP, atomically create user
 *   POST /auth/register/resend-otp → resend OTP
 *
 * Edit flow (user goes back from OTP step):
 *   POST /auth/register/step1 with registration_token
 *     → updates pending record
 *     → if email changed, sends new OTP
 *     → frontend skips step 2 (password already set)
 */
class RegistrationController extends Controller
{
    protected PendingRegistrationService $pendingService;
    protected OtpService $otpService;

    public function __construct(
        PendingRegistrationService $pendingService,
        OtpService $otpService
    ) {
        $this->pendingService = $pendingService;
        $this->otpService = $otpService;
    }

    /**
     * Step 1: Validate personal info and create/update pending registration.
     *
     * If registration_token is provided and valid, updates the existing
     * pending record (user went back to edit). If the email changed and
     * the user had already received an OTP, a new OTP is sent automatically.
     */
    public function step1(Request $request): JsonResponse
    {
        $request->validate([
            'first_name'         => 'required|string|max:255',
            'last_name'          => 'required|string|max:255',
            'email'              => 'required|email:rfc,dns|max:255',
            'phone'              => 'required|string|regex:/^\+?[0-9]{10,15}$/',
            'language'           => 'required|in:en,ar',
            'registration_token' => 'sometimes|nullable|uuid',
        ]);

        $email = strtolower(trim($request->email));
        $phone = preg_replace('/[^0-9+]/', '', $request->phone);

        // ── Uniqueness checks (verified users only) ──────────────
        $emailTaken = User::where('email', $email)
            ->where('is_verified', true)
            ->exists();

        if ($emailTaken) {
            return response()->json([
                'success' => false,
                'message' => __('auth.email_already_exists'),
                'errors'  => ['email' => [__('auth.email_already_exists')]],
            ], 422);
        }

        $phoneTaken = User::where('phone', $phone)
            ->where('is_verified', true)
            ->exists();

        if ($phoneTaken) {
            return response()->json([
                'success' => false,
                'message' => __('auth.phone_already_exists'),
                'errors'  => ['phone' => [__('auth.phone_already_exists')]],
            ], 422);
        }

        // ── Create or update pending record ──────────────────────
        $token     = $request->registration_token;
        $pending   = null;
        $otpResent = false;

        if ($token) {
            $pending = $this->pendingService->find($token);
        }

        if ($pending) {
            // Update existing pending registration
            $oldEmail = $pending->email;

            $pending = $this->pendingService->update($token, [
                'first_name' => strip_tags(trim($request->first_name)),
                'last_name'  => strip_tags(trim($request->last_name)),
                'email'      => $email,
                'phone'      => $phone,
                'language'   => $request->language,
            ]);

            // If email changed and OTP was already sent, re-send to new email
            if ($pending->status === 'otp_sent' && $oldEmail !== $email) {
                $otp = $this->otpService->createEmailVerificationOtp($email);
                $this->otpService->sendEmail($email, $otp->otp, 'Email Verification');
                $otpResent = true;
            }
        } else {
            // Create new pending registration
            $token   = (string) Str::uuid();
            $pending = $this->pendingService->create([
                'registration_token' => $token,
                'first_name'         => strip_tags(trim($request->first_name)),
                'last_name'          => strip_tags(trim($request->last_name)),
                'email'              => $email,
                'phone'              => $phone,
                'language'           => $request->language,
                'status'             => 'step1',
                'expires_at'         => now()->addMinutes(30),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Step 1 completed.',
            'data'    => [
                'registration_token' => $token,
                'step_completed'     => $pending->status,
                'password_set'       => $pending->hasPassword(),
                'otp_resent'         => $otpResent,
            ],
        ]);
    }

    /**
     * Step 2: Set password and send OTP to email.
     */
    public function step2(Request $request): JsonResponse
    {
        $request->validate([
            'registration_token' => 'required|uuid',
            'password'           => [
                'required', 'string', 'confirmed',
                Password::min(8)->mixedCase()->numbers()->symbols()->uncompromised(),
            ],
        ]);

        $pending = $this->pendingService->find($request->registration_token);

        if (!$pending) {
            return response()->json([
                'success' => false,
                'message' => 'Registration session expired. Please start over.',
            ], 410);
        }

        // Update password hash and status
        $this->pendingService->update($request->registration_token, [
            'password_hash' => Hash::make($request->password),
            'status'        => 'otp_sent',
        ]);

        // Generate and send OTP
        $otp  = $this->otpService->createEmailVerificationOtp($pending->email);
        $sent = $this->otpService->sendEmail($pending->email, $otp->otp, 'Email Verification');

        if (!$sent) {
            Log::error("Failed to send registration OTP email to {$pending->email}");
        }

        return response()->json([
            'success' => true,
            'message' => 'Password set. OTP sent to your email.',
            'data'    => [
                'email_sent' => $sent,
            ],
        ]);
    }

    /**
     * Verify OTP and atomically create the user record.
     *
     * This is the ONLY place a user record is created in the new flow.
     * Protected by a DB transaction + unique constraints.
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'registration_token' => 'required|uuid',
            'otp'                => 'required|string|size:6',
        ]);

        $pending = $this->pendingService->find($request->registration_token);

        if (!$pending) {
            return response()->json([
                'success' => false,
                'message' => 'Registration session expired. Please start over.',
            ], 410);
        }

        if ($pending->status !== 'otp_sent') {
            return response()->json([
                'success' => false,
                'message' => 'Please complete all registration steps first.',
            ], 400);
        }

        // Verify OTP
        $otpRecord = $this->otpService->verify(
            $pending->email,
            $request->otp,
            'email_verification'
        );

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => __('auth.invalid_or_expired_otp'),
            ], 400);
        }

        // ── Atomic: create user + cleanup ────────────────────────
        /** @var User $user */
        $user = null;

        try {
            DB::transaction(function () use ($pending, $otpRecord, &$user) {
                $user = User::create([
                    'first_name'        => $pending->first_name,
                    'last_name'         => $pending->last_name,
                    'email'             => $pending->email,
                    'phone'             => $pending->phone,
                    'password'          => $pending->password_hash, // Already hashed
                    'language'          => $pending->language,
                    'role'              => 'customer',
                    'is_active'         => true,
                    'is_verified'       => true,
                    'email_verified_at' => Carbon::now(),
                ]);

                $otpRecord->markAsUsed();
                $this->pendingService->delete($pending->registration_token);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Duplicate key — another registration completed first
            if ($e->getCode() === '23000') {
                // Clean up our pending record since it's now useless
                $this->pendingService->delete($pending->registration_token);

                return response()->json([
                    'success' => false,
                    'message' => 'This email or phone number has already been registered. Please log in.',
                ], 409);
            }
            throw $e;
        }

        // Safety check (should never happen if transaction succeeded)
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Registration failed. Please try again.',
            ], 500);
        }

        // ── Post-registration tasks ──────────────────────────────

        // Log activity
        ActivityLog::log('user_registered', $user->id, 'User', $user->id, [
            'email' => $user->email,
            'phone' => $user->phone,
        ]);

        // Send welcome notification
        try {
            app(PushNotificationService::class)
                ->sendWelcomeNotification($user->id, $user->first_name);
        } catch (\Exception $e) {
            Log::warning("Failed to send welcome notification: {$e->getMessage()}");
        }

        // Create tokens (same logic as AuthController::verifyEmail)
        $accessToken  = $user->createToken(
            'access_token', ['*'], Carbon::now()->addHours(24)
        )->plainTextToken;

        $refreshToken = $user->createToken(
            'refresh_token', ['refresh', 'standard'], Carbon::now()->addDays(30)
        )->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => __('auth.email_verified_successfully'),
            'data'    => [
                'user' => [
                    'id'          => $user->id,
                    'first_name'  => $user->first_name,
                    'last_name'   => $user->last_name,
                    'full_name'   => $user->full_name,
                    'email'       => $user->email,
                    'phone'       => $user->phone,
                    'avatar'      => $user->avatar,
                    'language'    => $user->language,
                    'role'        => $user->role,
                    'is_verified' => $user->is_verified,
                ],
                'access_token'  => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type'    => 'Bearer',
                'expires_in'    => 86400, // 24 hours
            ],
        ]);
    }

    /**
     * Resend OTP for a pending registration.
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $request->validate([
            'registration_token' => 'required|uuid',
        ]);

        $pending = $this->pendingService->find($request->registration_token);

        if (!$pending) {
            return response()->json([
                'success' => false,
                'message' => 'Registration session expired. Please start over.',
            ], 410);
        }

        if ($pending->status !== 'otp_sent') {
            return response()->json([
                'success' => false,
                'message' => 'Please complete all registration steps first.',
            ], 400);
        }

        $otp  = $this->otpService->createEmailVerificationOtp($pending->email);
        $sent = $this->otpService->sendEmail($pending->email, $otp->otp, 'Email Verification');

        if (!$sent) {
            return response()->json([
                'success' => false,
                'message' => __('auth.otp_email_failed_resend'),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => __('auth.otp_resent'),
        ]);
    }
}
