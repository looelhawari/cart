# Social Login & Edit Profile — Complete Documentation

> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Covers:** Google Social Login (native SDK), Email Change Flow, Relink Google Account, Profile Editing Policies

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Google Social Login Flow](#2-google-social-login-flow)
3. [SocialAuthController — Case Logic](#3-socialauthcontroller--case-logic)
4. [Email Verification (`is_verified`) Logic](#4-email-verification-is_verified-logic)
5. [Profile Editing Policies](#5-profile-editing-policies)
6. [Email Change Flow (Password-Based Users)](#6-email-change-flow-password-based-users)
7. [Relink Google Account Flow (Social-Only Users)](#7-relink-google-account-flow-social-only-users)
8. [Frontend Screens & Navigation](#8-frontend-screens--navigation)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [Security Considerations](#10-security-considerations)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       React Native Expo (SDK 54)                    │
│  @react-native-google-signin/google-signin v16.1.1 (native SDK)    │
│  Frontend: frontend/                                                │
├─────────────────────────────────────────────────────────────────────┤
│                              ↕ HTTPS                                │
├─────────────────────────────────────────────────────────────────────┤
│                     Laravel 11 + Sanctum Backend                    │
│  Backend: unibackend/                                               │
│  Token Auth: Access (24h) + Refresh (30d)                           │
│  Google ID Token verified via Firebase JWT (public keys)            │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Libraries

| Layer    | Library / Service                           | Purpose                        |
| -------- | ------------------------------------------- | ------------------------------ |
| Frontend | `@react-native-google-signin/google-signin` | Native Google Sign-In prompt   |
| Frontend | Zustand (persist)                           | Auth state management          |
| Backend  | `firebase/php-jwt`                          | JWT verification of ID tokens  |
| Backend  | Google public JWKS keys                     | Cryptographic token validation |
| Backend  | Laravel Sanctum                             | Token-based API auth           |

### Google Web Client ID

```
113273912716-ho3k23v05dodf7gq7tpq5u782chrar3t.apps.googleusercontent.com
```

---

## 2. Google Social Login Flow

### Frontend Flow

```
User taps "Continue with Google"
    │
    ▼
GoogleSignin.signIn()   ← Native SDK prompt
    │
    ▼
Get idToken from response.data.idToken
    │
    ▼
POST /api/auth/social/google { id_token, push_token? }
    │
    ▼
Backend returns { access_token, refresh_token, user, is_new_user }
    │
    ▼
Store tokens + set isAuthenticated = true
    │
    ▼
fetchUserProfile() to hydrate full user data
    │
    ▼
Navigate to home screen
```

### Backend Flow

```
Receive id_token
    │
    ▼
verifyGoogleIdToken(id_token)
    │   ├── Fetch Google public keys (JWKS) with 1hr cache
    │   ├── Decode JWT using RS256
    │   ├── Validate: aud == WEB_CLIENT_ID
    │   ├── Validate: iss ∈ {accounts.google.com, https://accounts.google.com}
    │   ├── Validate: exp > now
    │   └── Return payload (sub, email, email_verified, name, picture)
    │
    ▼
handleSocialUser('google', ...) in DB::transaction
    │
    ▼
Issue Sanctum tokens + return response
```

---

## 3. SocialAuthController — Case Logic

**File:** `unibackend/app/Http/Controllers/Api/Auth/SocialAuthController.php`  
**Method:** `handleSocialUser()` (line 338)

The method handles 4 cases inside a `DB::transaction` with `lockForUpdate()` to prevent race conditions:

### Case A: Existing User by Provider ID

**Condition:** `User::where('google_id', $googleSub)->first()` returns a user.

**Behavior:**

- Updates avatar if changed
- **Syncs `is_verified`:** If Google says email is verified (`$emailVerified = true`), sets `is_verified = true` and `email_verified_at = now()` if they were previously unset
- Returns existing user

### Case B: Email Exists, Provider ID is NULL → Link Account

**Condition:** No google_id match, but `User::where('email', $email)->first()` finds a user whose `google_id` is NULL.

**Behavior:**

- **Security guard:** Only links if `$emailVerified == true` (Google confirms email ownership)
- Sets `google_id = $providerId`
- Sets avatar only if user doesn't have one
- **Syncs `is_verified`:** Sets `is_verified = true` and `email_verified_at = now()` (provider confirmed email ownership)
- Logs the linking event

### Case C: Email Exists, Provider ID Belongs to Another Account → CONFLICT

**Condition:** Email match found, but that user already has a _different_ `google_id`.

**Behavior:**

- Throws `SOCIAL_CONFLICT` error (HTTP 409)
- Message: "This email is already linked to a different google account"

### Case D: No Existing User → Create New Account

**Condition:** Neither google_id nor email match any existing user.

**Behavior:**

- Creates new user with:
  - `password = Hash::make(Str::random(40))` — cryptographically secure, unusable by user
  - `is_social_only = true`
  - `is_verified = $emailVerified` — true if Google confirms email verification
  - `email_verified_at = $emailVerified ? now() : null`
  - `registration_source = 'google'`
- Logs the creation event

### Error Handling

| Error Code            | HTTP | Meaning                                       |
| --------------------- | ---- | --------------------------------------------- |
| `SOCIAL_CONFLICT`     | 409  | Email already linked to different Google acct |
| `EMAIL_NOT_VERIFIED`  | 403  | Cannot link — email not verified by provider  |
| `ACCOUNT_DEACTIVATED` | 403  | User account is deactivated                   |

---

## 4. Email Verification (`is_verified`) Logic

The `is_verified` field is set based on the **provider's email verification status** across all cases:

| Case | When `$emailVerified == true`                                 | When `$emailVerified == false`                    |
| ---- | ------------------------------------------------------------- | ------------------------------------------------- |
| A    | Syncs: sets `is_verified = true`, `email_verified_at = now()` | No change to existing values                      |
| B    | Always true (guard requires `$emailVerified` to be true)      | Rejects with 403 error                            |
| D    | `is_verified = true`, `email_verified_at = now()`             | `is_verified = false`, `email_verified_at = null` |

---

## 5. Profile Editing Policies

**File:** `frontend/app/profile/edit.tsx`

### Field Editability

| Field         | Editable?    | Notes                                          |
| ------------- | ------------ | ---------------------------------------------- |
| First Name    | ✅ Yes       | Direct inline editing                          |
| Last Name     | ✅ Yes       | Direct inline editing                          |
| Email         | 🔒 Read-only | Shown with lock icon, cannot be changed inline |
| Phone         | ✅ Yes       | Direct inline editing                          |
| Date of Birth | ✅ Yes       | Date picker                                    |
| Gender        | ✅ Yes       | Selector                                       |
| Language      | ✅ Yes       | Toggle (en/ar)                                 |

### Email Change Button Visibility

The "Change Email" button is shown ONLY when **all** of these conditions are met:

1. `user.is_social_only !== true` — **not** a social-only user
2. User has a password-based account (can enter current password)

**Social-only users** never see the "Change Email" button because:

- They have a random 40-char hashed password they don't know
- The email change flow requires current password verification
- They use "Switch Google Account" instead

### Switch Google Account Button Visibility

The "Switch Google Account" button is shown ONLY when:

1. `user.is_social_only === true` — user is social-only
2. `user.has_google === true` — user has a linked Google account

---

## 6. Email Change Flow (Password-Based Users)

**Frontend:** `frontend/app/profile/change-email.tsx`  
**Backend:** `AuthController::requestEmailChange()` + `verifyEmailChange()`

### 3-Step Flow

```
Step 1: Enter Current Password + New Email
    │
    ▼
POST /api/profile/request-email-change
    { current_password, new_email }
    │
    ├── Verifies current password (Hash::check)
    ├── Checks new_email != current email
    ├── Checks new_email not already in use
    ├── Creates OTP (type: email_change) via OtpService
    ├── Sends OTP to NEW email address
    │
    ▼
Step 2: Enter 6-digit OTP
    │
    ▼
POST /api/profile/verify-email-change
    { code, new_email }
    │
    ├── Verifies OTP (type: email_change, bound to new_email)
    ├── Re-checks new_email not already in use (race condition guard)
    ├── Atomically updates user email
    ├── Sets email_verified_at = now()
    ├── Deletes OTP
    │
    ▼
Step 3: Success Confirmation
    User sees success screen, navigates back to profile
```

### Security Features

- **Password verification** at Step 1 (prevents unauthorized changes)
- **OTP bound to new_email** (cannot be used with different email)
- **Race condition guard** at Step 2 (re-checks email uniqueness)
- **Throttle:** 5 requests/minute on both endpoints
- **OTP expiry:** Standard expiry (configured in OtpService)
- **Show/Hide password toggle** on Step 1 (Eye/EyeOff icons)

### OTP Type

The `email_change` type was added to the `otps` table ENUM via migration:

- `database/migrations/2026_02_10_132100_add_email_change_to_otps_type.php`

---

## 7. Relink Google Account Flow (Social-Only Users)

**Frontend:** Button in `frontend/app/profile/edit.tsx`  
**Backend:** `SocialAuthController::relinkGoogle()`  
**Route:** `POST /api/profile/relink-google` (throttle: 5/min)

### Purpose

Allows social-only users (who signed up via Google) to switch to a different Google account. This changes their `google_id`, `email`, `name`, and `avatar` to match the new Google account.

### Flow

```
User taps "Switch Google Account" on Edit Profile
    │
    ▼
GoogleSignin.signOut()  ← Clear cached Google session
    │
    ▼
GoogleSignin.signIn()   ← Prompt to pick new account
    │
    ▼
Get idToken from new account
    │
    ▼
POST /api/profile/relink-google { id_token }
    │
    ├── Guard: is_social_only must be true
    ├── Guard: google_id must exist
    ├── verifyGoogleIdToken(id_token) — same crypto verification
    ├── Guard: new email must be verified by Google
    ├── Guard: not the same Google account
    ├── Guard: new google_id and email not used by another user
    │
    ▼
Atomic update:
    ├── google_id = new sub
    ├── email = new email
    ├── email_verified_at = now()
    ├── is_verified = true
    ├── first_name, last_name, avatar = from new Google account
    │
    ▼
ActivityLog::log('google_account_relinked', ...)
    │
    ▼
Return updated user object
    │
    ▼
Frontend: updates user in store, shows success toast
```

### Security Guards

| Guard               | HTTP | Error Code           | Message                                         |
| ------------------- | ---- | -------------------- | ----------------------------------------------- |
| Not social-only     | 403  | `NOT_SOCIAL_ONLY`    | Only social-only accounts can relink            |
| No Google link      | 400  | `NO_GOOGLE_LINK`     | Account not linked to Google                    |
| Email not verified  | 403  | `EMAIL_NOT_VERIFIED` | Google account email must be verified           |
| Same account        | 400  | `SAME_ACCOUNT`       | Already your linked Google account              |
| Conflict (ID/email) | 409  | `RELINK_CONFLICT`    | Google ID or email already used by another user |

---

## 8. Frontend Screens & Navigation

### Screen Map

```
/(tabs)/profile.tsx
    │
    ├── Edit Profile → /profile/edit.tsx
    │       │
    │       ├── [Password users] Change Email → /profile/change-email.tsx
    │       │       └── 3-step flow (password → OTP → success)
    │       │
    │       └── [Social-only users] Switch Google Account
    │               └── In-page flow (GoogleSignin → API → toast)
    │
    └── Settings, Orders, etc.

/(auth)/login.tsx
    │
    └── "Continue with Google" → GoogleSignin → POST /auth/social/google
```

### Key Frontend Files

| File                                    | Purpose                                 |
| --------------------------------------- | --------------------------------------- |
| `frontend/app/profile/edit.tsx`         | Edit profile screen (name, phone, etc.) |
| `frontend/app/profile/change-email.tsx` | 3-step email change flow                |
| `frontend/services/api/profileApi.ts`   | Profile API methods                     |
| `frontend/services/api/types.ts`        | Type definitions                        |
| `frontend/store/index.ts`               | Zustand store (auth state)              |
| `frontend/i18n/locales/en.ts`           | English translations                    |
| `frontend/i18n/locales/ar.ts`           | Arabic translations                     |

---

## 9. API Endpoints Reference

### Social Auth

| Method | Endpoint                  | Auth | Throttle | Description         |
| ------ | ------------------------- | ---- | -------- | ------------------- |
| POST   | `/api/auth/social/google` | No   | —        | Google social login |

### Profile Management

| Method | Endpoint                            | Auth | Throttle | Description                    |
| ------ | ----------------------------------- | ---- | -------- | ------------------------------ |
| GET    | `/api/profile`                      | Yes  | —        | Get profile (enriched)         |
| PUT    | `/api/profile`                      | Yes  | —        | Update profile (email blocked) |
| POST   | `/api/profile/request-email-change` | Yes  | 5/min    | Request email change OTP       |
| POST   | `/api/profile/verify-email-change`  | Yes  | 5/min    | Verify OTP & change email      |
| POST   | `/api/profile/relink-google`        | Yes  | 5/min    | Relink to different Google     |

### Profile Response Shape

```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+201234567890",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "avatar": "https://...",
  "language": "en",
  "role": "customer",
  "is_verified": true,
  "is_social_only": true,
  "has_google": true,
  "has_apple": false,
  "email_verified_at": "2026-02-10T12:00:00.000000Z",
  "registration_source": "google"
}
```

---

## 10. Security Considerations

### Token Verification

- Google ID tokens are **cryptographically verified** using Google's public JWKS keys
- Keys are cached for 1 hour to avoid excessive fetches
- All claims validated: `aud`, `iss`, `exp`, `sub`, `email`

### Race Condition Prevention

- All user creation/linking happens inside `DB::transaction` with `lockForUpdate()`
- Email uniqueness re-checked at verification step (not just request step)

### Password Security

- Social-only users get `Hash::make(Str::random(40))` — 40 random chars, bcrypt-hashed
- Password is cryptographically random and **never revealed** to the user
- Social-only users are prevented from accessing password-dependent flows

### Token Management

- Access tokens: 24-hour expiry
- Refresh tokens: 30-day expiry
- On social login: all existing tokens revoked (`$user->tokens()->delete()`)
- Sanctum abilities: `['*']` for access, `['refresh', 'standard']` for refresh

### Account Linking Safety

- Case B (email linking) requires `$emailVerified == true` from provider
- Case C prevents cross-linking to different Google sub IDs
- Relink flow prevents conflicts (same google_id or email used by others)

### Audit Trail

- `ActivityLog::log('google_account_relinked', ...)` logs all relink events
- Laravel `Log::info()` for login, creation, and linking events

---

## Appendix: Database Fields

### Users Table — Social Auth Fields

| Column                | Type      | Description                                |
| --------------------- | --------- | ------------------------------------------ |
| `google_id`           | string    | Google sub (unique provider ID)            |
| `apple_id`            | string    | Apple sub (unique provider ID)             |
| `is_social_only`      | boolean   | True if user signed up via social provider |
| `registration_source` | string    | `'google'`, `'apple'`, or `'email'`        |
| `is_verified`         | boolean   | Email verification status                  |
| `email_verified_at`   | timestamp | When email was verified                    |
| `avatar`              | string    | Profile picture URL (from provider)        |

### OTPs Table — Email Change

| Column    | Type   | Description                                    |
| --------- | ------ | ---------------------------------------------- |
| `type`    | ENUM   | Includes `email_change` (added via migration)  |
| `code`    | string | 6-digit OTP                                    |
| `email`   | string | Target email (new email for email_change type) |
| `user_id` | int    | Owner of the OTP                               |
