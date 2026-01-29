# Social Login Implementation Guide

## Overview

This document describes the complete social login implementation for Google and Apple Sign-In in the ElBaraka Hypermarket App.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          SOCIAL LOGIN FLOW                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   User Taps     │───▶│  Native OAuth   │───▶│   Get Token     │         │
│  │ Social Button   │    │  (Google/Apple) │    │ from Provider   │         │
│  └─────────────────┘    └─────────────────┘    └────────┬────────┘         │
│                                                          │                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────▼────────┐         │
│  │  Navigate to    │◀───│  Return Auth    │◀───│  POST /auth/    │         │
│  │  Home or Phone  │    │  Tokens + User  │    │ google or apple │         │
│  │  Verification   │    └─────────────────┘    └─────────────────┘         │
│  └─────────────────┘                                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Frontend Implementation

### 1. Services

#### `frontend/services/socialAuth.ts`

Main social authentication service containing:

- `useGoogleAuth()` - React hook for Google Sign-In
- `handleGoogleResponse()` - Process Google OAuth response
- `signInWithApple()` - Apple Sign-In function
- `isAppleAuthAvailable()` - Check Apple auth availability

#### `frontend/services/api.ts`

API methods for social login:

```typescript
authApi.socialGoogle({ token: string }) // Google login
authApi.socialApple({ token: string, user?: { name } }) // Apple login
authApi.sendPhoneOtp({ phone: string }) // For phone verification
authApi.verifyPhoneOtp({ phone: string, otp: string }) // Verify phone OTP
```

### 2. Components

#### `frontend/components/SocialIcons.tsx`

SVG icons for Google and Apple buttons.

#### `frontend/app/(auth)/login.tsx`

Login screen with social buttons integrated:

- Google Sign-In button (always visible)
- Apple Sign-In button (iOS only, shown when available)

### 3. Store Integration (`frontend/store/index.ts`)

```typescript
sendPhoneOtp: (phone: string) => Promise<void>;
verifyPhoneOtp: (phone: string, otp: string) => Promise<void>;
```

### 4. Phone Verification (`frontend/app/phone-verification.tsx`)

Screen for social login users to verify their phone number.

## Backend Implementation

### 1. Controller

`unibackend/app/Http/Controllers/Api/Auth/SocialAuthController.php`

#### Methods:

- `google(Request $request)` - Handle Google Sign-In
- `apple(Request $request)` - Handle Apple Sign-In with direct JWT verification
- `sendPhoneOtp(Request $request)` - Send OTP to phone
- `verifyPhoneOtp(Request $request)` - Verify phone OTP

### 2. Routes

```php
// Public routes (no auth required)
Route::post('auth/google', [SocialAuthController::class, 'google']);
Route::post('auth/apple', [SocialAuthController::class, 'apple']);

// Authenticated routes (for phone verification)
Route::post('auth/send-phone-otp', [SocialAuthController::class, 'sendPhoneOtp']);
Route::post('auth/verify-phone-otp', [SocialAuthController::class, 'verifyPhoneOtp']);
```

### 3. Database Schema

```sql
-- Users table additions
google_id VARCHAR(255) NULLABLE UNIQUE
apple_id VARCHAR(255) NULLABLE UNIQUE
is_social_only BOOLEAN DEFAULT FALSE
phone_verified_at TIMESTAMP NULLABLE
```

### 4. Apple JWT Verification

The Apple Sign-In implementation verifies the `identityToken` JWT directly:

1. Fetches Apple's public keys from `https://appleid.apple.com/auth/keys`
2. Caches keys for 1 hour
3. Matches JWT header's `kid` to find correct public key
4. Verifies JWT signature using firebase/php-jwt
5. Validates issuer (`https://appleid.apple.com`)
6. Validates audience (bundle ID)
7. Checks token expiration

## Configuration

### Frontend (`frontend/services/socialAuth.ts`)

```typescript
export const GOOGLE_CONFIG = {
  androidClientId:
    "1094715104270-j7eosq5vui80pt5fhv634mkmd7fqvn92.apps.googleusercontent.com",
};
```

