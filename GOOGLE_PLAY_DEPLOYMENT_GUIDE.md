# Google Play Store Deployment Guide — CART Hypermarket

> **Build artifact:** https://expo.dev/artifacts/eas/b9TsiSB39ZYXRASUf1t4ML.aab  
> **Package name:** `com.cart.hypermarket`  
> **SHA-1 Fingerprint:** `E6:ED:21:31:EE:78:08:B1:EC:B2:03:BF:B4:83:EF:10:78:AC:F3:46`

---

## Table of Contents

1. [Download the AAB File](#step-1-download-the-aab-file)
2. [Create a Google Play Developer Account](#step-2-create-a-google-play-developer-account)
3. [Create the App on Google Play Console](#step-3-create-the-app-on-google-play-console)
4. [Set Up the Store Listing](#step-4-set-up-the-store-listing)
5. [Configure Google Cloud Console (OAuth / Google Sign-In)](#step-5-configure-google-cloud-console-for-google-sign-in)
6. [Upload the AAB to Production Track](#step-6-upload-the-aab-to-production-track)
7. [Content Rating Questionnaire](#step-7-content-rating-questionnaire)
8. [Pricing & Distribution](#step-8-pricing--distribution)
9. [App Content (Data Safety)](#step-9-app-content-data-safety)
10. [Review & Publish](#step-10-review--publish)
11. [Post-Launch Checklist](#step-11-post-launch-checklist)

---

## Step 1: Download the AAB File

1. Open this link in your browser:
   ```
   https://expo.dev/artifacts/eas/b9TsiSB39ZYXRASUf1t4ML.aab
   ```
2. The `.aab` file will download automatically
3. Save it somewhere you can find it (e.g., `Downloads/CART-Hypermarket.aab`)

> **What is AAB?** Android App Bundle — Google Play's required upload format. Google generates optimized APKs from it for each device.

---

## Step 2: Create a Google Play Developer Account

> **Skip this step if you already have a Google Play Developer account.**

1. Go to **https://play.google.com/console/signup**
2. Sign in with your Google account
3. Accept the Developer Distribution Agreement
4. Pay the **one-time $25 registration fee**
5. Complete identity verification:
   - **Personal account:** Provide government-issued ID
   - **Organization account:** Provide organization documents (D-U-N-S number)
6. Wait for verification (can take **24–48 hours** for personal, **up to 7 days** for organization)

> ⚠️ **Important:** Google now requires identity verification before you can publish any app. Start this early.

---

## Step 3: Create the App on Google Play Console

1. Go to **https://play.google.com/console/**
2. Click **"Create app"** (top-right blue button)
3. Fill in the form:

   | Field | Value |
   |-------|-------|
   | **App name** | `CART Hypermarket` |
   | **Default language** | English (or Arabic — your choice) |
   | **App or game** | App |
   | **Free or paid** | Free |

4. Check **all declaration boxes** (content guidelines, US export laws, etc.)
5. Click **"Create app"**

---

## Step 4: Set Up the Store Listing

Navigate to: **Grow > Store presence > Main store listing**

### 4.1 — App Details

| Field | What to Enter |
|-------|---------------|
| **App name** | `CART Hypermarket` |
| **Short description** | A short blurb (max 80 chars), e.g. `"Shop groceries, fresh produce & household essentials — delivered fast."` |
| **Full description** | Detailed description (max 4000 chars). Describe all features: browsing, cart, ordering, delivery tracking, payment, etc. |

### 4.2 — Graphics (Required)

You **must** provide these assets or Google will reject the listing:

| Asset | Spec | Notes |
|-------|------|-------|
| **App icon** | 512 × 512 px, PNG, 32-bit | Your app icon (high-res) |
| **Feature graphic** | 1024 × 500 px, PNG or JPG | Banner shown at top of store listing |
| **Phone screenshots** | Min 2, max 8. Between 320–3840 px each side, 16:9 or 9:16 | Take screenshots from your device/emulator |
| **Tablet screenshots** | Optional but recommended (7" and 10") | Same guidelines as phone |

#### How to take screenshots:
- Run your app on an emulator or device
- Navigate to key screens (home, product, cart, checkout, order tracking)
- Take screenshots (on Android emulator: click camera icon in toolbar)
- Recommended screens: **Home**, **Product Detail**, **Cart**, **Checkout**, **Order Tracking**, **Profile**

### 4.3 — Save

Click **"Save"** at the bottom of the page.

---

## Step 5: Configure Google Cloud Console (for Google Sign-In)

This is **critical** for Google OAuth to work in production.

### 5.1 — Go to Google Cloud Console

1. Open **https://console.cloud.google.com/**
2. Select your project (the one with your Google Sign-In OAuth clients)

### 5.2 — Add the Production SHA-1

1. Navigate to **APIs & Services > Credentials**
2. Find your **Android OAuth 2.0 Client ID** (or create one)
3. Click on it to edit
4. Fill in:

   | Field | Value |
   |-------|-------|
   | **Package name** | `com.cart.hypermarket` |
   | **SHA-1 certificate fingerprint** | `E6:ED:21:31:EE:78:08:B1:EC:B2:03:BF:B4:83:EF:10:78:AC:F3:46` |

5. Click **Save**

### 5.3 — Also Add Google Play's Signing Certificate SHA-1

> Google Play re-signs your app with their own key. You need BOTH SHA-1s.

1. Go to **Google Play Console > Your App > Setup > App signing**
2. Find **"App signing key certificate"** section
3. Copy the **SHA-1 certificate fingerprint** shown there
4. Go back to **Google Cloud Console > APIs & Services > Credentials**
5. **Create a NEW Android OAuth client** (or update existing) with:
   - Package name: `com.cart.hypermarket`
   - SHA-1: **(the one from Google Play's App Signing page)**
6. Save

> ⚠️ **You will have TWO Android OAuth clients:** one with your upload key SHA-1, one with Google Play's signing key SHA-1. Both are needed.

### 5.4 — Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Make sure it's published (not in "Testing" mode)
3. If in Testing mode, click **"Publish App"**
4. Add `com.cart.hypermarket` to authorized domains if needed

---

## Step 6: Upload the AAB to Production Track

### 6.1 — Create a Release

1. In Google Play Console, navigate to: **Release > Production**
2. Click **"Create new release"**
3. **App signing by Google Play:**
   - If this is your first upload, Google will ask you to opt in to **Play App Signing**
   - Click **"Continue"** — this is required and recommended
4. **Upload your AAB:**
   - Click **"Upload"** and select the `.aab` file you downloaded in Step 1
   - Wait for upload and processing (30 seconds to 2 minutes)
5. **Release name:** `1.0.0` (or leave default)
6. **Release notes:** Write what's new (in the languages you support):
   ```
   Initial release of CART Hypermarket!
   - Browse products by category
   - Add to cart and checkout
   - Multiple payment methods
   - Real-time order tracking
   - Delivery to your door
   ```
7. Click **"Next"**

### 6.2 — Review Warnings

- Google may show warnings about:
  - **Permissions:** Review any flagged permissions
  - **Native code:** Normal for React Native apps
  - **API level:** Make sure targetSdk is current
- Fix any **errors** (red). Warnings (yellow) are usually OK to proceed.

8. Click **"Save"**

> ⚠️ **Don't click "Start rollout" yet** — you need to complete Steps 7–9 first.

---

## Step 7: Content Rating Questionnaire

Navigate to: **Policy > App content > Content rating**

1. Click **"Start questionnaire"**
2. Enter your **email address**
3. Select **category:** "Utility, Productivity, Communication, or Other"
4. Answer the questions honestly:
   - Violence: **No**
   - Sexual content: **No**
   - Language: **No** (unless your app has user-generated content)
   - Controlled substances: **No**
   - User interaction: **Yes** (users can communicate/interact via orders)
   - Users can share location: **Yes** (for delivery)
   - Does the app collect personal data: **Yes**
5. Click **"Save"** then **"Next"**
6. Review ratings and click **"Submit"**

---

## Step 8: Pricing & Distribution

Navigate to: **Monetization > Pricing**

1. Set your app as **Free**

> ⚠️ **Warning:** Once published as Free, you **cannot** change it to Paid later.

### Countries / Regions

Navigate to: **Release > Production > Countries / regions**

1. Click **"Add countries / regions"**
2. Select the countries where you want to distribute
3. Click **"Add countries"**

---

## Step 9: App Content (Data Safety)

Navigate to: **Policy > App content**

Complete ALL sections (all are required):

### 9.1 — Privacy Policy

1. You **must** have a privacy policy URL
2. If you don't have one, create one at [privacypolicygenerator.info](https://www.privacypolicygenerator.info/) or similar
3. Host it on your website (e.g., `https://your-domain.com/privacy-policy`)
4. Enter the URL

### 9.2 — Data Safety

Click **"Start"** on the Data Safety section. Answer truthfully:

| Question | Likely Answer for CART |
|----------|----------------------|
| Does your app collect or share user data? | **Yes** |
| Does your app collect any of these data types? | **Yes** — check: Name, Email, Phone, Address, Purchase history, Location |
| Is all collected data encrypted in transit? | **Yes** (you use HTTPS) |
| Do you provide a way for users to request data deletion? | **Yes** (provide mechanism or email) |
| Data shared with third parties? | **Yes** — Payment processor, Google (analytics/auth) |

Fill in each data type:
- **Personal info (Name, Email, Phone):** Collected, not shared, required, encrypted
- **Location:** Collected for delivery, not shared, optional
- **Financial info (Purchase history):** Collected, not shared, required
- **Device identifiers:** Collected for push notifications

### 9.3 — Ads

1. Does your app contain ads? → **No** (assuming no ads)

### 9.4 — App Access

1. If parts of your app require login, provide **test credentials**:
   - Create a test account on your backend
   - Provide email/password to Google's review team
2. If all content is accessible without login → select "All functionality is available without special access"

### 9.5 — Target Audience

1. Select target age group: **18 and over** (recommended for shopping apps)
2. Confirm no appeal to children

### 9.6 — News App

1. Is this a news app? → **No**

### 9.7 — COVID-19 Contact Tracing / Health Apps

1. Is this a health app? → **No**

### 9.8 — Government Apps

1. Is this a government app? → **No**

### 9.9 — Financial Features

1. Does the app provide financial services? → **No** (unless you have a built-in wallet/fintech)

---

## Step 10: Review & Publish

### 10.1 — Dashboard Check

1. Go to **Dashboard** in Play Console
2. Look at the **"Set up your app"** checklist on the right side
3. **ALL items must show green checkmarks ✅**
4. Common missing items:
   - Store listing not complete
   - Content rating not done
   - Data safety not filled
   - Privacy policy missing
   - Target audience not set

### 10.2 — Start Rollout

1. Go to **Release > Production**
2. Click on your release
3. Click **"Start rollout to Production"**
4. Confirm by clicking **"Rollout"**

### 10.3 — Review Process

- Google will review your app (typically **24 hours to 7 days** for a new app)
- First-time apps usually take **3–7 days**
- You'll get an email when approved or if there are issues
- Status changes to **"Published"** when approved

---

## Step 11: Post-Launch Checklist

### 11.1 — Verify Google Sign-In Works

1. Download the app from Play Store
2. Test Google Sign-In end-to-end
3. If it doesn't work, double-check Step 5 (both SHA-1 certificates)

### 11.2 — Monitor Crashes

1. Go to **Quality > Android Vitals** in Play Console
2. Check for ANRs (Application Not Responding) and crashes
3. Also set up crash reporting (e.g., Sentry, Firebase Crashlytics)

### 11.3 — Respond to Reviews

1. Go to **Ratings and reviews**
2. Respond to user reviews promptly

### 11.4 — Future Updates

When you need to push an update:

```bash
# 1. Bump version in app.json
#    Increment "version" and "android.versionCode"

# 2. Regenerate native code
npx expo prebuild --platform android --clean

# 3. Build new AAB
npx eas build --platform android --profile production

# 4. Upload new AAB to Play Console
#    Release > Production > Create new release > Upload
```

---

## Quick Reference — Your App Details

| Item | Value |
|------|-------|
| **App Name** | CART Hypermarket |
| **Package Name** | `com.cart.hypermarket` |
| **Version** | 1.0.0 |
| **Version Code** | 1 |
| **AAB Download** | https://expo.dev/artifacts/eas/b9TsiSB39ZYXRASUf1t4ML.aab |
| **Upload Key SHA-1** | `E6:ED:21:31:EE:78:08:B1:EC:B2:03:BF:B4:83:EF:10:78:AC:F3:46` |
| **Upload Key SHA-256** | `D9:78:D5:C3:13:29:2D:7A:7B:30:A7:9A:62:E9:7C:98:03:7E:98:63:CA:A5:92:79:E9:08:99:F6:DA:DF:A6:4A` |
| **EAS Project** | https://expo.dev/accounts/kareemh122/projects/CART-hypermarket-app |

---

## Troubleshooting

### "App not published" after several days
- Check your email for rejection notices
- Go to **Publishing overview** to see review status
- Common rejection reasons: missing privacy policy, misleading description, broken functionality

### Google Sign-In not working in production
- You need **two** Android OAuth clients in Google Cloud Console:
  1. One with your **upload key SHA-1** (from EAS: `E6:ED:21:...`)
  2. One with **Google Play's app signing key SHA-1** (found in Play Console > Setup > App signing)
- Make sure OAuth consent screen is **Published** (not Testing)

### Push notifications not working
- Set up **Firebase Cloud Messaging (FCM)** in Firebase Console
- Upload the FCM server key to EAS: `npx eas credentials`
- Add `google-services.json` to your project

### App rejected for permissions
- Remove unused permissions from `app.json`
- Provide justification for sensitive permissions (camera, location, etc.)
- Add in-app permission explanations before requesting them

---

*Guide created for CART Hypermarket — February 2026*
