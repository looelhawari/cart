# 🚀 Complete Production APK & Google Sign-In Setup Guide

**For:** CART Hypermarket Android App  
**Package:** `com.cart.hypermarket`  
**Purpose:** Production Release on Google Play Console

---

## 📋 Table of Contents

1. [Prerequisites & Requirements](#1-prerequisites--requirements)
2. [Build Production APK](#2-build-production-apk)
3. [Google Cloud Console Setup (Critical for Google Sign-In)](#3-google-cloud-console-setup-critical)
4. [Google Play Console Setup](#4-google-play-console-setup)
5. [Upload & Publish](#5-upload--publish)
6. [Verify Google Sign-In Works](#6-verify-google-sign-in-works)
7. [Troubleshooting](#7-troubleshooting)
8. [Future Updates](#8-future-updates)

---

## 1. Prerequisites & Requirements

### ✅ What You Need

- [ ] **Google Play Developer Account** ($25 one-time fee)
- [ ] **Google Cloud Console Project** (for OAuth)
- [ ] **EAS CLI** installed: `npm install -g eas-cli`
- [ ] **Expo Account** (you already have: `loxlo`)
- [ ] **Production API URL** ready
- [ ] **Privacy Policy URL** hosted somewhere
- [ ] **App Screenshots** (at least 2 screenshots)
- [ ] **Feature Graphic** (1024x500px banner)
- [ ] **High-res Icon** (512x512px PNG)

### 📦 Current App Configuration

```
App Name: CART
Package: com.cart.hypermarket
Version: 1.0.1
Version Code: 1
EAS Project ID: 715776f2-baec-4bf9-a749-29e831ca4fd1
Owner: loxlo
```

---

## 2. Build Production APK

### Step 2.1: Update Configuration for Production

#### a) Update `.env` file for production:

```bash
cd frontend

# Create/Edit .env file
API_URL=https://cartshop.site/api/v1
APP_NAME=CART
APP_ENV=production
```

⚠️ **Important:** Change `API_URL` to your production backend URL!

#### b) Update `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 1,
      "package": "com.cart.hypermarket"
    }
  }
}
```

Version code must increment with each release (1, 2, 3, etc.)

### Step 2.2: Build Production APK with EAS

```bash
cd frontend

# Login to EAS (if not already)
eas login

# Build production APK
eas build --platform android --profile production-apk
```

**What happens:**

- EAS builds the APK on their cloud servers
- Build takes 10-20 minutes
- You'll get a download link when done
- Link looks like: `https://expo.dev/artifacts/eas/xxxxx.apk`

**Alternative: Build AAB for Play Store (Recommended)**

```bash
# For Google Play Store, AAB is better (smaller download size)
eas build --platform android --profile production
```

This creates an `.aab` file instead of `.apk`

### Step 2.3: Download the Build

Once complete, EAS will show a download link. Save the file:

- For APK: `CART-production-v1.0.1.apk`
- For AAB: `CART-production-v1.0.1.aab`

### Step 2.4: Get Your Upload Key SHA-1

EAS automatically generates a signing key. Get the SHA-1:

```bash
eas credentials --platform android
```

Select your project, then:

1. Choose "Android credentials"
2. Select "Keystore"
3. Copy the **SHA-1 fingerprint**

You should see something like:

```
SHA-1: E6:ED:21:31:EE:78:08:B1:EC:B2:03:BF:B4:83:EF:10:78:AC:F3:46
SHA-256: D9:78:D5:C3:13:29:2D:7A:7B:30:A7:9A:62:E9:7C:98:03:7E:98:63:CA:A5:92:79:E9:08:99:F6:DA:DF:A6:4A
```

**Save both SHA-1 and SHA-256** — you'll need them!

---

## 3. Google Cloud Console Setup (Critical!)

This is **THE MOST IMPORTANT PART** for Google Sign-In to work in production!

### Step 3.1: Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. Select your project: **cart-hypermarket** (or create one if needed)

### Step 3.2: Enable Google+ API

1. Go to: **APIs & Services > Library**
2. Search for: **"Google+ API"** or **"Google Identity"**
3. Click **Enable** if not already enabled

### Step 3.3: Configure OAuth Consent Screen

1. Go to: **APIs & Services > OAuth consent screen**
2. Select **External** user type
3. Fill in:
   - **App name:** CART Hypermarket
   - **User support email:** your email
   - **Developer contact:** your email
   - **App logo:** Upload your app icon
4. **Scopes:** Add `email`, `profile`, `openid`
5. **Test users:** (Optional, but you can add yourself for testing)
6. **Publishing status:** Click **"Publish App"** (move out of Testing mode)
   - If in Testing mode, only test users can sign in!
   - Publishing is instant for non-sensitive scopes

### Step 3.4: Create Android OAuth Client #1 (EAS Upload Key)

1. Go to: **APIs & Services > Credentials**
2. Click: **Create Credentials > OAuth client ID**
3. Application type: **Android**
4. Fill in:

```
Name: CART Android (Upload Key)
Package name: com.cart.hypermarket
SHA-1 certificate fingerprint: E6:ED:21:31:EE:78:08:B1:EC:B2:03:BF:B4:83:EF:10:78:AC:F3:46
```

(Use YOUR SHA-1 from Step 2.4)

5. Click **Create**
6. Copy the **Client ID** (looks like: `xxxxx-yyyyy.apps.googleusercontent.com`)

### Step 3.5: Create Web OAuth Client (for Backend)

1. Create Credentials > OAuth client ID
2. Application type: **Web application**
3. Fill in:

```
Name: CART Web Client
Authorized JavaScript origins: https://cartshop.site
Authorized redirect URIs: https://cartshop.site/auth/callback
```

4. Click **Create**
5. **Copy the Web Client ID** — this is what your app uses!

Should look like:

```
113273912716-ho3k23v05dodf7gq7tpq5u782chrar3t.apps.googleusercontent.com
```

### Step 3.6: Update Your Frontend Code

Open `frontend/services/socialAuth.ts` and verify the Web Client ID:

```typescript
const GOOGLE_WEB_CLIENT_ID = "YOUR-WEB-CLIENT-ID-HERE";
```

**This MUST match the Web Client ID from Step 3.5!**

### Step 3.7: Create Android OAuth Client #2 (Play Store Signing Key)

⚠️ **DO THIS AFTER uploading to Play Console!**

Google Play re-signs your app with their own key. You need a second Android OAuth client.

1. Upload your APK/AAB to Google Play Console (see Step 4)
2. Go to: **Play Console > Setup > App signing**
3. Find: **"App signing key certificate"** section
4. Copy the **SHA-1 certificate fingerprint** (different from yours!)
5. Go back to: **Google Cloud Console > APIs & Services > Credentials**
6. Create Credentials > OAuth client ID
7. Application type: **Android**
8. Fill in:

```
Name: CART Android (Play Store Key)
Package name: com.cart.hypermarket
SHA-1 certificate fingerprint: [Play Store's SHA-1 from Play Console]
```

9. Click **Create**

### 🎯 Summary: You Need 3 OAuth Clients

| Client Type    | Purpose              | Where It's Used                   |
| -------------- | -------------------- | --------------------------------- |
| **Web Client** | Backend verification | Frontend config (`socialAuth.ts`) |
| **Android #1** | Dev/Upload key       | Local testing, EAS builds         |
| **Android #2** | Play Store key       | Production app from Play Store    |

---

## 4. Google Play Console Setup

### Step 4.1: Create Google Play Developer Account

1. Go to: https://play.google.com/console/signup
2. Pay $25 one-time fee
3. Complete identity verification (takes 24-48 hours)

### Step 4.2: Create New App

1. Go to: https://play.google.com/console/
2. Click: **"Create app"**
3. Fill in:

```
App name: CART Hypermarket
Default language: English
App or game: App
Free or paid: Free
```

4. Check all declaration boxes
5. Click **"Create app"**

### Step 4.3: Complete Store Listing

Navigate to: **Grow > Store presence > Main store listing**

Fill in:

- **App name:** CART Hypermarket
- **Short description:** (80 chars max)
  ```
  Shop groceries & essentials with fast delivery to your door
  ```
- **Full description:** (4000 chars max) — Describe all features:
  - Browse products by category
  - Search & filters
  - Shopping cart
  - Multiple payment methods
  - Real-time order tracking
  - Delivery to your door
  - Google Sign-In for quick login

### Step 4.4: Upload Graphics

Required assets:

| Asset               | Size         | Notes                              |
| ------------------- | ------------ | ---------------------------------- |
| **App icon**        | 512×512 px   | PNG, 32-bit                        |
| **Feature graphic** | 1024×500 px  | Banner for top of listing          |
| **Screenshots**     | Min 2, max 8 | Phone screenshots (any resolution) |

**How to take screenshots:**

1. Run your app: `npx expo run:android`
2. Open Android Emulator
3. Navigate to key screens: Home, Product, Cart, Checkout, Orders
4. Click camera icon in emulator toolbar
5. Screenshots save to Desktop

Upload all to Play Console.

### Step 4.5: Set Content Rating

Navigate to: **Policy > App content > Content rating**

1. Click **"Start questionnaire"**
2. Category: **"Shopping / E-commerce"**
3. Answer questions:
   - Violence: **No**
   - Sexual content: **No**
   - Language: **No**
   - User interaction: **Yes** (can communicate via orders)
   - Location sharing: **Yes** (for delivery)
   - Personal data: **Yes**
4. Submit

### Step 4.6: Data Safety (Required!)

Navigate to: **Policy > App content > Data safety**

Answer honestly about data collection:

**Data types you collect:**

- ✅ **Name** (for account)
- ✅ **Email** (for account)
- ✅ **Phone** (for delivery)
- ✅ **Address** (for delivery)
- ✅ **Location** (for delivery)
- ✅ **Purchase history** (for orders)
- ✅ **Device ID** (for push notifications)

**Security:**

- ✅ All data encrypted in transit (HTTPS)
- ✅ Provide way to delete data (email: support@cartshop.site)

**Sharing:**

- ✅ Data shared with: Payment processor, Google (OAuth)

### Step 4.7: Privacy Policy

You **MUST** have a privacy policy URL.

**Option 1:** Generate one

- Use: https://www.freeprivacypolicy.com/
- Download and host on your website

**Option 2:** Quick template

```
https://cartshop.site/privacy-policy
```

Add this URL in Play Console.

### Step 4.8: Target Audience

Navigate to: **Policy > App content > Target audience**

Select: **18 and over** (recommended for shopping apps)

### Step 4.9: Pricing & Distribution

Navigate to: **Monetization > Pricing**

1. Set: **Free**
2. Select countries/regions where you want to distribute
3. Save

---

## 5. Upload & Publish

### Step 5.1: Upload Your Build

1. Navigate to: **Release > Production**
2. Click: **"Create new release"**
3. **App signing by Google Play:**
   - If first upload, opt in to **Play App Signing** (required)
4. Click: **"Upload"**
5. Select your `.aab` or `.apk` file
6. Wait for upload (1-2 minutes)

### Step 5.2: Release Notes

Write what's new:

```
Initial release of CART Hypermarket!
- Browse products by category
- Easy shopping cart
- Multiple payment methods
- Real-time order tracking
- Google Sign-In for quick access
- Fast delivery to your door
```

### Step 5.3: Review & Start Rollout

1. Click: **"Save"**
2. Review any warnings (yellow are usually OK)
3. Fix any errors (red)
4. Click: **"Start rollout to Production"**
5. Confirm: **"Rollout"**

### Step 5.4: Wait for Review

- Google reviews your app: **24 hours to 7 days**
- First-time apps: Usually **3-7 days**
- You'll get an email when approved
- Status changes to **"Published"**

---

## 6. Verify Google Sign-In Works

### After Your App is Published:

1. **Download from Play Store**
2. **Open the app**
3. **Tap "Sign in with Google"**
4. **Select your Google account**
5. **Should successfully log in!**

### If Google Sign-In Doesn't Work:

**Check these:**

1. ✅ OAuth Consent Screen is **Published** (not Testing)
2. ✅ You have **3 OAuth clients** in Google Cloud Console:
   - 1 Web Client
   - 1 Android Client (Upload Key SHA-1)
   - 1 Android Client (Play Store Key SHA-1)
3. ✅ Web Client ID in `socialAuth.ts` matches Google Cloud Console
4. ✅ Package name is correct: `com.cart.hypermarket`
5. ✅ Backend is accepting the `id_token` correctly

---

## 7. Troubleshooting

### ❌ "Error: Developer Error" during Google Sign-In

**Cause:** SHA-1 mismatch or OAuth client not configured

**Fix:**

1. Go to Google Cloud Console > Credentials
2. Verify Android OAuth client has correct package name
3. Verify SHA-1 matches (check both upload key AND Play Store key)
4. Wait 5 minutes for changes to propagate

### ❌ "Sign in cancelled" immediately

**Cause:** OAuth consent screen in Testing mode OR wrong Client ID

**Fix:**

1. Google Cloud Console > OAuth consent screen
2. Click **"Publish App"**
3. Verify `GOOGLE_WEB_CLIENT_ID` in `socialAuth.ts`

### ❌ "Play Services not available"

**Cause:** User's device doesn't have Google Play Services

**Fix:**

- Prompt user to install/update Google Play Services
- Your app already handles this error

### ❌ App rejected by Google Play

**Common reasons:**

- Missing privacy policy
- Missing data safety form
- Misleading description
- Broken functionality (test thoroughly!)

**Fix:** Check email from Google, fix issues, resubmit

### ❌ "Invalid id_token" on backend

**Cause:** Backend can't verify the token

**Fix:**

1. Ensure backend uses the **Web Client ID** for verification
2. Verify token audience (`aud` field) matches Web Client ID
3. Check token hasn't expired
4. Backend should fetch Google's JWKS keys to verify signature

---

## 8. Future Updates

### When You Need to Push an Update:

#### Step 1: Update version

Edit `frontend/app.json`:

```json
{
  "expo": {
    "version": "1.0.2",
    "android": {
      "versionCode": 2
    }
  }
}
```

**Rules:**

- `version` is user-facing (1.0.2, 1.0.3, etc.)
- `versionCode` MUST increment as integer (1, 2, 3, 4...)

#### Step 2: Rebuild

```bash
cd frontend

# For AAB (recommended)
eas build --platform android --profile production

# For APK
eas build --platform android --profile production-apk
```

#### Step 3: Upload to Play Console

1. Go to: **Release > Production**
2. Click: **"Create new release"**
3. Upload new `.aab` or `.apk`
4. Write release notes (what changed)
5. Click: **"Start rollout"**

#### Step 4: Review

- Updates usually review faster: **1-3 days**
- Users get auto-update within 24 hours

---

## 📝 Quick Checklist

Before you publish, verify:

- [ ] `.env` has production `API_URL`
- [ ] `app.json` version incremented
- [ ] APK/AAB built with EAS
- [ ] Google Cloud Console has 3 OAuth clients (1 Web + 2 Android)
- [ ] OAuth Consent Screen is **Published**
- [ ] `socialAuth.ts` has correct Web Client ID
- [ ] Privacy policy URL added to Play Console
- [ ] All Play Console sections complete (green checkmarks)
- [ ] Screenshots uploaded
- [ ] Data safety form completed
- [ ] Content rating received
- [ ] Test credentials provided (if needed)

---

## 🎯 Your Current Configuration

```
App Name: CART
Package: com.cart.hypermarket
Version: 1.0.1
Version Code: 1

Google Cloud Project: cart-hypermarket
Firebase Project: 774149614383

Current Web Client ID:
113273912716-ho3k23v05dodf7gq7tpq5u782chrar3t.apps.googleusercontent.com

Current API URL (development):
http://192.168.100.7:8000/api/v1

Production API URL (needs update):
https://cartshop.site/api/v1
```

---

## 🆘 Need Help?

**Common Support Channels:**

- Expo Discord: https://chat.expo.dev/
- Stack Overflow: Tag `expo`, `google-signin`, `android`
- Google Cloud Support: https://cloud.google.com/support
- Play Console Help: https://support.google.com/googleplay/android-developer

---

## ✅ Final Words

**Key Points:**

1. **SHA-1 certificates:** You need TWO Android OAuth clients (upload key + Play Store key)
2. **OAuth Consent Screen:** MUST be Published, not Testing
3. **Web Client ID:** Used in your app config, verified by backend
4. **Package name:** Must match everywhere: `com.cart.hypermarket`
5. **Test thoroughly:** Before submitting, test Google Sign-In end-to-end

**Timeline:**

- Build APK: 15-20 minutes
- Play Console setup: 1-2 hours
- Google review: 3-7 days (first time)
- Updates: 1-3 days

Good luck with your launch! 🚀

---

_Guide created for CART Hypermarket — Production Release 2026_
