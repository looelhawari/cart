# 🚀 Quick Start Guide - Saved Cards Feature

## Immediate Action Items

### 1. Implement Auth Token (CRITICAL - 5 minutes)

**File**: [frontend/services/paymentMethodsApi.ts](frontend/services/paymentMethodsApi.ts#L10)

Replace this:

```typescript
async function getAuthToken(): Promise<string> {
  return "YOUR_AUTH_TOKEN";
}
```

With your auth implementation. **Examples**:

#### Option A: AsyncStorage

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";

async function getAuthToken(): Promise<string> {
  const token = await AsyncStorage.getItem("auth_token");
  if (!token) throw new Error("Not authenticated");
  return token;
}
```

#### Option B: Expo SecureStore

```typescript
import * as SecureStore from "expo-secure-store";

async function getAuthToken(): Promise<string> {
  const token = await SecureStore.getItemAsync("auth_token");
  if (!token) throw new Error("Not authenticated");
  return token;
}
```

#### Option C: Zustand Store (Recommended if you use Zustand)

```typescript
import { useStore } from "@/store";

async function getAuthToken(): Promise<string> {
  const token = useStore.getState().authToken;
  if (!token) throw new Error("Not authenticated");
  return token;
}
```

---

## 2. Test the Feature (15 minutes)

### Start Your Development Server

```bash
# Terminal 1: Start Expo
cd frontend
npx expo start

# Terminal 2: Start Backend (if local)
cd backend
php artisan serve
```

### Test Flow 1: Save a New Card

1. Add items to cart
2. Go to checkout
3. Select "Card" payment
4. ✓ Check "Save this card for future purchases"
5. Complete order
6. Enter test card in Paymob iframe
7. Complete 3DS
8. Verify order success
9. Go to Profile → Payment Methods
10. **Expected**: Card should appear after webhook processes

### Test Flow 2: Pay with Saved Card

1. Add items to cart
2. Go to checkout
3. Select "Card" payment
4. Toggle ON "Use saved card"
5. Select a card
6. Complete order
7. Complete 3DS in PaymentWebView
8. **Expected**: Order success without re-entering card

### Test Flow 3: Manage Cards

1. Go to Profile → Payment Methods
2. Try setting a different card as default
3. Try deleting a card
4. Pull to refresh
5. **Expected**: All operations work smoothly

---

## 3. Paymob Test Cards

Use these test cards in Paymob sandbox:

| Card Number        | Expiry     | CVV   | 3DS Result        |
| ------------------ | ---------- | ----- | ----------------- |
| `4987654321098769` | `12/25`    | `123` | Success           |
| `5123456789012346` | `12/25`    | `123` | Success           |
| Any 16-digit card  | Any future | Any   | Success (sandbox) |

**Note**: In sandbox, most cards work. In production, use real cards.

---

## 4. Verify Navigation

### Check Routes Exist

```bash
# Should exist:
frontend/app/payment-webview.tsx ✓
frontend/app/profile/payment-methods.tsx ✓
```

### Test Navigation

- From checkout confirmation → PaymentWebView
- From profile menu → Payment Methods screen
- After 3DS completion → Order Success

---

## 5. Common Issues & Fixes

### Issue: "401 Unauthorized" errors

**Fix**: Check `getAuthToken()` is returning valid token

```typescript
// Add debugging
const token = await getAuthToken();
console.log("Auth token:", token); // Should not be 'YOUR_AUTH_TOKEN'
```

### Issue: Cards not saving after payment

**Fix**: Check backend webhook is configured correctly

```bash
# Backend logs
tail -f storage/logs/laravel.log

# Look for: "Payment verified" or "Card saved"
```

### Issue: 3DS iframe not loading

**Fix**: Check internet connection and iframe URL

```typescript
// In PaymentWebView, add:
console.log("Loading iframe:", params.iframeUrl);
```

### Issue: Toggle not showing "Use saved card"

**Fix**: No saved cards exist yet. Complete a payment with "Save card" checked first.

---

## 6. File Locations Quick Reference

```
frontend/
├── services/
│   └── paymentMethodsApi.ts          ← API service (implement getAuthToken here)
├── components/
│   └── SavedCardsList.tsx             ← Card selection component
├── app/
│   ├── payment-webview.tsx            ← 3DS authentication
│   ├── (tabs)/
│   │   └── profile.tsx                ← Added "Payment Methods" menu item
│   ├── profile/
│   │   └── payment-methods.tsx        ← Card management screen
│   └── checkout/
│       ├── payment.tsx                ← Updated with saved cards toggle
│       └── confirmation.tsx           ← Updated payment initiation
└── types/
    └── index.ts                       ← Added PaymentMethod types

root/
├── PHASE_5_IMPLEMENTATION.md          ← Detailed documentation
├── PHASE_5_COMPLETE.md                ← Completion summary
└── QUICK_START.md                     ← This file
```

---

## 7. API Endpoints Used

| Endpoint                                           | Method | Purpose                     |
| -------------------------------------------------- | ------ | --------------------------- |
| `/api/v1/payment-methods`                          | GET    | List all cards              |
| `/api/v1/payment-methods/{id}/default`             | PUT    | Set default                 |
| `/api/v1/payment-methods/{id}`                     | DELETE | Delete card                 |
| `/api/v1/payments/paymob/initiate`                 | POST   | New card (+ save_card flag) |
| `/api/v1/payments/paymob/initiate-with-saved-card` | POST   | Saved card payment          |

**Base URL**: Configure in paymentMethodsApi.ts (currently uses `/api/v1`)

---

## 8. Environment Variables (Optional)

Add to `.env` if needed:

```env
# Paymob (backend already configured)
PAYMOB_API_KEY=your_key
PAYMOB_SECRET_KEY=your_secret
PAYMOB_PUBLIC_KEY=your_public_key
PAYMOB_INTEGRATION_ID=your_integration_id

# Frontend API (if different from localhost)
EXPO_PUBLIC_API_URL=http://your-backend-url.com
```

---

## 9. Success Checklist

Before marking Phase 5 as production-ready:

- [ ] `getAuthToken()` implemented and working
- [ ] Can save a card during checkout
- [ ] Can see saved cards in Profile → Payment Methods
- [ ] Can pay with a saved card
- [ ] Can set default card
- [ ] Can delete a card
- [ ] 3DS authentication works
- [ ] Expired cards show correctly
- [ ] Default card badge shows
- [ ] Pull-to-refresh works
- [ ] Toast notifications appear
- [ ] Network errors handled gracefully

---

## 10. Need Help?

**Documentation**:

- Detailed Guide: [PHASE_5_IMPLEMENTATION.md](PHASE_5_IMPLEMENTATION.md)
- Backend API: Phase 4 documentation (26 tests passing)

**Common Questions**:

1. **Where is the auth token stored?** → Check your auth implementation (AsyncStorage, SecureStore, Zustand)
2. **Why isn't the card saving?** → Verify webhook is processing payment
3. **How do I test 3DS?** → Use Paymob test cards in sandbox mode
4. **Can I customize the UI?** → Yes! All styles are in StyleSheet objects at bottom of files

**Debug Mode**:
Add console.logs in these key locations:

- paymentMethodsApi.ts → API calls
- PaymentWebView → Navigation events
- payment.tsx → Card selection
- confirmation.tsx → Payment initiation

---

## ✅ You're Ready!

Phase 5 implementation is complete. Just:

1. Implement `getAuthToken()` (5 min)
2. Test the flows (15 min)
3. Deploy! 🚀

**Happy coding!** 🎉
