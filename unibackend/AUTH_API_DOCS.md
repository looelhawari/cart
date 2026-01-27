# ElBaraka Backend API - Authentication Endpoints

## Base URL

```
http://127.0.0.1:8000/api/v1
```

## Authentication Endpoints

### 1. Register

**POST** `/auth/register`

Register a new user account.

**Request Body:**

```json
{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "password123",
    "password_confirmation": "password123",
    "language": "en"
}
```

**Response (201):**

```json
{
    "success": true,
    "message": "Registration successful. Please verify your phone number.",
    "data": {
        "user": {
            "id": 1,
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "language": "en",
            "is_verified": false
        }
    }
}
```

**Note:** An OTP will be sent to the phone number for verification.

---

### 2. Verify Phone

**POST** `/auth/verify-phone`

Verify phone number with OTP received after registration.

**Request Body:**

```json
{
    "phone": "+1234567890",
    "otp": "123456"
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Phone verified successfully.",
    "data": {
        "user": {
            "id": 1,
            "first_name": "John",
            "last_name": "Doe",
            "full_name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "avatar": null,
            "language": "en",
            "role": "customer",
            "is_verified": true
        },
        "access_token": "1|abc123...",
        "refresh_token": "2|xyz789...",
        "token_type": "Bearer",
        "expires_in": 1800
    }
}
```

---

### 3. Login

**POST** `/auth/login`

Login with email and password.

**Request Body:**

```json
{
    "email": "john@example.com",
    "password": "password123"
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Login successful.",
    "data": {
        "user": {
            "id": 1,
            "first_name": "John",
            "last_name": "Doe",
            "full_name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "avatar": null,
            "language": "en",
            "role": "customer",
            "is_verified": true
        },
        "access_token": "3|def456...",
        "refresh_token": "4|ghi789...",
        "token_type": "Bearer",
        "expires_in": 1800
    }
}
```

---

### 4. Refresh Token

**POST** `/auth/refresh`

Refresh the access token using refresh token.

**Request Body:**

```json
{
    "refresh_token": "4|ghi789..."
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Token refreshed successfully.",
    "data": {
        "access_token": "5|jkl012...",
        "refresh_token": "6|mno345...",
        "token_type": "Bearer",
        "expires_in": 1800
    }
}
```

---

### 5. Logout

**POST** `/auth/logout`

Logout and revoke all tokens.

**Headers:**

```
Authorization: Bearer {access_token}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Logged out successfully."
}
```

---

### 6. Forgot Password

**POST** `/auth/forgot-password`

Request password reset OTP.

**Request Body:**

```json
{
    "email": "john@example.com"
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Password reset OTP sent to your email."
}
```

**Note:** An OTP will be sent to the email address (currently logged to console).

---

### 7. Reset Password

**POST** `/auth/reset-password`

Reset password with OTP.

**Request Body:**

```json
{
    "email": "john@example.com",
    "otp": "123456",
    "password": "newpassword123",
    "password_confirmation": "newpassword123"
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Password reset successfully."
}
```

---

## Token Information

- **Access Token:** Valid for 30 minutes
- **Refresh Token:** Valid for 30 days
- **Token Rotation:** On refresh, old tokens are revoked and new ones issued
- **OTP Validity:** 10 minutes

## Error Responses

All endpoints may return error responses in this format:

```json
{
    "success": false,
    "message": "Error message here",
    "errors": {
        "field": ["Validation error message"]
    }
}
```

Common HTTP status codes:

- `400` - Bad Request (invalid OTP, expired OTP)
- `401` - Unauthorized (invalid credentials, expired token)
- `403` - Forbidden (inactive account, unverified account)
- `404` - Not Found (user not found)
- `422` - Unprocessable Entity (validation errors)

---

## Testing Notes

1. **OTP Delivery:** Currently, OTPs are logged to `storage/logs/laravel.log` instead of being sent via SMS/email. Check the log file to get OTP codes during development.

2. **Database:** Make sure MySQL is running and `elbaraka_db` database exists with all tables.

3. **Environment:** Ensure `.env` file is properly configured with database credentials.

4. **Redis:** If using Redis for caching (optional for now), make sure Redis server is running.

---

## Testing with cURL

### Register a new user:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "password123",
    "password_confirmation": "password123",
    "language": "en"
  }'
```

### Check OTP in logs:

```bash
tail -f storage/logs/laravel.log
```

### Verify phone:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/verify-phone \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "otp": "YOUR_OTP_FROM_LOGS"
  }'
```

---

## Implementation Status

✅ **Completed:**

- User Model with Sanctum authentication
- OTP system (phone verification, password reset)
- All 7 authentication endpoints
- Request validation
- Token management (30-min access, 30-day refresh)
- Database migrations
- API routes configuration

🔄 **Pending:**

- SMS integration (Twilio/Vonage)
- Email integration for password reset
- Rate limiting configuration
- API documentation (Swagger/OpenAPI)
- Unit tests
- Integration tests
