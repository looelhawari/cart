# Complaints & Favorites – Implementation Documentation

Last updated: 2026-01-25

## Overview
This document describes the full implementation for:
- My Complaints (Support tickets + replies + attachments)
- My Favorites (product favorites)

Scope includes backend APIs, database schema, frontend integration, and security constraints.

---

## Backend (Laravel API)

### Routes (auth:sanctum)
- Favorites
  - `GET /api/v1/favorites`
  - `POST /api/v1/favorites`
  - `DELETE /api/v1/favorites/{productId}`
- Complaints
  - `GET /api/v1/complaints`
  - `POST /api/v1/complaints`
  - `GET /api/v1/complaints/{id}`
  - `POST /api/v1/complaints/{id}/reply`
  - `POST /api/v1/complaints/{id}/close`

Rate limiting:
- Complaints + Favorites routes use `throttle:60,1`.

### Controllers
- `backend/app/Http/Controllers/Api/FavoriteController.php`
  - List, add, remove favorites.
  - Prevents duplicates with `firstOrCreate`.
  - Returns products via `FavoriteResource`.

- `backend/app/Http/Controllers/Api/ComplaintController.php`
  - List complaints (with message count).
  - Create complaints + attachments (PDF/images).
  - Load complaint details (messages + attachments).
  - Reply to complaint (user only).
  - Close complaint (user only).

### Validation (Form Requests)
- `StoreFavoriteRequest`
  - `product_id` required, must exist in `products.barcode`.
- `StoreComplaintRequest`
  - `subject`: required, max 255
  - `category`: enum
  - `priority`: enum (optional)
  - `description`: required
  - `order_id`: optional, must belong to authenticated user
  - `attachments.*`: pdf, jpg, jpeg, png, webp, max 5MB
- `StoreComplaintReplyRequest`
  - `message`: required, max 2000

### Cloudinary Uploads
File uploads for complaints are handled in:
- `backend/app/Services/CloudinaryService.php`

Behavior:
- Images → `resource_type=image`
- PDFs → `resource_type=raw`
- Uses UUID-based public IDs

### Resources
Response formatting uses:
- `FavoriteResource`
- `ComplaintResource`
- `ComplaintMessageResource`
- `ComplaintAttachmentResource`

---

## Database

Tables added/verified:
- `favorites`
  - Unique `(user_id, product_id)`
- `complaints`
- `complaint_messages`
- `complaint_attachments`

Schema alignment:
`elbaraka_database.sql` updated for complaint attachments to include:
`user_id`, `mime_type`, `size_bytes`, `storage_provider`, `public_id`, and indexes.

### Migrations
Files:
- `backend/database/migrations/2026_01_25_000001_create_favorites_table.php`
- `backend/database/migrations/2026_01_25_000002_create_complaints_table.php`
- `backend/database/migrations/2026_01_25_000003_create_complaint_messages_table.php`
- `backend/database/migrations/2026_01_25_000004_create_complaint_attachments_table.php`

---

## Frontend (React Native)

### API Clients
- `frontend/services/api/favoritesApi.ts`
- `frontend/services/api/complaintsApi.ts`

### Store (Zustand)
Favorites logic now supports backend sync:
- `fetchFavorites`, `addFavorite`, `removeFavorite`, `toggleFavorite`
- On login/verification/social login: favorites are fetched.

### Screens
- `frontend/app/profile/favorites.tsx`
  - Uses backend favorites when authenticated.
  - Falls back to local favorites for guests.
  - Supports add-all-to-cart and clear-all.

- `frontend/app/complaints/index.tsx`
  - Lists complaints via API.

- `frontend/app/complaints/new.tsx`
  - Submits new complaint via API.
  - Attachment picker for PDF/image files.

- `frontend/app/complaints/[id].tsx`
  - Shows complaint details, messages, and reply form.

### Attachments (Mobile)
Uses `expo-document-picker` to upload:
- PDF
- JPG / JPEG / PNG / WEBP

---

## Security & Data Protection
- Auth required for all endpoints (`auth:sanctum`).
- User scoping prevents IDOR (complaints/favorites always scoped to authenticated user).
- Form request validation on all writes.
- Attachments limited to safe MIME types + size cap.
- No admin endpoints exposed for complaints per current scope.

---

## Seed Data (User ID 2)
Seeder:
- `backend/database/seeders/ComplaintFavoriteSeeder.php`

Includes:
- Favorites for user_id=2
- Two sample complaints (one with attachments + messages)

DatabaseSeeder now calls `ComplaintFavoriteSeeder`.

---

## How to Test (Manual)
1) Run migrations and seeders:
   - `php artisan migrate`
   - `php artisan db:seed`
2) Login as user_id=2 (seeded) or your own account.
3) Verify:
   - Favorites list loads and toggling works.
   - Complaints list loads.
   - Complaint detail shows messages.
   - Submitting new complaint with attachments works.

