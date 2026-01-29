# 🔔 Complete Notifications Implementation Guide for El Baraka Hypermarket

## ✅ IMPLEMENTATION STATUS: COMPLETE

**Last Updated:** January 28, 2026

---

## Table of Contents

1. [Implementation Summary](#implementation-summary)
2. [What Was Done](#what-was-done)
3. [File Changes](#file-changes)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Configuration & Credentials](#configuration--credentials)
7. [Testing Guide](#testing-guide)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Implementation Summary

A **scalable push notification system** has been fully implemented for the El Baraka Hypermarket app, supporting:

- ✅ **In-App Notifications** - Real-time notifications within the app
- ✅ **Push Notifications** - iOS (APNs) and Android (FCM) via Expo Push API
- ✅ **Broadcast Notifications** - Mass notifications to 50k+ users
- ✅ **User Preferences** - Per-type toggles and quiet hours
- ✅ **Scalable Architecture** - Chunked processing, queue-based, batched API calls

---

## What Was Done

### Backend (Laravel)

| Component                       | Description                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Database Migration**          | Updated `notifications` table with 10 new columns; created 3 new tables                                             |
| **4 Eloquent Models**           | Notification, NotificationDelivery, NotificationPreference, NotificationRead                                        |
| **PushNotificationService**     | Core service (~730 lines) with Expo Push API integration                                                            |
| **5 Queue Jobs**                | ProcessBroadcastNotification, SendBroadcastChunk, SendDelayedNotification, SendOrderNotification, CheckPushReceipts |
| **NotificationController**      | 9 user-facing endpoints                                                                                             |
| **AdminNotificationController** | 8 admin endpoints for broadcast management                                                                          |
| **API Routes**                  | 17 routes registered under `/api/v1/notifications` and `/api/v1/admin/notifications`                                |

### Frontend (React Native/Expo)

| Component                        | Description                                                       |
| -------------------------------- | ----------------------------------------------------------------- |
| **notificationService.ts**       | Complete rewrite with Expo Push Notifications and API integration |
| **notifications.tsx**            | Real API integration, pagination, swipe-to-delete, tab filtering  |
| **notification-preferences.tsx** | New screen with quiet hours time pickers                          |
| **useNotifications.ts**          | Custom hook for notification state management                     |
| **\_layout.tsx**                 | Push notification initialization on app launch                    |

---

## File Changes

### Backend Files Created/Modified

```
unibackend/
├── database/migrations/
│   └── 2026_01_29_000000_update_notifications_system.php  ✅ NEW
├── app/Models/
│   ├── Notification.php                                    ✅ NEW
│   ├── NotificationDelivery.php                           ✅ NEW
│   ├── NotificationPreference.php                         ✅ NEW/UPDATED
│   └── NotificationRead.php                               ✅ NEW
├── app/Services/
│   └── PushNotificationService.php                        ✅ NEW (~730 lines)
├── app/Jobs/
│   ├── ProcessBroadcastNotification.php                   ✅ NEW
│   ├── SendBroadcastChunk.php                             ✅ NEW
│   ├── SendDelayedNotification.php                        ✅ NEW
│   ├── SendOrderNotification.php                          ✅ NEW
│   └── CheckPushReceipts.php                              ✅ NEW
├── app/Http/Controllers/Api/
│   ├── NotificationController.php                         ✅ UPDATED (full rewrite)
│   └── Admin/AdminNotificationController.php              ✅ NEW
└── routes/api.php                                         ✅ UPDATED
```

### Frontend Files Created/Modified

```
frontend/
├── services/
│   └── notificationService.ts                             ✅ REWRITTEN
├── app/
│   ├── notifications.tsx                                  ✅ UPDATED
│   ├── profile/notification-preferences.tsx               ✅ NEW
│   └── _layout.tsx                                        ✅ UPDATED
└── hooks/
    └── useNotifications.ts                                ✅ NEW
```

---

## Database Schema

### 1. notifications table (Updated - 20 columns)

```sql
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NULL,           -- NEW: Arabic title
    message TEXT NOT NULL,
    message_ar TEXT NULL,                  -- NEW: Arabic message
    data JSON NULL,
    action_type VARCHAR(50) NULL,          -- NEW: navigate, open_url, dismiss
    action_target VARCHAR(255) NULL,       -- NEW: /orders/123, /promotions/5
    image_url VARCHAR(255) NULL,           -- NEW: notification image
    is_broadcast TINYINT(1) DEFAULT 0,     -- NEW: broadcast flag
    is_read TINYINT(1) DEFAULT 0,
    read_at TIMESTAMP NULL,
    scheduled_at TIMESTAMP NULL,           -- NEW: for delayed sends
    sent_at TIMESTAMP NULL,                -- NEW: when actually sent
    push_status VARCHAR(30) DEFAULT 'pending', -- NEW: pending/sent/failed
    push_error TEXT NULL,                  -- NEW: error message if failed
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,

    INDEX idx_user_is_read (user_id, is_read),
    INDEX idx_type_created (type, created_at),
    INDEX idx_is_broadcast (is_broadcast),
    INDEX idx_push_status (push_status),
    INDEX idx_scheduled_at (scheduled_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2. notification_preferences table (New - 17 columns)

```sql
CREATE TABLE notification_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    push_enabled TINYINT(1) DEFAULT 1,
    email_enabled TINYINT(1) DEFAULT 1,
    order_updates TINYINT(1) DEFAULT 1,
    promotions TINYINT(1) DEFAULT 1,
    wallet_updates TINYINT(1) DEFAULT 1,
    complaint_updates TINYINT(1) DEFAULT 1,
    price_alerts TINYINT(1) DEFAULT 1,
    back_in_stock TINYINT(1) DEFAULT 1,
    marketing TINYINT(1) DEFAULT 1,
    quiet_hours_enabled TINYINT(1) DEFAULT 0,
    quiet_hours_start VARCHAR(5) DEFAULT '22:00',
    quiet_hours_end VARCHAR(5) DEFAULT '08:00',
    timezone VARCHAR(255) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,

    UNIQUE KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3. notification_deliveries table (New - 12 columns)

```sql
CREATE TABLE notification_deliveries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    notification_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    device_token VARCHAR(255) NOT NULL,
    platform VARCHAR(20) NOT NULL,         -- ios, android
    status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, delivered, failed
    ticket_id VARCHAR(255) NULL,           -- Expo ticket for receipt checking
    error_message TEXT NULL,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,

    INDEX idx_notification_status (notification_id, status),
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_user_created (user_id, created_at),
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 4. notification_reads table (New - 5 columns)

```sql
CREATE TABLE notification_reads (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    notification_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    read_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,

    UNIQUE KEY (notification_id, user_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## API Endpoints

### User Endpoints (Authenticated)

| Method   | Endpoint                             | Description                                        |
| -------- | ------------------------------------ | -------------------------------------------------- |
| `GET`    | `/api/v1/notifications`              | List notifications (paginated, filterable by type) |
| `GET`    | `/api/v1/notifications/unread-count` | Get unread notification count                      |
| `PUT`    | `/api/v1/notifications/{id}/read`    | Mark single notification as read                   |
| `POST`   | `/api/v1/notifications/read-all`     | Mark all notifications as read                     |
| `DELETE` | `/api/v1/notifications/{id}`         | Delete a notification                              |
| `POST`   | `/api/v1/notifications/token`        | Save push notification token                       |
| `DELETE` | `/api/v1/notifications/token`        | Remove push notification token                     |
| `GET`    | `/api/v1/notifications/preferences`  | Get user notification preferences                  |
| `PUT`    | `/api/v1/notifications/preferences`  | Update notification preferences                    |

### Admin Endpoints (Admin Auth Required)

| Method   | Endpoint                                     | Description                         |
| -------- | -------------------------------------------- | ----------------------------------- |
| `GET`    | `/api/v1/admin/notifications`                | List all notifications with filters |
| `GET`    | `/api/v1/admin/notifications/analytics`      | Get notification analytics/stats    |
| `GET`    | `/api/v1/admin/notifications/{id}`           | Get notification details            |
| `DELETE` | `/api/v1/admin/notifications/{id}`           | Delete a notification               |
| `POST`   | `/api/v1/admin/notifications/{id}/resend`    | Resend a failed notification        |
| `POST`   | `/api/v1/admin/notifications/broadcast`      | Send broadcast to all users         |
| `POST`   | `/api/v1/admin/notifications/send-to-users`  | Send to specific users              |
| `POST`   | `/api/v1/admin/notifications/send-promotion` | Send promotion notification         |

---

## Configuration & Credentials

### Step 1: Backend Environment Variables (.env)

Open `unibackend/.env` and ensure these are set:

```env
# ============================================
# QUEUE CONFIGURATION (REQUIRED)
# ============================================
# Current setting (works for development):
QUEUE_CONNECTION=database

# For production (recommended for better performance):
# QUEUE_CONNECTION=redis
# REDIS_HOST=127.0.0.1
# REDIS_PASSWORD=null
# REDIS_PORT=6379

# ============================================
# EXPO PUSH NOTIFICATIONS (OPTIONAL)
# ============================================
# Expo push notifications work WITHOUT credentials in development!
# The Expo Push API is FREE and doesn't require authentication.
#
# For production with higher rate limits, you can optionally add:
# EXPO_ACCESS_TOKEN=your_expo_access_token
#
# How to get an Expo Access Token:
# 1. Go to: https://expo.dev/accounts/[your-username]/settings/access-tokens
# 2. Click "Create Token"
# 3. Give it "Read and Write" permissions
# 4. Copy the token and add it above
```

**Current `.env` values are already correct for development. No changes needed.**

### Step 2: Frontend Configuration (app.json)

Your `frontend/app.json` is **already configured correctly**. Here's what's set:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ]
    ],
    "android": {
      "package": "app.rork.elbaraka_hypermarket_app",
      "permissions": ["POST_NOTIFICATIONS"],
      "useNextNotificationsApi": true
    },
    "ios": {
      "bundleIdentifier": "app.rork.elbaraka-hypermarket-app"
    }
  }
}
```

**No changes needed for development.**

### Step 3: iOS Push Notifications (Production Only)

For iOS push notifications in **production builds**:

**Option A: Using Expo's Managed Service (Recommended)**

- Expo automatically handles APNs certificates
- Works out of the box with EAS Build
- No manual certificate management

**Option B: Manual Setup**

1. Apple Developer Account Required ($99/year)
2. Create Push Notification Certificate:
   ```bash
   cd frontend
   npx expo credentials:manager
   # Select iOS > Push Notifications > Generate new
   ```

### Step 4: Android Push Notifications (Production Only)

For Android push notifications in **production builds**:

**Option A: Using Expo's Managed Service (Recommended)**

- Upload FCM server key to Expo:
  ```bash
  cd frontend
  npx expo credentials:manager
  # Select Android > Push Notifications > Upload FCM key
  ```

**Option B: Manual Firebase Setup**

1. Go to: https://console.firebase.google.com/
2. Create a new project or use existing
3. Add Android app with package: `app.rork.elbaraka_hypermarket_app`
4. Download `google-services.json`
5. Place in `frontend/` directory
6. Add to `app.json`:
   ```json
   {
     "expo": {
       "android": {
         "googleServicesFile": "./google-services.json"
       }
     }
   }
   ```

---

## Testing Guide

### Test 1: Start the Backend Server

```powershell
cd unibackend
php artisan serve
```

### Test 2: Start Queue Worker (Required for Notifications)

In a **separate terminal**:

```powershell
cd unibackend
php artisan queue:work --queue=high,default,low --tries=3 --timeout=90
```

**Expected output:**

```
[2026-01-28 12:00:00] Processing: App\Jobs\SendOrderNotification
[2026-01-28 12:00:01] Processed: App\Jobs\SendOrderNotification
```

### Test 3: Register Push Token (API Test)

Get your auth token by logging in, then:

```bash
curl -X POST http://localhost:8000/api/v1/notifications/token \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxx]",
    "device_type": "android"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Push token saved successfully"
}
```

### Test 4: Get Notifications List

```bash
curl -X GET "http://localhost:8000/api/v1/notifications?per_page=10" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_HERE"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "notifications": [],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 0,
      "has_more": false
    }
  }
}
```

### Test 5: Get Unread Count

```bash
curl -X GET http://localhost:8000/api/v1/notifications/unread-count \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_HERE"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "count": 0
  }
}
```

### Test 6: Get/Update Preferences

```bash
# Get preferences
curl -X GET http://localhost:8000/api/v1/notifications/preferences \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_HERE"

