# ✅ Google Sign-In Production Checklist

**Quick reference for making Google Sign-In work in production**

---

## 🔑 What You Need

### 1. Google Cloud Console - OAuth Clients

You need **3 OAuth clients** total:

#### ✅ Web OAuth Client

- **Type:** Web application
- **Purpose:** Backend verification of `id_token`
- **Used in:** `frontend/services/socialAuth.ts`
- **Client ID looks like:** `xxxxx-yyyyy.apps.googleusercontent.com`

**Configuration:**

```
Name: CART Web Client
Authorized JavaScript origins: https://cartshop.site
Authorized redirect URIs: https://cartshop.site/auth/callback
```

#### ✅ Android OAuth Client #1 (Upload Key)

- **Type:** Android
- **Purpose:** Development & EAS builds
- **SHA-1:** Get from `eas credentials --platform android`

**Configuration:**

```
Name: CART Android (Upload Key)
Package name: com.cart.hypermarket
SHA-1: [YOUR EAS BUILD SHA-1]
```

#### ✅ Android OAuth Client #2 (Play Store Key)

- **Type:** Android
- **Purpose:** Production app from Play Store
- **SHA-1:** Get from Play Console > Setup > App signing

**Configuration:**

```
Name: CART Android (Play Store Key)
Package name: com.cart.hypermarket
SHA-1: [PLAY STORE'S SHA-1]
```

---

## 📍 Where to Find SHA-1 Certificates

### Your Upload Key SHA-1 (for Android Client #1)

```bash
cd frontend
eas credentials --platform android
```

Look for:

```
SHA-1: E6:ED:21:31:EE:78:08:B1:EC:B2:03:BF:B4:83:EF:10:78:AC:F3:46
```

### Play Store's SHA-1 (for Android Client #2)

1. Go to: https://play.google.com/console/
2. Select your app: **CART Hypermarket**
3. Navigate to: **Setup > App signing**
4. Find: **"App signing key certificate"** section
5. Copy the **SHA-1 certificate fingerprint**

---

## 🎯 Configuration Checklist

### Google Cloud Console

- [ ] Project created: **cart-hypermarket**
- [ ] Google+ API or Google Identity enabled
- [ ] OAuth consent screen configured
- [ ] OAuth consent screen **Published** (not Testing!)
- [ ] Web OAuth client created
- [ ] Android OAuth client #1 created (Upload Key SHA-1)
- [ ] Android OAuth client #2 created (Play Store SHA-1) ⚠️ _Do after uploading to Play Store_

### Frontend Code

- [ ] `frontend/services/socialAuth.ts` has correct Web Client ID:

```typescript
const GOOGLE_WEB_CLIENT_ID = "YOUR-WEB-CLIENT-ID.apps.googleusercontent.com";
```

- [ ] `frontend/app.json` has correct package name:

```json
"android": {
  "package": "com.cart.hypermarket"
}
```

- [ ] `@react-native-google-signin/google-signin` plugin configured in `app.json`:

```json
"plugins": [
  [
    "@react-native-google-signin/google-signin",
    {
      "iosUrlScheme": "com.googleusercontent.apps.113273912716-xxxxx"
    }
  ]
]
```

### Backend

- [ ] Backend accepts `id_token` from Google Sign-In
- [ ] Backend verifies `id_token` using Google's JWKS keys
- [ ] Backend checks token `aud` (audience) matches your Web Client ID
- [ ] Endpoint: `POST /api/v1/auth/google` exists and works

---

## 🧪 Testing Checklist

### Before Publishing

- [ ] Build production APK: `eas build --platform android --profile production-apk`
- [ ] Install APK on physical device
- [ ] Test Google Sign-In
  - [ ] Can open Google account picker
  - [ ] Can select account
  - [ ] Successfully logs in
  - [ ] User data appears in app
- [ ] Test sign out
- [ ] Test sign in with different account

### After Publishing to Play Store

⚠️ **Google Sign-In will break initially!** This is normal.

