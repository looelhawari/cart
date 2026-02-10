# Delivery & Tracking System — Current State & Missing Pieces

> Last updated: February 10, 2026  
> Branch: `feature/leaflet-osm-migration`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        3 LAYERS                                  │
├──────────────────┬──────────────────┬───────────────────────────┤
│  Laravel Backend  │  React Admin     │  React Native Mobile     │
│  (unibackend/)    │  (admindash/)    │  (frontend/)             │
├──────────────────┼──────────────────┼───────────────────────────┤
│  ✅ Zones API     │  ✅ Zones UI      │  ✅ Customer tracking     │
│  ✅ Driver API    │  ❌ Drivers UI    │  ✅ Address + zones       │
│  ✅ Tracking API  │  ❌ Tracking UI   │  ❌ Driver app            │
│  ⚠️  Events       │  ⚠️  Order detail │  ⚠️  WebSocket            │
└──────────────────┴──────────────────┴───────────────────────────┘
```

---

## ✅ WHAT EXISTS AND WORKS

### Backend (Laravel)

| Feature | File(s) | Status |
|---------|---------|--------|
| Delivery Zone CRUD | `AdminDeliveryZoneController.php` | Full polygon-based zones with schedules, fees, analytics |
| Zone coverage check | `DeliveryZoneService.php` | Ray-casting algorithm, fee calculation, surge multiplier |
| Zone-address matching | `GeoHelper::autoAssignZone()` | Auto-assigns zone on address create/update |
| Driver fields on User model | `User.php` | `current_lat`, `current_lng`, `is_available`, `assigned_zone_id`, `vehicle_type`, `vehicle_plate`, `total_deliveries`, `average_rating` |
| Driver API endpoints | `DriverController.php` | Dashboard, orders list, accept/pickup/deliver, GPS update, toggle availability, stats |
| Auto-assign nearest driver | `DeliveryZoneService::assignDriver()` | Finds available drivers in zone, sorts by Haversine distance |
| Customer tracking endpoint | `OrderController::tracking()` | `GET /orders/{id}/tracking` — timeline, driver GPS, ETA, delivery address |
| DriverLocationUpdated event | `DriverLocationUpdated.php` | Broadcasts driver GPS on `order.{orderId}.tracking` channel |
| OrderStatusUpdated event | `OrderStatusUpdated.php` | Broadcast event class (created but see issues below) |
| Channel authorization | `channels.php` | `order.{orderId}.tracking` — authorizes order owner or admin |
| Pusher/broadcasting config | `broadcasting.php` + `.env` | Pusher credentials configured |
| Order lifecycle | `OrderController.php` + `AdminOrderController.php` | Full flow: pending → confirmed → preparing → out_for_delivery → delivered + cancel + refund |
| Push notifications | `AdminOrderController::updateStatus()` | FCM push on every status change |
| Zone analytics | `DeliveryZoneService::getZoneAnalytics()` | Per-zone: orders, revenue, delivery rate, active drivers |
| Comprehensive analytics | `ComprehensiveAnalyticsController.php` | Delivery success rate, fulfillment rate, operational stats |

### Admin Dashboard (React)

| Feature | File(s) | Status |
|---------|---------|--------|
| Zone list page | `DeliveryZonesPage.tsx` | Table with name, fees, est. time, status, polygon point count |
| Zone create/edit with map | `DeliveryZonesPage.tsx` | Leaflet + leaflet-draw, polygon drawing, full form panel |
| Zone dashboard stats | `DeliveryZonesPage.tsx` | Total zones, drivers, today's orders, address coverage |
| Order management | `OrdersPage.tsx` + `OrderDetailPage.tsx` | List, detail, status progression buttons, status badges |
| Analytics page | `ComprehensiveAnalyticsPage.tsx` | Operational tab with delivery metrics |

### Mobile App (React Native / Expo)

| Feature | File(s) | Status |
|---------|---------|--------|
| Order tracking screen | `app/orders/tracking.tsx` | ETA banner, live map, driver card, status timeline, 10s polling |
| Tracking map component | `components/OrderTrackingMap.tsx` | Leaflet WebView, blue driver marker (rotates), green delivery pin, dashed route line |
| Status timeline component | `components/OrderStatusBar.tsx` | 5-step vertical timeline with icons, completion states, timestamps |
| Tracking API service | `services/api/trackingApi.ts` | Full TypeScript types + API client |
| Track buttons | `(tabs)/orders.tsx` + `orders/[id].tsx` | Green "Track" button on active orders |
| Address management | `profile/addresses/` | Full CRUD, map picker, zone coverage check |
| Map address picker | `components/MapAddressPicker.tsx` | Leaflet + Nominatim, GPS, zone overlay, delivery time + distance display |
| Checkout delivery | `checkout/address.tsx` + `confirmation.tsx` | Address selection, fee display, time display, zone validation |
| Push notifications | `services/notificationService.ts` | Expo push token registration, delivery_updates preference |
| i18n tracking keys | `i18n/locales/en.ts` + `ar.ts` | 25 tracking-related translation keys in both languages |

---

## 🔴 CRITICAL — System Won't Work Without These

### 1. Driver App (Mobile) — **COMPLETELY MISSING**

The entire tracking system depends on drivers sending their GPS location and managing orders. Currently there is NO driver-facing UI.

**What needs to be built:**
- Driver login + role-based routing (detect `role === 'driver'` → show driver screens)
- Driver dashboard (active orders count, today's stats, availability toggle)
- Assigned orders list with accept button
- Order detail: accept → pickup → deliver flow with confirmation
- Background GPS location sending (every 15-30s while on active delivery)
- Delivery proof (photo upload, signature, notes)
- Earnings/stats screen

**Backend endpoints already exist:** `DriverController.php` has all 8 endpoints ready:
```
GET    /driver/dashboard
POST   /driver/toggle-availability
POST   /driver/location
GET    /driver/orders
POST   /driver/orders/{id}/accept
POST   /driver/orders/{id}/pickup
POST   /driver/orders/{id}/deliver
GET    /driver/stats
```

**Estimated effort:** 2-3 days

---

### 2. Auto-Assign Trigger — **NOT WIRED**

`DeliveryZoneService::assignDriver()` method exists and works, but it is **never called automatically**. When an admin confirms an order, no driver gets assigned.

**Fix:** Add `$this->deliveryZoneService->assignDriver($order)` call inside `AdminOrderController::updateStatus()` when status transitions to `confirmed`.

**Estimated effort:** 30 minutes

---

### 3. Driver Role Middleware — **MISSING**

The driver routes (`/api/v1/driver/*`) are protected by `auth:sanctum` but have **no role check**. Any authenticated customer can call driver endpoints.

**Fix:** Create `CheckDriverRole` middleware that verifies `$request->user()->role === 'driver'`.

**Estimated effort:** 30 minutes

---

### 4. OrderStatusUpdated Event — **NEVER DISPATCHED**

The event class exists (`app/Events/OrderStatusUpdated.php`) but `broadcast(new OrderStatusUpdated(...))` is never called anywhere. Customers won't receive real-time WebSocket status updates.

**Fix:** Add `broadcast(new OrderStatusUpdated($order))` inside `AdminOrderController::updateStatus()` after status change.

**Estimated effort:** 5 minutes

---

## 🟡 IMPORTANT — Significant Feature Gaps

### 5. Admin: Driver Management Page — **MISSING**

No way to manage drivers from the admin dashboard. Need:
- Driver list/table (name, phone, zone, status, rating, total deliveries)
- Create/edit driver form (user details + vehicle info + zone assignment)
- Driver availability overview
- Driver performance metrics

**Estimated effort:** 1-2 days

---

### 6. Admin: Assign Driver to Order — **MISSING**

`OrderDetailPage.tsx` has status progression buttons but no driver assignment. Need:
- Dropdown/modal to select available driver from order's delivery zone
- "Assign Driver" button on order detail
- Backend endpoint: `POST /admin/orders/{id}/assign-driver`

**Estimated effort:** 4 hours

---

### 7. Admin: Live Tracking Map — **MISSING**

Admin can't see driver locations in real-time. Need:
- Map view on order detail showing driver + delivery location
- Optional: Zone-wide map showing all active drivers

**Estimated effort:** 1 day

---

### 8. Admin: Order Timeline Rendering — **PARTIAL**

`orderService.getOrderTimeline()` exists and calls the backend, but `OrderDetailPage.tsx` doesn't render it. Need to add timeline component to order detail.

**Estimated effort:** 2 hours

---

### 9. Driver Reject/Decline Flow — **MISSING**

Drivers can only accept orders, never decline. Need:
- `POST /driver/orders/{id}/reject` endpoint with reason
- Reassignment logic (find next nearest available driver)
- Max-rejection limit before escalating to admin

**Estimated effort:** 4 hours

---

### 10. WebSocket for Order Status (Mobile) — **NOT WIRED**

Echo/Pusher is configured and used for complaints chat, but order tracking uses HTTP polling only (10s). Should wire Pusher for instant status updates.

**Estimated effort:** 2 hours

---

### 11. Duplicate Tracking Screen — **CLEANUP NEEDED**

Two tracking screens exist:
- `app/orders/tracking.tsx` — ✅ Primary, API-driven, fully functional
- `app/orders/[id]/track.tsx` — ❌ Old mock version with placeholder map

The old one should be removed or redirected to the new one.

**Estimated effort:** 15 minutes

---

## 🟢 NICE-TO-HAVE — Polish & Analytics

| # | Feature | Layer | Effort |
|---|---------|-------|--------|
| 12 | Zone schedule editor UI | Admin | 4 hours |
| 13 | Zone analytics detail page | Admin | 4 hours |
| 14 | Driver performance admin dashboard | Admin + Backend | 1 day |
| 15 | Order status history table (actual timestamps) | Backend | 2 hours |
| 16 | Average delivery time analytics | Backend | 2 hours |
| 17 | Address fee/time display in profile | Mobile | 1 hour |
| 18 | Delivery proof (photo/signature) | Mobile + Backend | 4 hours |
| 19 | Driver earnings/payout management | All layers | 2 days |
| 20 | Multi-language push notification content | Backend | 2 hours |

---

## Recommended Build Priority

```
Phase 1 — Make tracking work end-to-end (~3 days)
  ├── 1. Driver role middleware (30 min)
  ├── 2. Auto-assign trigger (30 min)
  ├── 3. Dispatch OrderStatusUpdated (5 min)
  ├── 4. Driver App screens (2-3 days)
  │     ├── Login + role routing
  │     ├── Dashboard
  │     ├── Order accept/pickup/deliver
  │     └── Background GPS location
  └── 5. Remove duplicate tracking screen (15 min)

Phase 2 — Admin delivery management (~3 days)
  ├── 6. Admin Driver CRUD page (1-2 days)
  ├── 7. Assign driver to order (4 hours)
  ├── 8. Live tracking map in admin (1 day)
  └── 9. Order timeline rendering (2 hours)

Phase 3 — Polish & real-time (~1 day)
  ├── 10. Wire WebSocket for order status (2 hours)
  ├── 11. Driver reject/decline flow (4 hours)
  └── 12. Zone schedule editor UI (4 hours)

Phase 4 — Analytics & extras (~2 days)
  ├── 13-16. Analytics improvements
  └── 17-20. Polish features
```

---

## Database Schema (Delivery-Related)

### Key Tables
- `delivery_zones` — Polygon zones with fees, schedules, surge multipliers
- `delivery_zone_schedules` — Day/time schedules per zone
- `driver_location_history` — GPS trail: driver_id, order_id, lat, lng, speed, heading
- `addresses` — User addresses with lat/lng, delivery_zone_id auto-assigned
- `orders` — Has `driver_id`, `driver_assigned_at`, `driver_picked_up_at`, `actual_delivered_at`, `estimated_delivery_minutes`, `delivery_lat`, `delivery_lng`
- `users` — Driver fields: `role='driver'`, `current_lat/lng`, `is_available`, `assigned_zone_id`, `vehicle_type/plate`, `total_deliveries`, `average_rating`

### Key: Products table uses `barcode` as primary key (NOT `id`)
- `order_items.product_id` is FK to `products.barcode`

---

## API Endpoints Summary

### Customer APIs (exist & working)
```
GET    /api/v1/orders/{id}/tracking     — Full tracking data
POST   /api/v1/delivery-zones/check-coverage
POST   /api/v1/delivery-zones/calculate-fee
POST   /api/v1/delivery-zones/reverse-geocode
GET    /api/v1/delivery-zones
```

### Driver APIs (exist, need middleware + mobile app)
```
GET    /api/v1/driver/dashboard
POST   /api/v1/driver/toggle-availability
POST   /api/v1/driver/location
GET    /api/v1/driver/orders
POST   /api/v1/driver/orders/{id}/accept
POST   /api/v1/driver/orders/{id}/pickup
POST   /api/v1/driver/orders/{id}/deliver
GET    /api/v1/driver/stats
```

### Admin APIs (exist & working)
```
GET    /api/v1/admin/delivery-zones/dashboard
GET    /api/v1/admin/delivery-zones/{id}/analytics
CRUD   /api/v1/admin/delivery-zones
```

### Broadcasting Channels
```
private-order.{orderId}.tracking  — Driver GPS + status updates
```