# Update preferences
curl -X PUT http://localhost:8000/api/v1/notifications/preferences \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "promotions": false,
    "quiet_hours_enabled": true,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "08:00"
  }'
```

### Test 7: Admin Broadcast (Requires Admin Token)

```bash
curl -X POST http://localhost:8000/api/v1/admin/notifications/broadcast \
  -H "Authorization: Bearer ADMIN_AUTH_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "promotion",
    "title": "Flash Sale! 🔥",
    "message": "50% off all items today only!",
    "title_ar": "تخفيضات!",
    "message_ar": "خصم 50% على جميع المنتجات اليوم فقط!"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Broadcast notification queued for 1500 users",
  "data": {
    "notification_id": 42,
    "total_users": 1500,
    "chunks": 3
  }
}
```

### Test 8: Frontend Testing in App

1. **Start the app:**

   ```bash
   cd frontend
   npx expo start
   ```

2. **Open on physical device** (not simulator for push)

3. **Navigate to Notifications tab:**
   - Should load notifications from API
   - Pull down to refresh
   - Tap on notification to mark as read

4. **Navigate to Profile > Notification Preferences:**
   - Toggle master switch
   - Toggle individual categories
   - Set quiet hours

### Test 9: Push Notification Test (Physical Device Only)

Push notifications require a **development build**, not Expo Go:

1. **Build development client:**

   ```bash
   cd frontend
   npx expo run:android
   # OR for iOS
   npx expo run:ios
   ```

2. **Get Expo Push Token:**
   - Open app
   - Check console for: `Expo Push Token: ExponentPushToken[xxxxx]`

3. **Send test via Expo's Tool:**
   - Go to: https://expo.dev/notifications
   - Enter your Expo Push Token
   - Send test message

---

## Production Deployment

### Backend Deployment Checklist

1. **Set production environment:**

   ```env
   APP_ENV=production
   APP_DEBUG=false
   QUEUE_CONNECTION=redis
   ```

2. **Run migrations:**

   ```bash
   php artisan migrate --force
   ```

3. **Start queue workers with Supervisor:**

   Create `/etc/supervisor/conf.d/elbaraka-worker.conf`:

   ```ini
   [program:elbaraka-worker]
   process_name=%(program_name)s_%(process_num)02d
   command=php /var/www/elbaraka/artisan queue:work redis --queue=high,default,low --sleep=3 --tries=3 --max-time=3600
   autostart=true
   autorestart=true
   stopasgroup=true
   killasgroup=true
   numprocs=4
   user=www-data
   redirect_stderr=true
   stdout_logfile=/var/www/elbaraka/storage/logs/worker.log
   ```

   Then run:

   ```bash
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl start elbaraka-worker:*
   ```

4. **Setup scheduled tasks:**

   Add to crontab:

   ```cron
   * * * * * cd /var/www/elbaraka && php artisan schedule:run >> /dev/null 2>&1
   ```

   Add to `app/Console/Kernel.php`:

   ```php
   protected function schedule(Schedule $schedule): void
   {
       $schedule->job(new \App\Jobs\CheckPushReceipts)->everyFiveMinutes();
   }
   ```

### Frontend Deployment

1. **Build for production:**

   ```bash
   cd frontend
   eas build --platform all --profile production
   ```

2. **Submit to stores:**
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

---

## Troubleshooting

### Issue: Notifications not appearing in app

**Check:**

1. Is the user authenticated? (Token required)
2. Check browser network tab for API errors
3. Is the API returning notifications?

### Issue: Push notifications not received

**Check:**

1. Are you using a physical device? (Not Expo Go)
2. Is `push_enabled` true in preferences?
3. Check device notification permissions in Settings
4. Is the push token registered? Check `users.push_tokens` in database

### Issue: Queue worker not processing jobs

**Check:**

1. Is queue worker running? `php artisan queue:work`
2. Check `jobs` table for pending jobs
3. Check `failed_jobs` table for errors

### Issue: Quiet hours not working

**Check:**

1. Is `quiet_hours_enabled` set to `true`?
2. Are times in correct format? (HH:mm like "22:00")
3. Is user timezone set correctly?

### Issue: Broadcast not sending to all users

**Check:**

1. Queue worker running?
2. Check `failed_jobs` table
3. Check `notification_deliveries` table for per-user status
4. Do users have `push_enabled = true`?

### Useful Debug Commands

```bash
# Check queue status
php artisan queue:monitor high,default,low

