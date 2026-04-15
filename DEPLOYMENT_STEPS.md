# 🚀 Step-by-Step Production Deployment

**Follow these steps IN ORDER for a successful production release**

---

## Phase 1: Preparation (30 minutes)

### ✅ Step 1: Update Production Configuration

```bash
cd frontend
```

Edit `.env` file:

```bash
API_URL=https://cartshop.site/api/v1
APP_ENV=production
APP_NAME=CART
```

⚠️ **Critical:** Use your PRODUCTION backend URL!

### ✅ Step 2: Verify App Configuration

Check `frontend/app.json`:

```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "package": "com.cart.hypermarket",
      "versionCode": 1
    }
  }
}
```

### ✅ Step 3: Verify Google Sign-In Config

Check `frontend/services/socialAuth.ts` line 28:

```typescript
const GOOGLE_WEB_CLIENT_ID =
  "113273912716-ho3k23v05dodf7gq7tpq5u782chrar3t.apps.googleusercontent.com";
```

This should be your **Web Client ID** from Google Cloud Console.

---

## Phase 2: Build Production APK (20 minutes)

### ✅ Step 4: Login to EAS

```bash
cd frontend
eas login
```

Use account: **loxlo**

### ✅ Step 5: Build Production APK

**Option A: Build AAB for Play Store (Recommended)**

```bash
eas build --platform android --profile production
```

**Option B: Build APK for testing**

```bash
eas build --platform android --profile production-apk
```

Wait 15-20 minutes for build to complete.

### ✅ Step 6: Get SHA-1 Certificate

```bash
eas credentials --platform android
```

Select:

1. Android credentials
2. Keystore
3. **Copy the SHA-1 fingerprint** (something like: `E6:ED:21:31:EE:78:08:B1:EC:B2:03:BF:B4:83:EF:10:78:AC:F3:46`)

**Save this!** You need it for Google Cloud Console.

### ✅ Step 7: Download Your Build

When build completes, EAS will show a download link:

```
https://expo.dev/artifacts/eas/xxxxx.aab
```

Download and save as: `CART-v1.0.1.aab` or `CART-v1.0.1.apk`

---

## Phase 3: Google Cloud Console Setup (15 minutes)

### ✅ Step 8: Configure OAuth Consent Screen

1. Go to: https://console.cloud.google.com/
2. Select project: **cart-hypermarket**
3. Navigate to: **APIs & Services > OAuth consent screen**
4. Fill in:
   - App name: **CART Hypermarket**
   - User support email: your email
   - Scopes: `email`, `profile`, `openid`
5. **Click "Publish App"** ← CRITICAL! Move out of Testing mode
6. Verify status shows: **"In production"**

### ✅ Step 9: Create Web OAuth Client

1. Go to: **APIs & Services > Credentials**
2. Click: **Create Credentials > OAuth client ID**
3. Application type: **Web application**
4. Name: **CART Web Client**
5. Authorized JavaScript origins: `https://cartshop.site`
6. Click: **Create**
7. **Copy the Client ID** (format: `xxxxx-yyyyy.apps.googleusercontent.com`)

⚠️ **This Client ID goes in your `socialAuth.ts` file!**

### ✅ Step 10: Create Android OAuth Client #1 (Upload Key)

1. Still in: **APIs & Services > Credentials**
2. Click: **Create Credentials > OAuth client ID**
3. Application type: **Android**
4. Name: **CART Android (Upload Key)**
5. Package name: `com.cart.hypermarket`
6. SHA-1 certificate fingerprint: **[Paste SHA-1 from Step 6]**
7. Click: **Create**

✅ Now you have 2 OAuth clients (Web + Android)

---

## Phase 4: Google Play Console Setup (1-2 hours)

### ✅ Step 11: Create Google Play Developer Account

**If you don't have one yet:**

1. Go to: https://play.google.com/console/signup
2. Pay $25 one-time fee
3. Complete identity verification (takes 24-48 hours)
4. Wait for approval email

**If you already have one:** Skip to Step 12.

### ✅ Step 12: Create New App

1. Go to: https://play.google.com/console/
2. Click: **"Create app"**
3. Fill in:
   - App name: **CART Hypermarket**
   - Default language: **English**
   - App or game: **App**
   - Free or paid: **Free**
4. Check all declaration boxes
5. Click: **"Create app"**

### ✅ Step 13: Complete Store Listing

Navigate to: **Grow > Store presence > Main store listing**

Fill in:

- **Short description** (80 chars):

  ```
  Shop groceries & essentials with fast delivery to your door
  ```

