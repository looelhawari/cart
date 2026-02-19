# ElBaraka Market — Admin Dashboard Credentials

> **CONFIDENTIAL** — Share only with authorized personnel. Change passwords after first login.

---

## Admin Dashboard URL

```
http://localhost:3000
```

> Replace `localhost:3000` with your production domain once deployed.

---

## Admin Accounts

### 1. Owner — Full Access
| Field    | Value                                        |
|----------|----------------------------------------------|
| Email    | `elbaraka.owner.x9k2@elbarakamarket.com`     |
| Password | `Xk$92!qLmT@vR7zW#pNb`                       |
| Access   | Everything — all pages, all actions          |

---

### 2. Cashier — Operational Management
| Field    | Value                                        |
|----------|----------------------------------------------|
| Email    | `cashier.ops.m4v8@elbarakamarket.com`        |
| Password | `Cv!48mZr@Nq2xW#7jPsL`                       |
| Access   | Orders, Products, Categories, Promotions, Promo Codes, Delivery Zones, Drivers |

---

### 3. Support — Customer Support
| Field    | Value                                        |
|----------|----------------------------------------------|
| Email    | `support.desk.t6y3@elbarakamarket.com`       |
| Password | `Tp#63kRw!Yb9sV@2mXnQ`                       |
| Access   | Support Tickets, Refunds, Customers, App Logs, Orders (view only) |

---

### 4. Store Manager — Strategy & Content
| Field    | Value                                        |
|----------|----------------------------------------------|
| Email    | `store.mgr.j7w5@elbarakamarket.com`          |
| Password | `Jw@75nFx#Qd3tM!8kRvZ`                       |
| Access   | Store Settings, Reviews, Content Pages, Analytics, Financial Reports, Notifications |

---

## Mobile App (Customer)

The customer mobile app is built with **Expo (React Native)** and supports both Android and iOS.

### Running the App

**Option 1 — Expo Go (Quick Preview)**
1. Install **Expo Go** from the App Store or Google Play.
2. Scan the QR code shown after running:
   ```bash
   cd frontend
   npx expo start --clear
   ```

**Option 2 — Development Build (Recommended for full features)**
```bash
cd frontend
npx expo run:android   # for Android
npx expo run:ios       # for iOS (macOS only)
```

### Customer App Features
- Browse products and categories
- Place orders (Cash on Delivery / Online Payment via Paymob)
- Real-time order tracking with map (Leaflet / OpenStreetMap)
- Wallet & refunds
- Support tickets
- Promotions and promo codes
- Google Sign-In / Phone OTP login
- Push notifications
- Arabic & English (RTL support)

---

## Backend API

| Item        | Value                          |
|-------------|--------------------------------|
| Framework   | Laravel 11 (PHP)               |
| Base URL    | `http://localhost:8000/api/v1` |
| Auth        | Laravel Sanctum (Bearer Token) |
| Database    | MySQL (`elbaraka_db`)          |

To start the backend server:
```bash
cd unibackend
php artisan serve --host=0.0.0.0 --port=8000
```

---

## Role Permissions Summary

| Page / Feature       | Owner | Cashier | Support | Store Manager |
|----------------------|:-----:|:-------:|:-------:|:-------------:|
| Dashboard            | ✅    | ❌      | ❌      | ✅            |
| Orders               | ✅    | ✅      | 👁 View | 👁 View       |
| Products             | ✅    | ✅      | ❌      | 👁 View       |
| Categories           | ✅    | ✅      | ❌      | ❌            |
| Promotions           | ✅    | ✅      | ❌      | 👁 View       |
| Promo Codes          | ✅    | ✅      | ❌      | ❌            |
| Delivery Zones       | ✅    | ✅      | ❌      | ❌            |
| Drivers              | ✅    | ✅      | ❌      | ❌            |
| Refunds              | ✅    | ❌      | ✅      | ❌            |
| Support Tickets      | ✅    | ❌      | ✅      | ❌            |
| Customers            | ✅    | 👁 View | ✅      | ❌            |
| App Logs             | ✅    | ❌      | ✅      | ❌            |
| Financial Reports    | ✅    | ❌      | ❌      | 👁 View       |
| Analytics            | ✅    | ❌      | ❌      | ✅            |
| Reviews              | ✅    | ❌      | ❌      | ✅            |
| Content Pages        | ✅    | ❌      | ❌      | ✅            |
| Store Settings       | ✅    | ❌      | ❌      | ✅            |
| Notifications        | ✅    | ❌      | ❌      | ✅            |
| Admin Users          | ✅    | ❌      | ❌      | ❌            |
| Admin Logs           | ✅    | ❌      | ❌      | ❌            |

> ✅ Full access &nbsp;|&nbsp; 👁 View only &nbsp;|&nbsp; ❌ No access

### Default Landing Pages
| Role          | Landing Page |
|---------------|-------------|
| Owner         | `/dashboard` |
| Store Manager | `/dashboard` |
| Cashier       | `/orders`    |
| Support       | `/support`   |

---

## Security Notes

- Change all passwords immediately after first login.
- The **Owner** account has unrestricted access — keep its credentials secure.
- All API routes are protected by token authentication + role-based permission middleware.
- Admin sessions auto-expire and require re-login.
