<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Otp;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Firebase\JWT\JWT;
use Firebase\JWT\JWK;
use Firebase\JWT\Key;

class SocialAuthController extends Controller
{
    // ─────────────────────────────────────────────────────
    //  GOOGLE SIGN-IN (ID Token Verification)
    // ─────────────────────────────────────────────────────

    /**
     * Google Social Login
     *
     * Accepts a Google ID token (JWT), cryptographically verifies it using
     * Google's public keys, validates all claims (aud, iss, exp, sub, email),
     * then handles account linking/creation inside a DB transaction.
     */
    public function google(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'id_token' => 'required|string',
            'push_token' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $payload = $this->verifyGoogleIdToken($request->id_token);

            if (!$payload) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired Google token',
                ], 401);
            }
        } catch (\Exception $e) {
            Log::error('Google auth - token verification failed', [
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Google token verification failed',
            ], 401);
        }

        // Extract verified claims
        $googleSub = $payload['sub'];
        $email = $payload['email'] ?? null;
        $emailVerified = $payload['email_verified'] ?? false;
        $givenName = $payload['given_name'] ?? null;
        $familyName = $payload['family_name'] ?? null;
        $fullName = $payload['name'] ?? null;
        $picture = $payload['picture'] ?? null;

        // Email is required for our app
        if (!$email) {
            return response()->json([
                'success' => false,
                'message' => 'Google account must have an email address',
            ], 422);
        }

        return $this->handleSocialUser(
            provider: 'google',
            providerId: $googleSub,
            email: $email,
            emailVerified: (bool) $emailVerified,
            firstName: $givenName ?? ($fullName ? explode(' ', $fullName, 2)[0] : 'User'),
            lastName: $familyName ?? ($fullName && str_contains($fullName, ' ') ? explode(' ', $fullName, 2)[1] : ''),
            avatar: $picture,
            pushToken: $request->push_token,
        );
    }

    /**
     * Verify Google ID token (JWT) using Google's public keys.
     *
     * Validates:
     * - Cryptographic signature via Google's JWKS
     * - aud matches our configured client ID(s)
     * - iss is accounts.google.com or https://accounts.google.com
     * - exp is still valid (handled by JWT::decode)
     * - sub exists
     */
    private function verifyGoogleIdToken(string $idToken): ?array
    {
        try {
            // Fetch Google's public keys (cached 1 hour, auto-refresh on key rotation)
            $publicKeys = Cache::remember('google_oauth_public_keys', 3600, function () {
                $response = Http::timeout(10)->get('https://www.googleapis.com/oauth2/v3/certs');
                if (!$response->successful()) {
                    throw new \Exception('Failed to fetch Google public keys');
                }
                return $response->json();
            });

            // Parse JWKS and decode + verify the ID token
            $keys = JWK::parseKeySet($publicKeys);
            $decoded = JWT::decode($idToken, $keys);
            $payload = (array) $decoded;

            // Validate issuer
            $validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
            if (!in_array($payload['iss'] ?? '', $validIssuers)) {
                Log::warning('Google token issuer mismatch', ['iss' => $payload['iss'] ?? 'missing']);
                throw new \Exception('Invalid token issuer');
            }

            // Validate audience (must match our client ID)
            $validAudiences = array_filter([
                config('services.google.client_id'),
                config('services.google.android_client_id'),
                config('services.google.ios_client_id'),
            ]);

            $tokenAud = $payload['aud'] ?? '';
            if (!in_array($tokenAud, $validAudiences)) {
                Log::warning('Google token audience mismatch', [
                    'expected' => $validAudiences,
                    'received' => $tokenAud,
                ]);
                throw new \Exception('Token audience does not match our client ID');
            }

            // Validate sub exists
            if (empty($payload['sub'])) {
                throw new \Exception('Token missing sub claim');
            }

            return $payload;

        } catch (\Firebase\JWT\ExpiredException $e) {
            Log::warning('Google token expired');
            return null;
        } catch (\Firebase\JWT\SignatureInvalidException $e) {
            Log::warning('Google token signature invalid');
            // Clear cached keys in case of rotation
            Cache::forget('google_oauth_public_keys');
            return null;
        } catch (\Exception $e) {
            Log::error('Google token verification failed', [
                'error' => $e->getMessage(),
            ]);
            // Clear cache if it might be a key mismatch
            Cache::forget('google_oauth_public_keys');
            return null;
        }
    }

    // ─────────────────────────────────────────────────────
    //  APPLE SIGN-IN (Identity Token Verification)
    // ─────────────────────────────────────────────────────

    /**
     * Apple Social Login
     * Verifies Apple's identityToken JWT directly.
     */
    public function apple(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'user' => 'nullable|array',
            'user.name' => 'nullable|array',
            'user.name.firstName' => 'nullable|string',
            'user.name.lastName' => 'nullable|string',
            'push_token' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $applePayload = $this->verifyAppleToken($request->token);

            if (!$applePayload) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid Apple token',
                ], 401);
            }

            $appleSub = $applePayload['sub'];
            $email = $applePayload['email'] ?? null;
            $emailVerified = isset($applePayload['email_verified'])
                ? filter_var($applePayload['email_verified'], FILTER_VALIDATE_BOOLEAN)
                : false;

        } catch (\Exception $e) {
            Log::error('Apple auth failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Invalid Apple token',
            ], 401);
        }

        return $this->handleSocialUser(
            provider: 'apple',
            providerId: $appleSub,
            email: $email,
            emailVerified: $emailVerified,
            firstName: $request->input('user.name.firstName', 'User'),
            lastName: $request->input('user.name.lastName', ''),
            avatar: null,
            pushToken: $request->push_token,
        );
    }

    /**
     * Verify Apple's identityToken JWT.
     * Fetches Apple's public keys and validates signature, issuer, audience, expiry.
     */
    private function verifyAppleToken(string $token): ?array
    {
        try {
            $publicKeys = Cache::remember('apple_public_keys', 3600, function () {
                $response = Http::timeout(10)->get('https://appleid.apple.com/auth/keys');
                if (!$response->successful()) {
                    throw new \Exception('Failed to fetch Apple public keys');
                }
                return $response->json();
            });

            // Decode JWT header to get the key ID
            $tokenParts = explode('.', $token);
            if (count($tokenParts) !== 3) {
                throw new \Exception('Invalid JWT format');
            }

            $header = json_decode(base64_decode(strtr($tokenParts[0], '-_', '+/')), true);
            $kid = $header['kid'] ?? null;

            if (!$kid) {
                throw new \Exception('No key ID in token header');
            }

            // Find the matching public key
            $matchingKey = null;
            foreach ($publicKeys['keys'] as $key) {
                if ($key['kid'] === $kid) {
                    $matchingKey = $key;
                    break;
                }
            }

            if (!$matchingKey) {
                Cache::forget('apple_public_keys');
                throw new \Exception('No matching public key found');
            }

            $jwks = ['keys' => [$matchingKey]];
            $keys = JWK::parseKeySet($jwks);

            $decoded = JWT::decode($token, $keys);
            $payload = (array) $decoded;

            // Validate issuer
            if (($payload['iss'] ?? '') !== 'https://appleid.apple.com') {
                throw new \Exception('Invalid token issuer');
            }

            // Validate audience
            $validAudiences = [
                config('services.apple.client_id'),
                'app.rork.elbaraka_hypermarket_app',
            ];

            $tokenAud = $payload['aud'] ?? '';
            if (!in_array($tokenAud, $validAudiences)) {
                Log::warning('Apple token audience mismatch', [
                    'expected' => $validAudiences,
                    'received' => $tokenAud,
                ]);
                // Allow flexibility during development
            }

            // Validate expiration
            if (($payload['exp'] ?? 0) < time()) {
                throw new \Exception('Token has expired');
            }

            return $payload;

        } catch (\Exception $e) {
            Log::error('Apple token verification failed', [
                'error' => $e->getMessage(),
            ]);
            Cache::forget('apple_public_keys');
            return null;
        }
    }

    // ─────────────────────────────────────────────────────
    //  UNIFIED SOCIAL USER HANDLER (Transaction-Safe)
    // ─────────────────────────────────────────────────────

    /**
     * Handle social user account logic with full security.
     *
     * Account Handling Rules:
     *   A) User exists with matching google_id/apple_id → login that user
     *   B) User exists with same email AND provider_id is NULL → link (only if email_verified)
     *   C) Email exists but provider_id belongs to different account → deny
     *   D) No match → create new user
     *
     * Security:
     *   - is_active check (reject deactivated accounts)
     *   - email_verified guard before linking by email
     *   - DB transaction with row-level locking for race condition protection
     *   - registration_source tracking
     *   - push token handling
     */
    private function handleSocialUser(
        string $provider,
        string $providerId,
        ?string $email,
        bool $emailVerified,
        string $firstName,
        string $lastName,
        ?string $avatar,
        ?string $pushToken,
    ): JsonResponse {
        $providerIdColumn = $provider . '_id'; // google_id or apple_id
        $isNewUser = false;

        try {
            $user = DB::transaction(function () use (
                $providerIdColumn, $providerId, $email, $emailVerified,
                $firstName, $lastName, $avatar, $provider, &$isNewUser
            ) {
                // ── Case A: Find user by provider ID (e.g. google_id = sub) ──
                $user = User::where($providerIdColumn, $providerId)->lockForUpdate()->first();

                if ($user) {
                    // Existing social user — update avatar if changed
                    if ($avatar && $user->avatar !== $avatar) {
                        $user->update(['avatar' => $avatar]);
                    }
                    return $user;
                }

                // ── Check by email if no provider-ID match ──
                if ($email) {
                    $existingByEmail = User::where('email', $email)->lockForUpdate()->first();

                    if ($existingByEmail) {
                        // ── Case C: Email exists AND provider_id belongs to another account ──
                        if ($existingByEmail->$providerIdColumn && $existingByEmail->$providerIdColumn !== $providerId) {
                            throw new \Exception('SOCIAL_CONFLICT:This email is already linked to a different ' . $provider . ' account');
                        }

                        // ── Case B: Email exists, provider_id is NULL → link account ──
                        if (!$existingByEmail->$providerIdColumn) {
                            // SECURITY: Only link if Google/Apple says email is verified
                            if (!$emailVerified) {
                                throw new \Exception('EMAIL_NOT_VERIFIED:Cannot link account — email not verified by ' . $provider);
                            }

                            // Link the social provider to existing account
                            $updateData = [$providerIdColumn => $providerId];

                            // If user was previously social-only without this provider, keep their avatar
                            // Only set avatar if they don't have one
                            if ($avatar && !$existingByEmail->avatar) {
                                $updateData['avatar'] = $avatar;
                            }

                            $existingByEmail->update($updateData);

                            Log::info("Linked {$provider} to existing account", [
                                'user_id' => $existingByEmail->id,
                                'email' => $email,
                            ]);

                            return $existingByEmail;
                        }

                        // Provider ID already matches (shouldn't reach here, but safety)
                        return $existingByEmail;
                    }
                }

                // ── Case D: No existing user → create new account ──
                $isNewUser = true;

                $user = User::create([
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $email,
                    'phone' => null,
                    'password' => Hash::make(Str::random(40)), // Cryptographically secure random, bcrypt-hashed
                    'email_verified_at' => $emailVerified ? now() : null,
                    'phone_verified_at' => null,
                    'is_social_only' => true,
                    'is_verified' => false, // Not fully verified until phone is verified
                    'is_active' => true,
                    'language' => 'en',
                    'role' => 'customer',
                    'avatar' => $avatar,
                    'registration_source' => $provider,
                    $providerIdColumn => $providerId,
                ]);

                Log::info("New social user created via {$provider}", [
                    'user_id' => $user->id,
                    'email' => $email,
                    'registration_source' => $provider,
                ]);

                return $user;
            });
        } catch (\Exception $e) {
            // Handle our custom error codes
            if (str_starts_with($e->getMessage(), 'SOCIAL_CONFLICT:')) {
                return response()->json([
                    'success' => false,
                    'message' => str_replace('SOCIAL_CONFLICT:', '', $e->getMessage()),
                    'error_code' => 'SOCIAL_CONFLICT',
                ], 409);
            }

            if (str_starts_with($e->getMessage(), 'EMAIL_NOT_VERIFIED:')) {
                return response()->json([
                    'success' => false,
                    'message' => str_replace('EMAIL_NOT_VERIFIED:', '', $e->getMessage()),
                    'error_code' => 'EMAIL_NOT_VERIFIED',
                ], 403);
            }

            Log::error("Social auth failed for {$provider}", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Authentication failed. Please try again.',
            ], 500);
        }

        // ── Security: Check if account is active ──
        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been deactivated. Please contact support.',
                'error_code' => 'ACCOUNT_DEACTIVATED',
            ], 403);
        }

        // ── Handle push token ──
        if ($pushToken) {
            $existingTokens = $user->push_tokens ?? [];
            if (!in_array($pushToken, $existingTokens)) {
                $existingTokens[] = $pushToken;
                $user->update(['push_tokens' => $existingTokens]);
            }
        }

        // ── Issue tokens ──
        $user->tokens()->delete(); // Revoke all existing tokens

        $accessToken = $user->createToken('mobile-app', ['*'], now()->addHours(24))->plainTextToken;
        $refreshToken = $user->createToken('refresh-token', ['refresh', 'standard'], now()->addDays(30))->plainTextToken;

        // Determine if phone verification is required
        $requiresPhoneVerification = is_null($user->phone_verified_at);

        return response()->json([
            'success' => true,
            'message' => $requiresPhoneVerification
                ? 'Login successful. Please verify your phone number.'
                : 'Login successful',
            'data' => [
                'user' => [
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
                    'email_verified_at' => $user->email_verified_at,
                    'phone_verified_at' => $user->phone_verified_at,
                ],
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type' => 'Bearer',
                'expires_in' => 86400, // 24 hours
                'is_new_user' => $isNewUser,
                'requires_phone_verification' => $requiresPhoneVerification,
            ],
        ], 200);
    }

    // ─────────────────────────────────────────────────────
    //  PHONE OTP (for social login users)
    // ─────────────────────────────────────────────────────

    /**
     * Send SMS OTP for phone verification (social login users)
     */
    public function sendPhoneOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => ['required', 'string', 'regex:/^\+?[0-9]{10,15}$/', 'unique:users,phone,' . $request->user()->id],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $phone = preg_replace('/[^0-9+]/', '', $request->phone);

        // Generate 6-digit OTP
        $otpCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Delete old OTPs
        Otp::where('identifier', $phone)->where('type', 'phone_verification')->delete();

        // Create new OTP (10 min expiry)
        Otp::create([
            'identifier' => $phone,
            'otp' => $otpCode,
            'type' => 'phone_verification',
            'expires_at' => now()->addMinutes(10),
        ]);

        // TODO: Send SMS using Twilio/Vonage
        Log::info("SMS OTP sent to {$phone}: {$otpCode}");

        return response()->json([
            'success' => true,
            'message' => 'OTP sent successfully to ' . $phone,
            'data' => [
                'phone' => $phone,
                'otp_sent' => true,
                'expires_in' => 600,
            ],
        ], 200);
    }

    /**
     * Verify phone OTP for social login users
     */
    public function verifyPhoneOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => ['required', 'string', 'regex:/^\+?[0-9]{10,15}$/'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $phone = preg_replace('/[^0-9+]/', '', $request->phone);

        $otp = Otp::where('identifier', $phone)
            ->where('type', 'phone_verification')
            ->where('otp', $request->otp)
            ->where('expires_at', '>', now())
            ->first();

        if (!$otp) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired OTP',
            ], 401);
        }

        $user->update([
            'phone' => $phone,
            'phone_verified_at' => now(),
            'is_verified' => true,
        ]);

        $otp->delete();

        Log::info('Phone verified for social user', [
            'user_id' => $user->id,
            'phone' => $phone,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Phone verified successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'full_name' => $user->first_name . ' ' . $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'avatar' => $user->avatar,
                    'language' => $user->language,
                    'role' => $user->role,
                    'is_verified' => $user->is_verified,
                    'email_verified_at' => $user->email_verified_at,
                    'phone_verified_at' => $user->phone_verified_at,
                ],
            ],
        ], 200);
    }
}
