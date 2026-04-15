# 🚀 Quick AAB Build Guide - Your Own EAS Project

**Goal:** Create a new EAS project under YOUR account and get production AAB file

---

## ⚡ Super Quick Method (Automated)

**Just run this script:**

```batch
CREATE_NEW_EAS_PROJECT.bat
```

It will:

1. ✅ Check EAS CLI installation
2. ✅ Login to your Expo account
3. ✅ Create new EAS project
4. ✅ Build production AAB
5. ✅ Show SHA-1 certificate
6. ✅ Give you download link

**Time:** 20-25 minutes (mostly waiting for build)

---

## 📋 Manual Method (Step by Step)

### Step 1: Update .env for Production

Edit `frontend\.env`:

```bash
API_URL=https://cartshop.site/api/v1
APP_ENV=production
APP_NAME=CART
```

⚠️ **Change to your actual production API URL!**

### Step 2: Login to EAS

```powershell
cd frontend
eas login
```

Enter your Expo account credentials.

### Step 3: Create New EAS Project

```powershell
eas build:configure
```

**What this does:**

- Creates a new project under YOUR Expo account
- Adds `projectId` to `app.json` automatically
- Sets up Android/iOS credentials

**Press ENTER** to accept defaults.

### Step 4: Build Production AAB

```powershell
eas build --platform android --profile production
```

**What happens:**

- Uploads your code to EAS
- Builds AAB on cloud servers
- Takes 15-20 minutes
- Shows progress in terminal

**Output will look like:**

```
✔ Build finished.
https://expo.dev/artifacts/eas/abc123xyz.aab
```

**Download this file!** Save as: `CART-production-v1.0.1.aab`

### Step 5: Get SHA-1 Certificate

```powershell
eas credentials --platform android
```

Navigate:

1. Select: **Android credentials**
2. Select: **Keystore**
3. View: **SHA-1 certificate fingerprint**

**Copy this!** Format:

```
SHA-1: E6:ED:21:31:EE:78:08:B1:EC:B2:03:BF:B4:83:EF:10:78:AC:F3:46
```

---

## ✅ What You'll Have After These Steps

- ✅ New EAS project: `https://expo.dev/accounts/YOUR-USERNAME/projects/CART-app`
- ✅ Production AAB file downloaded
- ✅ SHA-1 certificate copied
- ✅ Ready to upload to Google Play Console!

---

## 🔑 Important Information to Save

After running these steps, save this info:

| Item                | Value                                       | Where to Use                                   |
| ------------------- | ------------------------------------------- | ---------------------------------------------- |
| **AAB File**        | CART-production-v1.0.1.aab                  | Upload to Play Console                         |
| **SHA-1**           | E6:ED:21:31:...                             | Google Cloud Console (Android OAuth Client #1) |
| **Package Name**    | com.cart.hypermarket                        | Everywhere (already in app.json)               |
| **Version**         | 1.0.1                                       | Play Console                                   |
| **Version Code**    | 1                                           | Play Console                                   |
| **EAS Project URL** | https://expo.dev/accounts/YOUR-USERNAME/... | Reference                                      |

---

## 🎯 Next Steps After Build

### 1. Download Your AAB

Click the link from build output:

```
https://expo.dev/artifacts/eas/abc123xyz.aab
```

Save to: `Downloads\CART-production-v1.0.1.aab`

### 2. Set Up Google Cloud Console

Now follow **DEPLOYMENT_STEPS.md** starting from **Step 8**:

1. Configure OAuth Consent Screen
2. Create Web OAuth Client
3. Create Android OAuth Client #1 (with your SHA-1)
4. Publish OAuth Consent Screen

### 3. Set Up Google Play Console

Continue with **DEPLOYMENT_STEPS.md** Steps 11-19:

1. Create app on Play Console
2. Complete store listing
3. Upload graphics
4. Set content rating
5. Complete data safety
6. Add privacy policy

### 4. Upload AAB

**DEPLOYMENT_STEPS.md** Steps 20-25:

1. Upload your AAB file
2. Get Play Store's SHA-1
3. Create Android OAuth Client #2
4. Start rollout

---

## 🐛 Troubleshooting

### Error: "You're not logged in"

**Fix:**

```powershell
eas login
```

### Error: "Project not found"

**Fix:** This is normal for new project. Run:

```powershell
eas build:configure
```

### Error: "Invalid credentials"

**Fix:** Make sure you're logged into YOUR Expo account, not someone else's.

### Build Fails

**Check:**

- Is `app.json` valid JSON?
- Is `package.json` valid?
- Are all dependencies installed?
- Is your network connection stable?

**View build logs:** Go to the EAS build URL shown in terminal.

---

## 📱 Verify Your Configuration

Before building, verify these files:

### app.json

```json
{
  "expo": {
    "name": "CART",
    "version": "1.0.1",
    "android": {
      "package": "com.cart.hypermarket",
      "versionCode": 1
    }
  }
}
```

### eas.json

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### .env

```bash
API_URL=https://cartshop.site/api/v1
APP_ENV=production
```

---

## 🔄 For Future Updates

When you need to release version 1.0.2:

### 1. Update Version

Edit `frontend\app.json`:

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

### 2. Rebuild

```powershell
cd frontend
eas build --platform android --profile production
```

### 3. Upload to Play Console

No need to recreate OAuth clients! Just upload the new AAB.

---

## 📊 Build Status

Check your build status:

- **In terminal:** Shows real-time progress
- **On web:** `https://expo.dev/accounts/YOUR-USERNAME/projects/CART-app/builds`

---

## 💡 Pro Tips

1. **First build takes longest** - EAS needs to install dependencies
2. **Subsequent builds are faster** - EAS caches dependencies
3. **Build in the cloud** - Your computer can shut down, build continues
4. **Download link expires** - Download AAB within 30 days
5. **Credentials are managed** - EAS handles keystore automatically

---

## ✅ Success Checklist

- [ ] EAS CLI installed
- [ ] Logged into YOUR Expo account
- [ ] `eas build:configure` completed
- [ ] Production .env configured
- [ ] `eas build --platform android --profile production` started
- [ ] Build completed successfully
- [ ] AAB file downloaded
- [ ] SHA-1 certificate copied
- [ ] Ready for Play Console upload!

---

## 🆘 Need Help?

- **EAS Documentation:** https://docs.expo.dev/build/introduction/
- **Expo Discord:** https://chat.expo.dev/
- **Stack Overflow:** Tag `expo`, `eas-build`

---

## 🎉 You're Ready!

After these steps, you'll have:

- ✅ Your own EAS project
- ✅ Production AAB file
- ✅ SHA-1 certificate
- ✅ Ready to publish!

**Next:** Follow **DEPLOYMENT_STEPS.md** from Step 8 onwards.

---

_Quick AAB Build Guide for CART Hypermarket - 2026_
