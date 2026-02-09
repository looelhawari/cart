# ElBaraka Hypermarket - Production Build Guide

## Pre-Build Checklist ✅

### 1. App Configuration
- ✅ App name: "ElBaraka Hypermarket"
- ✅ Package: com.elbaraka.hypermarket
- ✅ Version: 1.0.0
- ✅ Version Code: 1
- ✅ Icons configured (icon.png, adaptive-icon.webp)
- ✅ Splash screen configured

### 2. API Configuration
Check that production API URL is set in `config/app.config.ts`:
```typescript
API_URL: 'https://cartshop.site/api/v1'
```

### 3. Build Requirements
- ✅ EAS CLI installed
- ✅ Expo account logged in
- ✅ All dependencies installed

---

## Build Instructions

### Option 1: Build Production APK (Recommended for Testing)

```bash
cd frontend
eas build --platform android --profile production
```

This will:
- Build a production-ready APK
- Can be installed directly on Android devices
- File size: ~50-80MB
- Download link provided after build completes (~10-15 minutes)

### Option 2: Build AAB for Google Play Store

```bash
cd frontend
eas build --platform android --profile production-aab
```

This creates an App Bundle (.aab) for Google Play Store submission.

### Option 3: Local Build (Faster, No EAS Required)

```bash
cd frontend

# Install dependencies
npm install

# Build locally (requires Android Studio installed)
npx expo run:android --variant release
```

---

## After Build

### 1. Download the APK
- EAS will provide a download link
- Or access via: https://expo.dev/accounts/[your-account]/projects/elbaraka-hypermarket-app/builds

### 2. Install on Device
```bash
# Via ADB
adb install elbaraka-hypermarket-1.0.0.apk

# Or download directly on Android device from EAS link
```

### 3. Test Before Distribution
- ✅ Login with: admin@elbaraka.com / admin123456
- ✅ Check promotions on homepage
- ✅ Browse categories and products
- ✅ Add to cart and checkout
- ✅ Test payment flow
- ✅ Check profile and orders

---

## Quick Build Command

Run this now to build production APK:

```bash
cd frontend && eas build --platform android --profile production --non-interactive
```

Build will take ~10-15 minutes. You'll get a download link when complete.

---

## Distribution

### Direct Installation
Share the APK download link from EAS with users.

### Google Play Store
1. Build AAB: `eas build --platform android --profile production-aab`
2. Go to: https://play.google.com/console
3. Upload the AAB file
4. Fill store listing, screenshots, description
5. Submit for review

---

## Version Updates

When releasing updates, increment version in `app.json`:

```json
{
  "version": "1.0.1",
  "android": {
    "versionCode": 2
  }
}
```

Then rebuild with same command.