- [ ] Download app from Play Store (not side-loaded APK)
- [ ] Try Google Sign-In (will fail with "Developer Error")
- [ ] Get Play Store's SHA-1 from Play Console
- [ ] Create Android OAuth client #2 with Play Store's SHA-1
- [ ] Wait 5-10 minutes for changes to propagate
- [ ] Test Google Sign-In again (should now work!)

---

## 🐛 Troubleshooting

### Error: "Developer Error" or "Sign-in failed"

**Causes:**

- Wrong SHA-1 certificate
- Package name mismatch
- OAuth client not configured

**Fix:**

1. Verify package name is `com.cart.hypermarket` everywhere
2. Check SHA-1 in Android OAuth client matches your build
3. If testing Play Store version, ensure you have Android Client #2 with Play Store's SHA-1

### Error: "Sign in cancelled" (instantly, no picker shown)

**Causes:**

- OAuth consent screen in Testing mode
- Wrong Web Client ID
- App not authorized

**Fix:**

1. Go to Google Cloud Console > OAuth consent screen
2. Click **"Publish App"**
3. Ensure status is **"In production"**, not "Testing"
4. Verify Web Client ID in `socialAuth.ts`

### Error: "Google Play Services not available"

**Cause:** User's device missing/outdated Play Services

**Fix:** Your app already handles this! User will be prompted to update.

### Error: Backend returns "Invalid token"

**Causes:**

- Backend using wrong Client ID for verification
- Token expired
- Token audience (`aud`) doesn't match

**Fix:**

1. Backend should verify token using **Web Client ID**
2. Check token hasn't expired (verify `exp` claim)
3. Verify `aud` claim in token matches your Web Client ID

---

## 📱 Quick Test Commands

### Get your SHA-1 certificate

```bash
cd frontend
eas credentials --platform android
```

### Build production APK

```bash
cd frontend
eas build --platform android --profile production-apk
```

### Build production AAB (for Play Store)

```bash
cd frontend
eas build --platform android --profile production
```

### Check current EAS login

```bash
eas whoami
```

---

## 🔗 Important Links

- **Google Cloud Console:** https://console.cloud.google.com/
- **Google Play Console:** https://play.google.com/console/
- **EAS Dashboard:** https://expo.dev/accounts/loxlo/projects/CART-hypermarket-app
- **OAuth Consent Screen:** https://console.cloud.google.com/apis/credentials/consent
- **Credentials:** https://console.cloud.google.com/apis/credentials

---

## 📝 OAuth Client Summary

| Client Type | Name                          | Package Name         | SHA-1 Source               | Used When                     |
| ----------- | ----------------------------- | -------------------- | -------------------------- | ----------------------------- |
| Web         | CART Web Client               | N/A                  | N/A                        | Always (backend verification) |
| Android #1  | CART Android (Upload Key)     | com.cart.hypermarket | EAS Credentials            | Development, testing          |
| Android #2  | CART Android (Play Store Key) | com.cart.hypermarket | Play Console > App Signing | Production (Play Store)       |

---

## ⚠️ Critical Notes

1. **You MUST have 3 OAuth clients** — 1 Web + 2 Android
2. **OAuth Consent Screen MUST be Published** — not Testing mode
3. **Play Store SHA-1 is different from your upload key SHA-1** — you need both!
4. **Web Client ID goes in your app code** — not the Android Client IDs!
5. **Package name must match everywhere:** `com.cart.hypermarket`
6. **Changes take 5-10 minutes to propagate** — be patient after creating OAuth clients

---

## ✅ Final Verification

Before you publish, verify ALL of these:

- [ ] 3 OAuth clients created in Google Cloud Console
- [ ] OAuth consent screen is Published
- [ ] Web Client ID in `socialAuth.ts` matches Google Cloud Console
- [ ] Package name is `com.cart.hypermarket` in all configs
- [ ] Production API URL set in `.env`
- [ ] Google Sign-In tested on physical device
- [ ] Backend accepts and verifies `id_token` correctly

---

_Last updated: 2026 — CART Hypermarket_