### Backend (`unibackend/.env`)

```env
# Google OAuth
GOOGLE_WEB_CLIENT_ID=1094715104270-j7eosq5vui80pt5fhv634mkmd7fqvn92.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://auth.expo.io/@kareemh122/elbaraka-hypermarket-app

# Apple Sign-In
APPLE_CLIENT_ID=app.rork.elbaraka_hypermarket_app
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_PRIVATE_KEY="your_private_key"
```

## User Flow

### New Social User

1. User taps Google/Apple button on login screen
2. Native OAuth flow completes
3. Token sent to backend
4. Backend creates new user with:
   - Email from social provider
   - `is_social_only = true`
   - `email_verified_at = now()`
   - `is_verified = false`
5. User redirected to phone verification
6. User enters phone and receives OTP
7. User verifies OTP
8. `is_verified = true`, `phone_verified_at = now()`
9. User redirected to home

### Existing User (Email Match)

1. User taps social button
2. Backend finds existing user by email
3. Links social ID to existing account
4. If phone verified, redirect to home
5. If phone not verified, redirect to verification

### Returning Social User

1. User taps social button
2. Backend finds user by social ID
3. Login successful, redirect based on phone verification status

## Testing

### Test Google Sign-In

1. Build and run on Android device/emulator
2. Tap "Continue with Google" button
3. Select Google account
4. Should redirect to home or phone verification

### Test Apple Sign-In

1. Build and run on iOS device/simulator (iOS 13+)
2. Tap "Continue with Apple" button
3. Authenticate with Face ID/Touch ID
4. Should redirect to home or phone verification

### Check Backend Logs

```bash
cd unibackend
tail -f storage/logs/laravel.log
```

Look for:

- `New social user created via google/apple`
- `Phone verified for social user`
- `Apple token verification failed` (if issues)

## Troubleshooting

### Google Sign-In Issues

1. **Invalid Client ID**
   - Verify `androidClientId` matches Google Cloud Console
   - Check SHA-1 fingerprint is registered

2. **Redirect URI Mismatch**
   - Ensure redirect URI in Google Console matches
   - Format: `com.googleusercontent.apps.{CLIENT_ID}:/oauth2redirect`

### Apple Sign-In Issues

1. **Token Verification Failed**
   - Check Apple's public key fetch (network issues)
   - Verify bundle ID matches `APPLE_CLIENT_ID`
   - Check token expiration

2. **No User Data**
   - Apple only provides name on FIRST sign-in
   - Store name from frontend if provided

3. **Not Available**
   - Apple Sign-In only works on iOS 13+
   - Requires real device or recent simulator

## Security Considerations

1. **Token Validation**: Both Google and Apple tokens are verified on the backend
2. **Password Security**: Social users get random 32-character passwords
3. **Email Trust**: We trust email from providers (they've verified it)
4. **Phone Verification**: Additional verification layer for SMS-based features
5. **Token Rotation**: All existing tokens revoked on social login

## Dependencies

### Frontend

- `expo-auth-session` - Google OAuth
- `expo-apple-authentication` - Apple Sign-In
- `expo-web-browser` - OAuth redirect handling

### Backend

- `laravel/socialite` - Google OAuth
- `firebase/php-jwt` - Apple JWT verification

## Files Modified/Created

### Frontend

- `frontend/services/socialAuth.ts` ✅
- `frontend/services/api.ts` ✅
- `frontend/components/SocialIcons.tsx` ✅
- `frontend/app/(auth)/login.tsx` ✅
- `frontend/app/phone-verification.tsx` ✅
- `frontend/store/index.ts` ✅

### Backend

- `unibackend/app/Http/Controllers/Api/Auth/SocialAuthController.php` ✅
- `unibackend/routes/api.php` ✅
- `unibackend/config/services.php` ✅
- `unibackend/.env` ✅
- `unibackend/database/migrations/2025_12_02_114950_add_social_columns_to_users_table.php` ✅
