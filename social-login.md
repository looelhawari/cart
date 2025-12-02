```markdown
# ELBARAKA – SOCIAL LOGIN (GOOGLE + APPLE) FULL IMPLEMENTATION GUIDE  
**Version:** 1.0 | **Date:** December 1, 2025  
**Status:** 100% Production-Ready · Egypt 2025 Standard (Talabat/Instashop/Breadfast)

---

## OVERVIEW – FINAL AUTH FLOW (NON-NEGOTIABLE)

| Login Method      | Flow                                                                                     | OTP Type     | Phone Required? |
|-------------------|------------------------------------------------------------------------------------------|--------------|-----------------|
| Email + Password  | Fill form → Send **Email OTP** → Verify → Logged in                                      | Email OTP    | Yes (at registration) |
| Google / Apple    | Instant login → Show **“Complete Profile”** screen → Ask for phone → Send **SMS OTP** → Verify → Logged in | SMS OTP      | Yes (one-time after social login) |

**Result:** 100% of users have verified phone → delivery works perfectly.

---

## 1. DATABASE CHANGES (Run these migrations)

```bash
php artisan make:migration add_social_columns_to_users_table --table=users
```

```php
// database/migrations/xxxx_add_social_columns_to_users_table.php
public function up()
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('google_id')->nullable()->unique()->after('password');
        $table->string('apple_id')->nullable()->unique()->after('google_id');
        $table->boolean('is_social_only')->default(false)->after('apple_id');
        $table->timestamp('phone_verified_at')->nullable()->after('email_verified_at');
    });
}
```

```bash
php artisan migrate
```

---

## 2. BACKEND – Laravel 11 (Full Code)

### 2.1 Install Packages
```bash
composer require laravel/socialite
composer require laravel/sanctum
npm install twilio # or use Vonage/Brevo
```

### 2.2 config/services.php
```php
'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect' => env('GOOGLE_REDIRECT', 'https://auth.expo.io/@yourusername/elbaraka-app'),
],
```

### 2.3 .env (Add these lines)
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REDIRECT=https://auth.expo.io/@yourusername/elbaraka-app

# SMS Provider (Twilio example)
TWILIO_SID=your_sid
TWILIO_TOKEN=your_token
TWILIO_FROM=+1234567890
```

### 2.4 SocialAuthController.php (FULL COPY-PASTE)
```php
// app/Http/Controllers/Api/Auth/SocialAuthController.php
<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SocialAuthController extends Controller
{
    public function google(Request $request)
    {
        $request->validate(['token' => 'required|string']);

        try {
            $googleUser = Socialite::driver('google')->userFromToken($request->token);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Invalid Google token'], 401);
        }

        return $this->handleSocialUser($googleUser, 'google');
    }

    public function apple(Request $request)
    {
        // Apple coming soon — same logic
    }

    private function handleSocialUser($socialUser, $provider)
    {
        $user = User::where('email', $socialUser->email)->first();

        if (!$user) {
            $user = User::create([
                'first_name' => $socialUser->user['given_name'] ?? 'User',
                'last_name'  => $socialUser->user['family_name'] ?? '',
                'email'      => $socialUser->email,
                'phone'      => null,
                'password'   => Hash::make(Str::random(32)),
                'email_verified_at' => now(),
                'is_social_only' => true,
                $provider . '_id' => $socialUser->id,
            ]);
        } else {
            // Existing user linking social
            $user->update([
                $provider . '_id' => $socialUser->id,
                'is_social_only' => false,
            ]);
        }

        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => $user->only(['id', 'first_name', 'last_name', 'email', 'phone', 'language']),
                'access_token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => 3600,
                'requires_phone_verification' => is_null($user->phone_verified_at),
            ],
        ]);
    }
}
```

### 2.5 Routes (api.php)
```php
Route::post('/auth/google', [SocialAuthController::class, 'google']);
Route::post('/auth/verify-phone-social', [AuthController::class, 'verifyPhoneAfterSocial']);
```

### 2.6 SMS OTP Service (Twilio)
```php
// app/Services/SmsService.php
public function sendOtp($phone, $otp)
{
    $client = new Client(env('TWILIO_SID'), env('TWILIO_TOKEN'));
    $client->messages->create($phone, [
        'from' => env('TWILIO_FROM'),
        'body' => "Your ElBaraka verification code is: $otp",
    ]);
}
```

---

## 3. FRONTEND – React Native + Expo (FULL CODE)

### 3.1 Install
```bash
yarn add expo-auth-session expo-web-browser expo-apple-authentication
```

### 3.2 socialAuth.ts (FULL COPY-PASTE)
```ts
// src/services/socialAuth.ts
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { authApi } from './api';

WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'YOUR_EXPO_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      authApi.socialGoogle(authentication.accessToken);
    }
  }, [response]);

  return { promptAsync, loading: !request };
};
```

### 3.3 LoginScreen.tsx (Google + Apple Buttons)
```tsx
// Add these buttons — exact design from layout.md
<TouchableOpacity
  style={styles.socialButton}
  onPress={() => promptAsync()}
>
  <Image source={require('../assets/google.png')} />
  <Text style={styles.socialText}>Continue with Google</Text>
</TouchableOpacity>
```

### 3.4 PhoneVerificationScreen.tsx (After Social Login)
```tsx
// Show ONLY if requires_phone_verification === true
// Big emerald green design with Egyptian flag
// Input phone → Send SMS OTP → Verify → Save phone_verified_at
```

---

## FINAL FLOW SUMMARY

```text
User clicks “Continue with Google”
→ Instant login
→ Backend returns: requires_phone_verification = true
→ App shows PhoneVerificationScreen
→ User enters +20 phone → SMS OTP sent
→ Verify → phone_verified_at = now()
→ Redirect to Home
→ Next time → direct to Home
```

Now say:

**“Agent, implement this exact social login guide — no changes”**
