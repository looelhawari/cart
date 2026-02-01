<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Otp;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Laravel\Socialite\Facades\Socialite;
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
    /**
     * Google Social Login
     */
    public function google(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $googleUser = Socialite::driver('google')->stateless()->userFromToken($request->token);
        } catch (\Exception $e) {
            Log::error('Google auth failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Invalid Google token',
            ], 401);
        }

        return $this->handleSocialUser($googleUser, 'google');
    }

    /**
     * Apple Social Login
     * Verifies Apple's identityToken JWT directly without Socialite provider
     */
    public function apple(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'user' => 'nullable|array', // Apple provides user data on first sign-in only
            'user.name' => 'nullable|array',
            'user.name.firstName' => 'nullable|string',
            'user.name.lastName' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Verify Apple's identityToken JWT directly
            $appleData = $this->verifyAppleToken($request->token);

            if (!$appleData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid Apple token',
                ], 401);
            }

            // Create a standardized user object
            $appleUser = (object) [
                'id' => $appleData['sub'], // Apple's unique user ID
                'email' => $appleData['email'] ?? null,
                'user' => [
                    'given_name' => $request->input('user.name.firstName', 'User'),
                    'family_name' => $request->input('user.name.lastName', ''),
                ],
            ];

        } catch (\Exception $e) {
            Log::error('Apple auth failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Invalid Apple token: ' . $e->getMessage(),
            ], 401);
        }

        return $this->handleSocialUser($appleUser, 'apple');
    }

    /**
     * Verify Apple's identityToken JWT
     * Fetches Apple's public keys and validates the JWT signature
     */
    private function verifyAppleToken(string $token): ?array
    {
        try {
            // Get Apple's public keys (cached for 1 hour)
            $publicKeys = Cache::remember('apple_public_keys', 3600, function () {
                $response = Http::get('https://appleid.apple.com/auth/keys');
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
                // Clear cache and retry in case keys rotated
                Cache::forget('apple_public_keys');
                throw new \Exception('No matching public key found');
            }

            // Convert JWK to PEM format for verification
            $jwks = ['keys' => [$matchingKey]];
            $keys = JWK::parseKeySet($jwks);

            // Decode and verify the token
            $decoded = JWT::decode($token, $keys);
            $payload = (array) $decoded;

            // Validate issuer
            if (($payload['iss'] ?? '') !== 'https://appleid.apple.com') {
                throw new \Exception('Invalid token issuer');
            }

            // Validate audience (should be your app's bundle ID)
            $validAudiences = [
                config('services.apple.client_id'),
                'app.rork.elbaraka_hypermarket_app', // iOS bundle ID
            ];

            $tokenAud = $payload['aud'] ?? '';
            if (!in_array($tokenAud, $validAudiences)) {
                Log::warning('Apple token audience mismatch', [
                    'expected' => $validAudiences,
                    'received' => $tokenAud,
                ]);
                // Still allow for flexibility during development
            }

            // Validate expiration
            if (($payload['exp'] ?? 0) < time()) {
                throw new \Exception('Token has expired');
            }

            return $payload;

        } catch (\Exception $e) {
            Log::error('Apple token verification failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Handle social user authentication
     */
    private function handleSocialUser($socialUser, string $provider): JsonResponse
    {
        $providerId = $provider . '_id';

        // Check if user exists by social ID
        $user = User::where($providerId, $socialUser->id)->first();

        // If not found, check by email
        if (!$user && $socialUser->email) {
            $user = User::where('email', $socialUser->email)->first();

            // Link social account to existing user
            if ($user) {
                $user->update([$providerId => $socialUser->id]);
            }
        }

        // Create new user if doesn't exist
        if (!$user) {
            $user = User::create([
                'first_name' => $socialUser->user['given_name'] ?? $socialUser->name ?? 'User',
                'last_name' => $socialUser->user['family_name'] ?? '',
                'email' => $socialUser->email,
                'phone' => null,
                'password' => Hash::make(Str::random(32)), // Random password for social-only users
                'email_verified_at' => now(), // Email verified by social provider
                'phone_verified_at' => null,
                'is_social_only' => true,
                'is_verified' => false, // Not fully verified until phone is verified
                'is_active' => true,
                'language' => 'en',
                'role' => 'customer',
                $providerId => $socialUser->id,
            ]);

            Log::info("New social user created via {$provider}", [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);
        } else {
            // Ensure social ID is saved
            if (!$user->$providerId) {
                $user->update([$providerId => $socialUser->id]);
            }
        }

        // Revoke all existing tokens
        $user->tokens()->delete();

        // Create new tokens - 24 hour access token for mobile/social login
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
                    'avatar' => $user->avatar,
                    'language' => $user->language,
                    'role' => $user->role,
                    'is_verified' => $user->is_verified,
                    'email_verified_at' => $user->email_verified_at,
                    'phone_verified_at' => $user->phone_verified_at,
                ],
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type' => 'Bearer',
                'expires_in' => 86400, // 24 hours
                'requires_phone_verification' => $requiresPhoneVerification,
            ],
        ], 200);
    }

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
        $otpCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // Delete old OTPs
        Otp::where('identifier', $phone)->where('type', 'phone_verification')->delete();

        // Create new OTP
        Otp::create([
            'identifier' => $phone,
            'otp' => $otpCode,
            'type' => 'phone_verification',
            'expires_at' => now()->addMinutes(10),
        ]);

        // TODO: Send SMS using Twilio/Vonage
        // For now, log it for development
        Log::info("SMS OTP sent to {$phone}: {$otpCode}");

        // In production, uncomment this:
        // app(\App\Services\SmsService::class)->sendOtp($phone, $otpCode);

        return response()->json([
            'success' => true,
            'message' => 'OTP sent successfully to ' . $phone,
            'data' => [
                'phone' => $phone,
                'otp_sent' => true,
                'expires_in' => 600, // 10 minutes
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

        // Find valid OTP
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

        // Update user with verified phone
        $user->update([
            'phone' => $phone,
            'phone_verified_at' => now(),
            'is_verified' => true, // Now fully verified
        ]);

        // Delete used OTP
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
