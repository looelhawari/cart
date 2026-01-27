# 30-Day Sessions with Password Re-Authentication

## ✅ Implementation Summary

### Backend Changes

#### 1. Extended Session/Token Lifetime
- **Session**: 120 minutes → **43,200 minutes (30 days)**
- **Sanctum Tokens**: null → **43,200 minutes (30 days)**
- Users stay logged in for 30 days without re-login

#### 2. Password Confirmation Middleware
Created `RequirePasswordConfirmation` middleware that:
- Requires password re-verification for sensitive actions
- Valid for **30 minutes** after confirmation
- Returns `423 Locked` status when password needed

#### 3. Password Confirmation Endpoint
**POST** `/api/v1/auth/confirm-password`
```json
{
  "password": "user_password"
}
```

Response:
```json
{
  "success": true,
  "message": "Password confirmed successfully",
  "data": {
    "confirmed_at": "2026-01-27T12:30:00Z",
    "valid_for_minutes": 30
  }
}
```

#### 4. Protected Endpoints (Require Password Confirmation)

**Profile Changes:**
- `PUT /api/v1/profile` - Update profile
- `DELETE /api/v1/profile/avatar` - Delete avatar
- `PUT /api/v1/profile/change-password` - Change password

**Payment Methods:**
- `DELETE /api/v1/payment-methods/{id}` - Delete saved card

**Checkout & Payments:**
- `POST /api/v1/checkout/process-payment` - Process payment
- `POST /api/v1/payments/paymob/pre-check` - Pre-check payment
- `POST /api/v1/payments/paymob/initiate` - Initiate payment
- `POST /api/v1/payments/paymob/initiate-with-saved-card` - Pay with saved card

### Frontend Components

#### 1. PasswordConfirmModal Component
Location: `frontend/components/PasswordConfirmModal.tsx`

Features:
- Beautiful modal UI with Lock icon
- Password input with error handling
- Loading state during verification
- Cancel and Confirm actions

#### 2. usePasswordConfirm Hook
Location: `frontend/hooks/usePasswordConfirm.ts`

Usage Example:
```typescript
import { usePasswordConfirm } from "@/hooks/usePasswordConfirm";

function ProfileScreen() {
  const { requestConfirmation, PasswordModal } = usePasswordConfirm({
    title: "Confirm Password",
    message: "Please verify your password to update your profile",
  });

  const handleUpdateProfile = async () => {
    // Request password confirmation
    const confirmed = await requestConfirmation();
    
    if (!confirmed) {
      return; // User cancelled
    }

    // Proceed with API call
    const response = await updateProfile(data);
    // Password confirmation is valid for 30 minutes
  };

  return (
    <View>
      {/* Your UI */}
      <Button onPress={handleUpdateProfile}>Update Profile</Button>
      
      {/* Render password modal */}
      <PasswordModal />
    </View>
  );
}
```

## 🔒 Security Features

1. **Long Sessions**: Users stay logged in for 30 days (convenience)
2. **Password Re-verification**: Required every 30 minutes for sensitive actions
3. **Automatic Expiry**: Password confirmation expires after 30 minutes
4. **Protected Endpoints**: Payments and profile changes require password

## 📋 Next Steps

### Update Existing Screens

1. **Profile Edit Screen** - Add password confirmation
2. **Checkout Screen** - Add password confirmation for payments
3. **Saved Cards Screen** - Add password confirmation for deletion
4. **Change Password Screen** - Already requires current password

### Error Handling

When API returns `423` status:
```typescript
if (response.status === 423) {
  // Show password confirmation modal
  const confirmed = await requestConfirmation();
  if (confirmed) {
    // Retry the API call
  }
}
```

## 🧪 Testing

### Test Password Confirmation
1. Login to the app
2. Try to update profile → Should ask for password
3. Enter password → Confirm
4. Try again within 30 minutes → Should NOT ask (cached)
5. Wait 30+ minutes → Should ask again

### Test 30-Day Session
1. Login to the app
2. Close app completely
3. Open after 1 day → Should still be logged in
4. Open after 30 days → Should still be logged in
5. Open after 31 days → Should require login

## 📝 Configuration Files Changed

1. ✅ `backend/.env` - SESSION_LIFETIME updated
2. ✅ `backend/config/sanctum.php` - Token expiration set
3. ✅ `backend/app/Http/Middleware/RequirePasswordConfirmation.php` - Created
4. ✅ `backend/bootstrap/app.php` - Middleware registered
5. ✅ `backend/routes/api.php` - Middleware applied to sensitive routes
6. ✅ `backend/app/Http/Controllers/Api/Auth/AuthController.php` - confirmPassword() added
7. ✅ `frontend/components/PasswordConfirmModal.tsx` - Created
8. ✅ `frontend/hooks/usePasswordConfirm.ts` - Created

## 🎯 Benefits

✅ **User Convenience**: No frequent logins (30-day sessions)
✅ **Security**: Password required for sensitive actions
✅ **Industry Standard**: Similar to banking apps
✅ **Flexible**: 30-minute confirmation window
✅ **Seamless UX**: Transparent to users for normal browsing
