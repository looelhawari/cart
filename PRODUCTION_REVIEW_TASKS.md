# Production Review — Task Tracker

7-area production-grade review of the elbaraka backend + dashboard + mobile app.
Branch: `feature/app-secured`. Test suite: `tests/Feature/AuditFindingsTest.php`.

Legend: ✅ done · 🔄 in progress · ⬜ pending · ⚠ critical · 🟠 high · 🟡 medium

---

## Slice 1 — Money systems (Promo + Refund + Paymob) ✅ DONE

39/39 tests pass (was 31, +8 new).

| Finding | Severity | File | Status |
|---|---|---|---|
| OrderRefund leaks `paymob_response`/`paymob_refund_id`/`paymob_transaction_id` in JSON | ⚠ | `app/Models/OrderRefund.php` | ✅ added `$hidden`, admin re-exposes via `makeVisible()` |
| PaymobPayment leaks gateway IDs + `billing_data` in JSON | ⚠ | `app/Models/PaymobPayment.php` | ✅ added `$hidden` for 7 fields |
| Two refund services use different idempotency-key shapes → double-refund risk | ⚠ | `app/Services/RefundService.php`, `app/Services/OrderCancellationService.php` | ✅ canonical `OrderRefund::idempotencyKey()` (sha256), both services delegate |
| Promo cart engine misses targeting / audience gates (`specific_user_ids`, `target_audience`, registration/last-order ranges, `minimum_spend_30days`, `location`) | ⚠ | `app/Services/CartService.php::evaluatePromoForCart` | ✅ delegates to `PromoCode::validateForUser`, new `NOT_TARGETED` reason + en/ar strings |
| Discount > subtotal+delivery → negative total saved on order | ⚠ | `app/Services/CartService.php::calculateTotals`, `app/Services/OrderService.php::createOrderFromCart` | ✅ discount clamped to `subtotal+delivery`, total wrapped in `max(0, …)` at both layers |
| Two BOGO/discount engines (model-side + cart-side) — UX divergence between preview and checkout | 🟠 | `app/Models/PromoCode.php`, `app/Services/PromoCodeService.php` | ✅ both annotated PREVIEW-ONLY; cart engine is the single money-time path |
| `paid_at` set before HMAC verify (claimed in audit) | — | `app/Http/Controllers/Api/PaymentController.php` | ✅ verified false alarm — HMAC is gate-checked first; `markAsPaid` is gated post-HMAC + success + capture |

Regression tests added in `AuditFindingsTest.php`:
- `test_order_refund_hides_gateway_fields_from_json`
- `test_paymob_payment_hides_gateway_fields_from_json`
- `test_refund_idempotency_key_is_canonical_sha256`
- `test_refund_service_uses_canonical_idempotency_key`
- `test_cart_engine_rejects_promo_when_user_outside_specific_user_ids`
- `test_cart_totals_clamp_total_at_zero_when_discount_exceeds_subtotal`
- `test_order_creation_clamps_total_after_zone_fee_recompute`
- `test_preview_promo_engine_is_documented_as_preview_only`

---

## Slice 2 — Auth + permissions + Users/Customers merge ✅ DONE

46/46 tests pass (was 39, +7 new).

| Finding | Severity | File | Status |
|---|---|---|---|
| `userService` double-wraps `params` in axios → server receives `params[params][role]` and silently treats as no filter | ⚠ | `AdminDashboard/src/services/user.service.ts` | ✅ both `getUsers` + `getCustomers` now pass params directly |
| Support ticket cascade-delete on user deletion destroys audit trail | ⚠ | `database/migrations/2026_05_10_000003_preserve_complaint_audit_on_user_deletion.php` | ✅ FK changed to `nullOnDelete()`; identity-snapshot columns added + backfilled; `Complaint::booted` and `ComplaintMessage::booted` auto-populate snapshots so audit survives user deletion |
| Duplicate `support_tickets`/`ticket_messages` tables (DEAD); controllers wrote only to `complaints` | ⚠ | `database/migrations/2026_05_10_000002_drop_dead_support_tables.php`, `app/Models/SupportTicket.php` (deleted), `app/Models/TicketMessage.php` (deleted) | ✅ tables dropped, orphan models deleted |
| Admin role check uses `OR` between `is_admin` and `role IN (...)` in two places — single-flag bypass | — | `app/Models/User.php::isAdmin` | ✅ verified false alarm — `isAdmin()` is pure role allowlist, no `is_admin` boolean column exists |
| Customer/Users page split + dead controllers | 🟠 | — | ⬜ deferred — UX cleanup, no security impact (slice covers backend integrity) |

