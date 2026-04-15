# ✅ AAB Build Checklist - Copy & Paste Commands

**Run these commands in PowerShell in order:**

---

## 📍 Navigate to Frontend

```powershell
cd C:\Users\Kareem` H\Music\Track\CART\cart\frontend
```

---

## 1️⃣ Login to EAS

```powershell
eas login
```

✏️ Enter your Expo account email and password

---

## 2️⃣ Check Who You're Logged In As

```powershell
eas whoami
```

✅ Should show YOUR username (not "loxlo")

---

## 3️⃣ Create New EAS Project

```powershell
eas build:configure
```

✏️ Press ENTER to accept defaults

This creates a new project ID in your app.json

---

## 4️⃣ Build Production AAB

```powershell
eas build --platform android --profile production
```

⏳ **Wait 15-20 minutes**

You'll get a download link like:

```
https://expo.dev/artifacts/eas/abc123xyz.aab
```

📥 **DOWNLOAD THIS FILE!**

---

## 5️⃣ Get SHA-1 Certificate

```powershell
eas credentials --platform android
```

Then select:

1. **Android credentials**
2. **Keystore**
3. View the SHA-1

📋 **COPY THE SHA-1!** You need it for Google Cloud Console

---

## ✅ Done!

You now have:

- ✅ AAB file downloaded
- ✅ SHA-1 certificate copied
- ✅ New EAS project under your account

---

## 🎯 What to Do With These:

### 1. AAB File

→ Upload to Google Play Console (DEPLOYMENT_STEPS.md Step 20)

### 2. SHA-1 Certificate

→ Use in Google Cloud Console to create Android OAuth Client #1 (DEPLOYMENT_STEPS.md Step 10)

---

## 📝 Save This Information

After completing steps above, note:

**My EAS Project URL:**

```
https://expo.dev/accounts/YOUR-USERNAME/projects/CART-app
```

**My SHA-1 Certificate:**

```
[Paste your SHA-1 here for reference]
```

**AAB File Location:**

```
C:\Users\Kareem H\Downloads\CART-production-v1.0.1.aab
```

---

## 🚀 Next Steps

1. Follow **DEPLOYMENT_STEPS.md** starting from **Step 8**
2. Set up Google Cloud Console (OAuth)
3. Set up Google Play Console
4. Upload your AAB
5. Publish!

---

_Quick command reference - CART Hypermarket 2026_
