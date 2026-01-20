# 🚀 Quick Setup Commands

## Complete Paymob Payment Integration Setup

Run these commands to complete the setup:

---

## 1️⃣ Backend Setup

```bash
# Navigate to backend
cd backend

# Run migration (creates paymob_payments table)
php artisan migrate

# Verify migration
php artisan migrate:status

# Start backend server
php artisan serve
```

**Expected Output:**

```
Migrating: 2026_01_20_000001_create_paymob_payments_table
Migrated:  2026_01_20_000001_create_paymob_payments_table (XX.XXms)
```

---

## 2️⃣ Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install WebView package
npx expo install react-native-webview

# Verify installation
cat package.json | grep react-native-webview

# Start Expo development server
npx expo start
```

**Expected Output:**

```
+ react-native-webview@X.X.X
```

---

## 3️⃣ Verify Setup

### Backend Verification

```bash
# Check database tables
cd backend
php artisan tinker
```

In Tinker:

```php
// Check if paymob_payments table exists
Schema::hasTable('paymob_payments');  // Should return: true

// Check table columns
Schema::getColumnListing('paymob_payments');

// Exit Tinker
exit
```

### Frontend Verification

```bash
# Check if WebView is installed
cd frontend
ls node_modules/react-native-webview
```

---

## 4️⃣ Run Tests (Optional)

### Test Payment Initiation Endpoint

```bash
# Start backend first
cd backend
php artisan serve
```

In a new terminal:

```bash
# Test payment initiation (replace TOKEN and ORDER_ID)
curl -X POST http://localhost:8000/api/v1/payments/paymob/initiate \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "order_id": 1,
    "payment_method": "CARD",
    "billing_data": {
      "first_name": "Test",
      "last_name": "User",
      "email": "test@example.com",
      "phone_number": "+201234567890",
      "city": "Cairo",
      "street": "Test Street"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "iframe_url": "https://accept.paymob.com/api/acceptance/iframes/919973?payment_token=...",
    "payment_token": "...",
    "order_id": 1
  },
  "message": "Payment initiated successfully"
}
```

---

## 5️⃣ Monitor Logs (During Testing)

### Backend Logs

```bash
# Real-time Laravel logs
cd backend
tail -f storage/logs/laravel.log
```

### Frontend Logs

```bash
# Expo logs (automatically shown when running)
cd frontend
npx expo start
```

Then press:

- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser

---

## 6️⃣ Database Queries (Verification)

```bash
# Connect to MySQL
mysql -u root -p
```

```sql
-- Use your database
USE elbaraka_database;

-- Check paymob_payments table structure
DESCRIBE paymob_payments;

-- Check for test payments
SELECT * FROM paymob_payments;

-- Check orders with payment status
SELECT
  o.id,
  o.order_number,
  o.total,
  o.payment_method,
  o.payment_status,
  p.status as paymob_status,
  p.paymob_transaction_id
FROM orders o
LEFT JOIN paymob_payments p ON o.id = p.order_id
WHERE o.payment_method = 'card'
ORDER BY o.created_at DESC
LIMIT 10;
```

---

## 7️⃣ Troubleshooting Commands

### Clear Laravel Cache

```bash
cd backend

# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Rebuild cache
php artisan config:cache
php artisan route:cache
```

### Rebuild Frontend

```bash
cd frontend

# Clear Expo cache
npx expo start -c

# Or clear metro bundler cache
npx react-native start --reset-cache
```

### Check Paymob Configuration

```bash
cd backend

# View Paymob config
cat .env | grep PAYMOB

# Or use artisan
php artisan tinker
```

In Tinker:

```php
config('services.paymob');
exit
```

---

## 8️⃣ Test Payment Flow

### Full End-to-End Test

1. **Start both servers**

   ```bash
   # Terminal 1: Backend
   cd backend
   php artisan serve

   # Terminal 2: Frontend
   cd frontend
   npx expo start
   ```

2. **Open app** (press `a` for Android, `i` for iOS)

3. **Test checkout:**
   - Add items to cart
   - Go to checkout
   - Select address
   - Choose "Credit/Debit Card"
   - Place order

4. **Test payment:**
   - Enter test card: `4987654321098769`
   - CVV: `123`
   - Expiry: Any future date
   - Submit payment

5. **Verify success:**
   - Check success alert
   - Verify cart cleared
   - Check order success screen

6. **Verify database:**

   ```sql
   -- Check latest payment
   SELECT * FROM paymob_payments ORDER BY created_at DESC LIMIT 1;

   -- Should show status: PAID
   ```

---

## 9️⃣ Production Deployment

### Update to Production Credentials

```bash
cd backend
nano .env
```

Update these values:

```env
PAYMOB_API_KEY=[YOUR_PRODUCTION_API_KEY]
PAYMOB_HMAC_SECRET=[YOUR_PRODUCTION_HMAC_SECRET]
PAYMOB_IFRAME_ID=[YOUR_PRODUCTION_IFRAME_ID]
PAYMOB_CARD_INTEGRATION_ID=[YOUR_PRODUCTION_CARD_ID]
PAYMOB_WALLET_INTEGRATION_ID=[YOUR_PRODUCTION_WALLET_ID]
```

Then:

```bash
# Clear config cache
php artisan config:cache

# Restart server
php artisan serve
```

---

## 🎯 Quick Command Reference

| Task            | Command                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| Run migration   | `cd backend && php artisan migrate`                                              |
| Install WebView | `cd frontend && npx expo install react-native-webview`                           |
| Start backend   | `cd backend && php artisan serve`                                                |
| Start frontend  | `cd frontend && npx expo start`                                                  |
| View logs       | `cd backend && tail -f storage/logs/laravel.log`                                 |
| Clear cache     | `cd backend && php artisan cache:clear`                                          |
| Check config    | `cd backend && php artisan tinker` → `config('services.paymob')`                 |
| Check DB        | `mysql -u root -p` → `USE elbaraka_database;` → `SELECT * FROM paymob_payments;` |

---

## ✅ Setup Checklist

- [ ] Backend migration run (`php artisan migrate`)
- [ ] WebView package installed (`npx expo install react-native-webview`)
- [ ] Backend server running (`php artisan serve`)
- [ ] Frontend server running (`npx expo start`)
- [ ] Paymob credentials in `.env` verified
- [ ] Database table `paymob_payments` exists
- [ ] Test payment completed successfully
- [ ] Logs monitored (no errors)
- [ ] Documentation reviewed

---

## 📞 Support

If you encounter issues:

1. **Check Laravel logs:** `tail -f backend/storage/logs/laravel.log`
2. **Check Expo logs:** Shown in terminal when running `npx expo start`
3. **Verify database:** Run SQL queries above
4. **Review documentation:** See `PAYMOB_TESTING_GUIDE.md`

---

**Ready to test! 🚀**

Run the commands in order and follow the testing guide.