Regression tests added in `AuditFindingsTest.php`:
- `test_admin_users_service_does_not_double_wrap_params`
- `test_dead_support_ticket_tables_are_dropped`
- `test_orphan_support_ticket_models_are_removed`
- `test_complaint_user_fk_is_set_null_on_user_delete`
- `test_complaint_message_user_fk_is_set_null_on_user_delete`
- `test_complaint_creation_writes_identity_snapshot`
- `test_complaint_message_creation_writes_author_snapshot`

---

## Slice 3 — Delivery zones + addresses ✅ DONE

52/52 tests pass (was 46, +6 new).

| Finding | Severity | File | Status |
|---|---|---|---|
| Admin invalidations cleared `delivery_zones:active` but customers read from `zones:active:all` (30-min TTL) — admin price changes invisible to customers for half an hour | ⚠ | `app/Services/DeliveryZoneService.php`, `app/Http/Controllers/Api/Admin/AdminDeliveryZoneController.php` | ✅ unified into `ZONE_CACHE_KEYS` constant; admin reorder also flushes |
| Out-of-zone addresses silently accepted at checkout with the flat fee (no driver could deliver) | ⚠ | `app/Services/OrderService.php::createOrderFromCart` | ✅ hard-throw with `delivery_zone.outside_delivery_zones` translation; no-coordinates also rejected |
| Free-delivery threshold honored by `CheckoutService` but ignored by `OrderService` zone-fee branch — customers paid for delivery they were promised was free | ⚠ | `app/Services/OrderService.php`, `app/Services/DeliveryZoneService.php::snapshotZoneToOrder` | ✅ `OrderService` reads `free_delivery_threshold` and skips zone-fee override when met; `snapshotZoneToOrder` no longer rewrites `delivery_fee` (was clobbering the freebie post-create) |
| Client supplies `latitude`/`longitude` AND `formatted_address` separately — they could disagree (cheap-zone pin, expensive-zone text) | ⚠ | `app/Http/Controllers/Api/AddressController.php` | ✅ `reverseGeocodeAndStamp()` runs on store + update when coords change; canonical formatted_address comes from server-side Nominatim, fails open if Nominatim is down |

Regression tests added in `AuditFindingsTest.php`:
- `test_zone_cache_keys_include_customer_facing_key`
- `test_zone_create_clears_customer_cache`
- `test_order_creation_blocks_out_of_zone_addresses`
- `test_order_service_honors_free_delivery_threshold_over_zone_fee`
- `test_zone_snapshot_does_not_overwrite_delivery_fee`
- `test_address_controller_reverse_geocodes_client_coords`

---

## Slice 4 — Store settings + Reviews/Ratings ⬜ PENDING

| Finding | Severity |
|---|---|
| Admin "Clear Cache" calls `route:clear` → wipes route cache for all users (DoS) | ⚠ |
| Reviews use `product_id` ↔ `barcode` schism (some queries miss reviews silently) | ⚠ |
| Dead duplicate store-settings controller still writes to logs | ⚠ |
| Review `comment` rendered raw in admin → stored XSS | ⚠ |
| `markHelpful` on reviews is a no-op (POST accepted, server ignores) | ⚠ |
| Timezone fix needed in store settings | 🟠 |
| RatingLog wiring missing | 🟠 |

---

## Slice 5 — Dashboard pages full audit ⬜ PENDING

| Finding | Severity |
|---|---|
| `CustomerDetailsPage` uses `prompt()` for refund amount | ⚠ |
| `FinancialPage` console.logs full revenue payload to browser console | ⚠ |
| `ContentManagementPage` renders user HTML via `dangerouslySetInnerHTML` without sanitize | ⚠ |
| `DashboardPage` paginates with `per_page=100` cap → totals undercount when >100 records | ⚠ |
| ~20 high-severity issues across other pages | 🟠 |

---

## Sources

Original audit reports from parallel discovery agents (Phase 0):
1. `a1fff47d` — Dashboard pages audit (31 .tsx files)
2. `a2406fd4` — Promo + Refund (covered by Slice 1)
3. `a9c1fb2d` — Delivery zones (Slice 3)
4. `af9dbe0c` — Store settings + Reviews (Slice 4)
5. `a7832ad9` — Support tickets + Users merge (Slice 2)

Wave 1 (`da0764b`) and Wave 2 (`8e34c0a`) commits already on `feature/app-secured`.