# Retry all failed jobs
php artisan queue:retry all

# Clear failed jobs
php artisan queue:flush

# Check tables in tinker
php artisan tinker
>>> \App\Models\Notification::count()
>>> \App\Models\NotificationDelivery::where('status', 'failed')->count()
>>> \App\Models\NotificationPreference::where('push_enabled', true)->count()
```

---

## Notification Types Reference

| Type                     | Trigger             | When Sent   |
| ------------------------ | ------------------- | ----------- |
| `order_confirmed`        | Order placed        | Immediately |
| `order_processing`       | Status change       | Immediately |
| `order_out_for_delivery` | Driver assigned     | Immediately |
| `order_delivered`        | Order completed     | Immediately |
| `order_cancelled`        | Order cancelled     | Immediately |
| `complaint_received`     | Complaint submitted | Immediately |
| `complaint_in_progress`  | Staff working on it | Immediately |
| `complaint_resolved`     | Complaint closed    | Immediately |
| `wallet_credited`        | Money added         | Immediately |
| `refund_processed`       | Refund complete     | Immediately |
| `promotion`              | Admin broadcast     | Via queue   |
| `flash_sale`             | Admin broadcast     | Via queue   |
| `welcome`                | User registration   | Immediately |

---

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│   Laravel API    │────▶│   Queue (DB/    │
│  (Expo/RN)      │     │                  │     │   Redis)        │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │                       ▼                        ▼
         │              ┌──────────────────┐     ┌─────────────────┐
         │              │  PushNotification│     │  Queue Workers  │
         │              │     Service      │     │  (4 processes)  │
         │              └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │                       ▼                        ▼
         │              ┌──────────────────┐     ┌─────────────────┐
         └─────────────▶│  Expo Push API   │◀────│  Batch Sender   │
                        │  (100/batch)     │     │  (500 users/    │
                        └────────┬─────────┘     │   chunk)        │
                                 │               └─────────────────┘
                                 ▼
                        ┌──────────────────┐
                        │   APNs / FCM     │
                        │  (iOS / Android) │
                        └──────────────────┘
```

---

**🎉 Implementation Complete!**

The notification system is fully functional. For development testing:

1. Run `php artisan serve` (backend)
2. Run `php artisan queue:work --queue=high,default,low` (queue worker)
3. Run `npx expo start` (frontend)
4. Test on physical device for push notifications