- **Full description** (detailed):

  ```
  CART Hypermarket - Your One-Stop Shop for Fresh Groceries!

  🛒 Shop Smart, Shop Fresh
  Browse thousands of products across all categories - from fresh produce
  to household essentials. Everything you need, delivered to your door.

  ✨ Features:
  • Easy product browsing by category
  • Smart search & filters
  • Shopping cart with saved items
  • Multiple secure payment methods
  • Real-time order tracking
  • Google Sign-In for quick access
  • Push notifications for order updates
  • Address management for delivery
  • Order history & reordering

  📦 Fast Delivery
  Track your order in real-time from store to your doorstep.

  🔒 Secure & Safe
  Your data is encrypted and secure. Multiple payment options available.

  Download CART now and start shopping!
  ```

### ✅ Step 14: Upload Graphics

**Required assets:**

| Asset           | Size        | How to Create                        |
| --------------- | ----------- | ------------------------------------ |
| App icon        | 512×512 px  | Export high-res version of your icon |
| Feature graphic | 1024×500 px | Create a banner (use Canva/Figma)    |
| Screenshots     | Min 2       | Take from emulator (see below)       |

**How to take screenshots:**

1. Run: `npx expo run:android`
2. Open app in emulator
3. Navigate to: Home, Products, Cart, Checkout, Orders, Profile
4. Click camera icon in emulator toolbar
5. Screenshots save to Desktop

Upload all to Play Console.

### ✅ Step 15: Set Content Rating

Navigate to: **Policy > App content > Content rating**

1. Click: **"Start questionnaire"**
2. Email: your email
3. Category: **"Other"**
4. Answer questions:
   - Violence: **No**
   - Sexual content: **No**
   - Language: **No**
   - User interaction: **Yes** (users can interact via orders)
   - Location: **Yes** (for delivery)
   - Personal info: **Yes** (for account)
5. Click: **"Submit"**

### ✅ Step 16: Complete Data Safety

Navigate to: **Policy > App content > Data safety**

1. Click: **"Start"**
2. Does your app collect data? **Yes**
3. Select data types:
   - ✅ Name
   - ✅ Email address
   - ✅ Phone number
   - ✅ Address
   - ✅ Approximate location
   - ✅ Purchase history
   - ✅ Device or other IDs
4. Is data encrypted in transit? **Yes**
5. Can users request data deletion? **Yes** (provide email: support@cartshop.site)
6. Data shared with? **Yes** - Payment processor, Google (OAuth)
7. Click: **"Save"**

### ✅ Step 17: Add Privacy Policy

Navigate to: **Policy > App content > Privacy policy**

**You MUST have a privacy policy URL!**

Options:

- **Option 1:** Use https://www.freeprivacypolicy.com/ to generate one
- **Option 2:** Host your own at `https://cartshop.site/privacy-policy`

Enter the URL and save.

### ✅ Step 18: Set Target Audience

Navigate to: **Policy > App content > Target audience**

- Select: **18 and over**
- Click: **"Save"**

### ✅ Step 19: Complete Other Sections

Quick answers:

- **Ads:** No
- **News app:** No
- **COVID-19 app:** No
- **Government app:** No
- **Financial features:** No

---

## Phase 5: Upload & Publish (30 minutes)

### ✅ Step 20: Upload Your Build

1. Navigate to: **Release > Production**
2. Click: **"Create new release"**
3. **Opt in to Play App Signing** (if first upload)
4. Click: **"Upload"**
5. Select your `.aab` or `.apk` file from Step 7
6. Wait for upload (1-2 minutes)

### ✅ Step 21: Write Release Notes

In "Release notes" section:

```
Initial release of CART Hypermarket!

• Browse thousands of products
• Easy shopping cart
• Multiple secure payment methods
• Real-time order tracking
• Google Sign-In for quick access
• Fast delivery to your door
```

### ✅ Step 22: Review Dashboard

1. Go to: **Dashboard**
2. Check **"Set up your app"** section on right
3. **ALL items must show green checkmarks ✅**
4. If any are incomplete, click them and finish

### ✅ Step 23: Get Play Store's SHA-1

⚠️ **IMPORTANT:** Do this AFTER uploading!

1. Navigate to: **Setup > App signing**
2. Find: **"App signing key certificate"** section
3. **Copy the SHA-1 certificate fingerprint**

This is DIFFERENT from your upload key SHA-1!

### ✅ Step 24: Create Android OAuth Client #2 (Play Store Key)

