# 📦 PRODUCTION APK - QUICK START GUIDE

**Everything you need to deploy CART Hypermarket to Google Play Store**

---

## 🎯 What You're About to Do

1. Build a production APK/AAB for your Android app
2. Set up Google Sign-In to work in production
3. Upload to Google Play Console
4. Publish for millions of users!

**Time needed:** ~3 hours (excluding Google's review: 3-7 days)

---

## 📚 Documentation Overview

I've created **5 comprehensive guides** for you:

### 1️⃣ **DEPLOYMENT_STEPS.md** ← START HERE!

- **30-step checklist** from start to finish
- Follow this IN ORDER
- Includes exact commands and configurations
- **Recommended for first-time deployment**

### 2️⃣ **PRODUCTION_APK_COMPLETE_GUIDE.md**

- Detailed explanation of every concept
- Troubleshooting section
- Best practices
- **Reference guide** when you need details

### 3️⃣ **GOOGLE_SIGNIN_CHECKLIST.md**

- Quick checklist for Google Sign-In setup
- What you need, where to find it
- **Use this to verify** your OAuth configuration

### 4️⃣ **GOOGLE_SIGNIN_ARCHITECTURE.md**

- Visual diagrams of OAuth flow
- Explains WHY you need 3 OAuth clients
- Common mistakes & fixes
- **Read this to understand** how it works

### 5️⃣ **GOOGLE_PLAY_DEPLOYMENT_GUIDE.md** (already existed)

- Your original guide with SHA-1 details
- AAB download link
- Good for reference

---

## ⚡ Quick Start (TL;DR)

### Step 1: Prepare

```bash
cd frontend

# Edit .env - set production API URL
notepad .env
# Change to: API_URL=https://cartshop.site/api/v1
```

### Step 2: Build

```bash
# Login to EAS
eas login

# Build production APK
eas build --platform android --profile production

# Get SHA-1 certificate
eas credentials --platform android
# Copy the SHA-1 fingerprint!
```

### Step 3: Google Cloud Setup

1. Go to: https://console.cloud.google.com/
2. Create **3 OAuth clients:**
   - 1 Web Client (for backend)
   - 1 Android Client (Upload Key SHA-1)
   - 1 Android Client (Play Store SHA-1) ← Do this AFTER uploading
3. **Publish** OAuth consent screen (not Testing!)

### Step 4: Google Play Console

1. Go to: https://play.google.com/console/
2. Create app: **CART Hypermarket**
3. Complete ALL sections (store listing, content rating, data safety, etc.)
4. Upload your APK/AAB
5. Start rollout

### Step 5: Wait & Verify

1. Wait for Google's review (3-7 days)
2. Download from Play Store
3. Test Google Sign-In
4. Done! 🎉

---

## 🔑 Critical Information

### Your App Details

```
App Name:        CART Hypermarket
Package Name:    com.cart.hypermarket
Version:         1.0.1
Version Code:    1
EAS Project:     715776f2-baec-4bf9-a749-29e831ca4fd1
Owner:           loxlo
```

### OAuth Configuration

You need **3 OAuth clients** in Google Cloud Console:

| Type           | Purpose              | SHA-1 Source    | When to Create  |
| -------------- | -------------------- | --------------- | --------------- |
| **Web**        | Backend verification | N/A             | Before building |
| **Android #1** | Dev/testing          | EAS credentials | Before building |
| **Android #2** | Production           | Play Console    | AFTER uploading |

### Current Configuration

**Web Client ID (in your code):**

```
113273912716-ho3k23v05dodf7gq7tpq5u782chrar3t.apps.googleusercontent.com
```

**Location:** `frontend/services/socialAuth.ts` line 28

**⚠️ Verify this matches your Google Cloud Console!**

---

## ⚙️ Automated Build Script

I've created a helper script: **build-production-apk.bat**

```bash
# Double-click this file or run:
build-production-apk.bat
```

**What it does:**

1. Checks your environment
2. Verifies production API URL
3. Logs into EAS
4. Builds production APK
5. Shows you the SHA-1 certificate

---

## 🎨 Assets You Need

Before uploading to Play Console, prepare:

| Asset               | Size        | Requirement                  |
| ------------------- | ----------- | ---------------------------- |
| **App icon**        | 512×512 px  | High-res PNG of your icon    |
| **Feature graphic** | 1024×500 px | Banner for store listing     |
| **Screenshots**     | Any size    | Min 2, max 8 (phone screens) |
| **Privacy policy**  | URL         | Must be hosted somewhere     |

### How to Get Screenshots

```bash
# Run your app
npx expo run:android

# In emulator:
1. Navigate to: Home, Products, Cart, Checkout, Orders
2. Click camera icon in toolbar
3. Screenshots save to Desktop
```

---

## 🔐 Google Sign-In Setup (Critical!)

### The 3 OAuth Clients Explained

```
┌─────────────────────────────────────────────────┐
│         Google Cloud Console                    │
│                                                 │
│  1. Web Client                                 │
│     → Used by: Backend (token verification)    │
│     → ID goes in: socialAuth.ts                │
│                                                 │
│  2. Android Client #1 (Upload Key)            │
│     → Used by: Development, EAS builds         │
│     → SHA-1 from: eas credentials              │
│                                                 │
│  3. Android Client #2 (Play Store Key)        │
│     → Used by: Production (Play Store)         │
│     → SHA-1 from: Play Console > App signing   │
│     → Create AFTER uploading!                  │
└─────────────────────────────────────────────────┘
```

### Why Google Sign-In Breaks (and How to Fix)

**Common issue:** Works in dev, fails in production!

**Reason:** Missing Android OAuth Client #2

**Fix:**

1. Upload APK to Play Console
2. Go to: Play Console → Setup → App signing
3. Copy Play Store's SHA-1 certificate
4. Create Android OAuth Client #2 with this SHA-1
5. Wait 10 minutes
6. Try again - should work! ✅

---

## 📋 Pre-Flight Checklist

Before you start, verify you have:

- [ ] Google Play Developer account ($25 paid)
- [ ] Google Cloud Console project created
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Expo account (you have: loxlo)
- [ ] Production backend URL ready
- [ ] Privacy policy URL ready

---

## 🚀 Follow These Steps IN ORDER

### Phase 1: Local Setup (15 min)

→ **Read:** DEPLOYMENT_STEPS.md (Steps 1-3)

- Update `.env` with production API URL
- Verify `app.json` configuration
- Check `socialAuth.ts` has correct Web Client ID

### Phase 2: Build APK (20 min)

→ **Read:** DEPLOYMENT_STEPS.md (Steps 4-7)

- Run: `eas build --platform android --profile production`
- Get SHA-1 from: `eas credentials --platform android`
- Download your build

### Phase 3: Google Cloud (15 min)

→ **Read:** DEPLOYMENT_STEPS.md (Steps 8-10)

- Create Web OAuth Client
- Create Android OAuth Client #1
- Publish OAuth Consent Screen

### Phase 4: Play Console (1-2 hours)

→ **Read:** DEPLOYMENT_STEPS.md (Steps 11-19)

- Create app
- Complete store listing
- Upload graphics
- Set content rating
- Complete data safety
- Add privacy policy

### Phase 5: Upload (30 min)

→ **Read:** DEPLOYMENT_STEPS.md (Steps 20-25)

- Upload APK/AAB
- Get Play Store's SHA-1
- Create Android OAuth Client #2
- Start rollout

### Phase 6: Verify (after 3-7 days)

→ **Read:** DEPLOYMENT_STEPS.md (Steps 26-30)

- Wait for approval
- Download from Play Store
- Test Google Sign-In
- Celebrate! 🎉

---

## 🆘 Getting Stuck?

### Quick Troubleshooting

**Google Sign-In fails:**
→ Read: **GOOGLE_SIGNIN_CHECKLIST.md** section "Troubleshooting"

**Don't understand OAuth flow:**
→ Read: **GOOGLE_SIGNIN_ARCHITECTURE.md** (has diagrams!)

**Play Console rejections:**
→ Read: **PRODUCTION_APK_COMPLETE_GUIDE.md** section "Troubleshooting"

**Need detailed explanation:**
→ Read: **PRODUCTION_APK_COMPLETE_GUIDE.md** (comprehensive guide)

### Support Channels

- **Expo Discord:** https://chat.expo.dev/
- **Stack Overflow:** Tag `expo`, `google-signin`
- **Play Console Help:** https://support.google.com/googleplay/android-developer

---

## 📊 What Success Looks Like

### After Following All Steps:

```
✅ Production APK built with EAS
✅ 3 OAuth clients created in Google Cloud Console
✅ OAuth Consent Screen published
✅ All Play Console sections complete (green checkmarks)
✅ APK uploaded to Play Console
✅ Release submitted for review
```

### After Google Approves:

```
✅ App shows "Published" in Play Console
✅ App appears in Google Play Store search
✅ Users can download your app
✅ Google Sign-In works for all users
✅ You're live! 🚀
```

---

## 🎓 Understanding the Basics

### What is an APK?

Android Package - the file format for Android apps (like .exe for Windows)

### What is an AAB?

Android App Bundle - newer format that Google Play uses to generate optimized APKs for each device (smaller downloads)

### What is SHA-1?

A fingerprint of your app's signing certificate - proves the app is from you

### What is OAuth?

A secure way to log in using Google without giving your app the user's password

### What is id_token?

A JWT (JSON Web Token) that Google gives you after successful sign-in - your backend verifies this

---

## 🔄 Future Updates

When you need to update your app:

```bash
# 1. Update version in app.json
# Change: "version": "1.0.2", "versionCode": 2

# 2. Rebuild
eas build --platform android --profile production

# 3. Upload to Play Console
# Go to: Release > Production > Create new release

# 4. Submit
# Updates usually review in 1-3 days
```

**No need to recreate OAuth clients!** They stay the same.

---

## 💡 Pro Tips

1. **Test thoroughly before submitting** - rejection delays launch by days
2. **OAuth Consent Screen MUST be Published** - most common mistake!
3. **Create Android Client #2 AFTER uploading** - you need Play Store's SHA-1
4. **Be patient with Google's review** - first apps take 3-7 days
5. **Keep your SHA-1 certificates** - you'll need them for troubleshooting

---

## 📁 File Structure Reference

```
cart/
├── frontend/
│   ├── .env                          ← Set production API URL
│   ├── app.json                      ← Package name & version
│   ├── services/
│   │   └── socialAuth.ts            ← Web Client ID (line 28)
│   └── android/
│       └── app/
│           └── google-services.json ← Firebase config
│
├── DEPLOYMENT_STEPS.md              ← 🌟 START HERE!
├── PRODUCTION_APK_COMPLETE_GUIDE.md ← Full details
├── GOOGLE_SIGNIN_CHECKLIST.md       ← Quick reference
├── GOOGLE_SIGNIN_ARCHITECTURE.md    ← Visual diagrams
├── GOOGLE_PLAY_DEPLOYMENT_GUIDE.md  ← Original guide
└── build-production-apk.bat         ← Automated build
```

---

## ✅ Final Checklist

Before you click "Start rollout":

- [ ] Production API URL in `.env`
- [ ] Web Client ID in `socialAuth.ts`
- [ ] 3 OAuth clients in Google Cloud Console
- [ ] OAuth Consent Screen is Published
- [ ] All Play Console sections complete
- [ ] Screenshots uploaded
- [ ] Privacy policy added
- [ ] Data safety completed
- [ ] Content rating received
- [ ] Tested APK manually

---

## 🎉 You're Ready!

**Start here:**

1. Open **DEPLOYMENT_STEPS.md**
2. Follow steps 1-30 in order
3. Reference other guides as needed

**Total time:** ~3 hours of work + 3-7 days review

**Result:** Your app live on Google Play Store! 🚀

---

## 📞 Questions?

If you get stuck:

1. Check the relevant guide above
2. Search the error message on Stack Overflow
3. Ask in Expo Discord: https://chat.expo.dev/
4. Check Play Console Help Center

---

**Good luck with your launch!** 🍀

_CART Hypermarket Production Deployment - 2026_