1. Go back to: **Google Cloud Console > APIs & Services > Credentials**
2. Click: **Create Credentials > OAuth client ID**
3. Application type: **Android**
4. Name: **CART Android (Play Store Key)**
5. Package name: `com.cart.hypermarket`
6. SHA-1 certificate fingerprint: **[Paste SHA-1 from Step 23]**
7. Click: **Create**

✅ Now you have 3 OAuth clients total!

### ✅ Step 25: Start Rollout

1. Go to: **Release > Production**
2. Open your draft release
3. Review any warnings (yellow = OK, fix any red errors)
4. Click: **"Start rollout to Production"**
5. Confirm: **"Rollout"**

---

## Phase 6: Wait for Review (3-7 days)

### ✅ Step 26: Monitor Review Status

- Check your email daily
- Status: **Release > Production > Publishing overview**
- First-time apps: Usually **3-7 days**
- Updates: Usually **1-3 days**

### ✅ Step 27: If Rejected

Common reasons:

- Missing privacy policy
- Incomplete data safety
- Broken functionality
- Misleading description

**Fix:** Read rejection email, fix issues, click "Resubmit"

---

## Phase 7: Post-Launch Verification (15 minutes)

### ✅ Step 28: Download from Play Store

Once status shows **"Published"**:

1. Open Play Store on your phone
2. Search: **"CART Hypermarket"**
3. Download the app

### ✅ Step 29: Test Google Sign-In

1. Open app
2. Tap: **"Sign in with Google"**
3. Select your Google account
4. Should successfully log in! ✅

**If it doesn't work:**

- Wait 10 minutes for OAuth changes to propagate
- Verify you completed Step 24 (Android OAuth Client #2)
- Check troubleshooting section below

### ✅ Step 30: Test Full Flow

Test these features:

- [ ] Browse products
- [ ] Search
- [ ] Add to cart
- [ ] Checkout
- [ ] Payment
- [ ] Order tracking
- [ ] Profile
- [ ] Sign out

---

## 🐛 Quick Troubleshooting

### Google Sign-In Shows "Developer Error"

**Fix:**

1. Verify OAuth Consent Screen is **Published** (not Testing)
2. Check you have Android OAuth Client #2 with Play Store's SHA-1
3. Wait 10 minutes, try again

### Google Sign-In Cancelled Immediately

**Fix:**

1. Google Cloud Console > OAuth consent screen
2. Click **"Publish App"**
3. Wait 5 minutes

### Backend Returns "Invalid Token"

**Fix:**

1. Backend should verify using **Web Client ID**
2. Check token hasn't expired
3. Verify `aud` claim matches your Web Client ID

---

## 📊 Summary of OAuth Clients

You should have created **3 OAuth clients** total:

| #   | Type    | Name                          | SHA-1 Source    | When Created |
| --- | ------- | ----------------------------- | --------------- | ------------ |
| 1   | Web     | CART Web Client               | N/A             | Step 9       |
| 2   | Android | CART Android (Upload Key)     | EAS credentials | Step 10      |
| 3   | Android | CART Android (Play Store Key) | Play Console    | Step 24      |

---

## ✅ Verification Checklist

Before submitting to Play Store:

- [ ] Production API URL in `.env`
- [ ] Web Client ID in `socialAuth.ts`
- [ ] APK/AAB built with EAS
- [ ] OAuth Consent Screen is **Published**
- [ ] 2 Android OAuth clients created (will create 3rd after upload)
- [ ] All Play Console sections complete (green checkmarks)
- [ ] Privacy policy URL added
- [ ] Screenshots uploaded
- [ ] Data safety completed
- [ ] Content rating received

---

## 🎯 Timeline Estimate

| Phase                        | Duration     |
| ---------------------------- | ------------ |
| Preparation                  | 30 minutes   |
| Building APK                 | 20 minutes   |
| Google Cloud Setup           | 15 minutes   |
| Play Console Setup           | 1-2 hours    |
| Upload & Publish             | 30 minutes   |
| **Google Review**            | **3-7 days** |
| Post-launch testing          | 15 minutes   |
| **Total (excluding review)** | **~3 hours** |

---

## 📞 Need Help?

- **Expo Discord:** https://chat.expo.dev/
- **Play Console Help:** https://support.google.com/googleplay/android-developer
- **Google Cloud Support:** https://cloud.google.com/support

---

## 🎉 You're Done!

Once you complete all 30 steps, your app will be:

- ✅ Published on Google Play Store
- ✅ Google Sign-In working in production
- ✅ Ready for users to download
- ✅ Secure and properly configured

**Congratulations on your launch! 🚀**

---

_CART Hypermarket — Production Deployment Guide 2026_
