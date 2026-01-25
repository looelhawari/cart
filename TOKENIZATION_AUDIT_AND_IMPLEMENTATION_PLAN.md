# 🔍 TOKENIZATION AUDIT & PRODUCTION IMPLEMENTATION PLAN

**Generated:** January 24, 2026  
**Objective:** Transform current payment system into production-grade hypermarket checkout (Talabat/Amazon/Noon standard)

---

## PART 1: TOKENIZATION GAP - HARD EVIDENCE ✅

### 1.1 Webhook Payload Analysis

**Evidence Source:** `backend/storage/logs/laravel.log` (Line: 2026-01-24 10:10:57)

```
[2026-01-24 10:10:57] local.WARNING: 💳 Card save requested but no token in callback
{"payment_id":79,"has_source_data":true}
```

**Definitive Answer:**

> ✅ **CASE B CONFIRMED**: Tokenization is NOT enabled / Wrong API flow in use
>
> **Current State:** Webhook contains ONLY `source_data.pan` / `source_data.sub_type` with **NO token object**

### 1.2 Exact JSON Path Analysis

**Current Webhook Structure** (from PaymentController.php line 660):

```php
// Code checks for:
if (!isset($payload['source_data']['token'])) {
    Log::warning('💳 Card save requested but no token in callback');
    return false;
}
```

**What We Receive:**

```json
{
  "obj": {
    "success": true,
    "id": 402436270,
    "order": { "id": 456855099 },
    "source_data": {
      "pan": "1111", // ✅ EXISTS
      "type": "card", // ✅ EXISTS
      "sub_type": "Visa", // ✅ EXISTS
      "tenure": null
      // ❌ NO "token" field
    }
  }
}
```

**What We SHOULD Receive** (from Paymob Intention API docs):

```json
{
  "obj": {
    "success": true,
    "id": 402436270,
    "order": { "id": 456855099 },
    "source_data": {
      "type": "TOKEN", // Changed to TOKEN type
      "pan": "4242", // Last 4 digits
      "sub_type": "Visa"
    },
    "token": {
      // ⭐ NEW OBJECT
      "token": "tok_xxxxxxxxxxxxxxxxxxxxxxxx",
      "masked_pan": "4242",
      "card_subtype": "CREDIT"
    }
  }
}
```

**Conclusion:**

- Current API: Classic `/acceptance/payment_keys` (iframe flow) - **NO tokenization support**
- Required API: `/v1/intention/` (Unified Checkout) - **HAS tokenization support**
- **Action Required:** Migrate to Intention API to enable token object in webhook

---

## PART 2: CONCEPTUAL BUG - JWT PAYMENT KEY AS CARD TOKEN ⚠️

### 2.1 Root Cause Analysis

**Database Evidence** (from tinker query 2026-01-24):

```
payment_methods.token (encrypted):
eyJpdiI6IjlUYmJBTGhYalVsdjkrRkxEK1daWkE9PSIsInZhbHVl...
(Laravel Crypt format - starts with eyJpdiI6)

When decrypted:
eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9...
(JWT payment authorization key - expires in 1 hour)

What it SHOULD be:
tok_xxxxxxxxxxxxxxxxxxxxxxxx
(Paymob saved card token - stable, never expires)
```

**Impact Assessment:**

- ❌ **Saved card payments fail** - Paymob rejects expired/invalid JWT as card_token
- ❌ **Security risk** - Storing unnecessary sensitive tokens
- ❌ **Database bloat** - 500+ character JWTs instead of 30-character tokens
- ❌ **User frustration** - "Saved cards" don't work, forcing card re-entry

### 2.2 Database Remediation Plan

#### Migration Strategy

**Option A: Clean Slate (Recommended)**

```sql
-- Mark all existing saved cards as invalid (they contain JWTs)
UPDATE payment_methods
SET status = 'invalid',
    invalidated_reason = 'Migration: JWT to Paymob token conversion',
    invalidated_at = NOW()
WHERE created_at < '2026-01-24 15:00:00';

-- Add new column for proper tokenization
ALTER TABLE payment_methods
ADD COLUMN paymob_card_token VARCHAR(100) AFTER token,
ADD COLUMN token_type ENUM('paymob_saved_card', 'legacy_jwt') DEFAULT 'paymob_saved_card';

-- Add index for performance
CREATE INDEX idx_paymob_card_token ON payment_methods(paymob_card_token);
```

**Option B: Preserve + Migrate**

```sql
-- Rename old column to preserve history
ALTER TABLE payment_methods
RENAME COLUMN token TO legacy_payment_key;

-- Add new columns
ALTER TABLE payment_methods
ADD COLUMN paymob_card_token VARCHAR(100) AFTER legacy_payment_key,
ADD COLUMN token_fingerprint_v2 VARCHAR(64) AFTER paymob_card_token;

-- Mark all existing as legacy
UPDATE payment_methods SET token_type = 'legacy_jwt';
```

**Decision:** Use **Option A** - clean break, clear semantics, no legacy baggage

#### File Changes Required

**backend/database/migrations/YYYY_MM_DD_migrate_to_paymob_card_tokens.php**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Invalidate existing JWT-based saved cards
        DB::table('payment_methods')
            ->whereNull('deleted_at')
            ->update([
                'status' => 'invalid',
                'invalidated_reason' => 'Migration: Converting from JWT to Paymob card token',
                'invalidated_at' => now(),
            ]);

        // 2. Add new column for Paymob saved card token
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->string('paymob_card_token', 100)->nullable()->after('token');
            $table->enum('token_type', ['paymob_saved_card', 'legacy_jwt'])
                  ->default('paymob_saved_card')
                  ->after('paymob_card_token');

            $table->index('paymob_card_token');
        });

        // 3. Add status column if doesn't exist
        if (!Schema::hasColumn('payment_methods', 'status')) {
            Schema::table('payment_methods', function (Blueprint $table) {
                $table->enum('status', ['active', 'invalid', 'revoked'])
                      ->default('active')
                      ->after('is_verified');
                $table->string('invalidated_reason')->nullable();
                $table->timestamp('invalidated_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn(['paymob_card_token', 'token_type', 'status', 'invalidated_reason', 'invalidated_at']);
        });
    }
};
```

**backend/app/Models/PaymentMethod.php** (Update accessors)

```php
// NEW: Encrypt Paymob card token (stable, reusable)
public function setPaymobCardTokenAttribute($value): void
{
    if ($value) {
        $this->attributes['paymob_card_token'] = Crypt::encryptString($value);
        $this->attributes['token_fingerprint'] = hash('sha256', $value);
    }
}

public function getPaymobCardTokenAttribute($value): ?string
{
    if (!$value) return null;

    try {
        return Crypt::decryptString($value);
    } catch (\Exception $e) {
        Log::error('Failed to decrypt paymob_card_token', ['payment_method_id' => $this->id]);
        return null;
    }
}

// DEPRECATED: Keep for backward compatibility during migration
public function getTokenAttribute($value): ?string
{
    // Redirect to new column
    return $this->paymob_card_token;
}
```

---

## PART 3: PRODUCTION SOLUTION - DUAL FLOW IMPLEMENTATION 🚀

### 3.1 Paymob Requirements Mapping

| **Requirement**            | **API Endpoint**                    | **Our Implementation**                | **Status**      |
| -------------------------- | ----------------------------------- | ------------------------------------- | --------------- |
| **Flow A: 3DS Card Save**  | `POST /v1/intention/`               | PaymobService::createIntention()      | ⏳ To Implement |
| **Unified Checkout URL**   | Response: `client_secret`           | Return to frontend WebView            | ⏳ To Implement |
| **Token Extraction**       | Webhook: `token.token` field        | extractCardTokenFromIntention()       | ⏳ To Implement |
| **Flow B: MOTO One-Click** | `POST /api/acceptance/payments/pay` | PaymobService::payWithSavedCardMoto() | ⏳ To Implement |
| **Fresh Payment Key**      | `POST /acceptance/payment_keys`     | Existing (reuse for MOTO)             | ✅ Implemented  |
| **HMAC Verification**      | Webhook validation                  | Existing verifyHmac()                 | ✅ Implemented  |
| **Idempotency**            | Atomic transaction + status check   | Existing processedCallback()          | ✅ Implemented  |

### 3.2 Implementation Plan - Step by Step

#### STEP 1: Add Intention API Support (Flow A - 3DS)

**File: backend/app/Services/PaymobService.php**

```php
/**
 * Create Paymob Intention for Unified Checkout (3DS flow).
 * Used for:
 * - First-time card save (tokenization)
 * - Fallback when MOTO fails or requires 3DS
 * - High-value orders that mandate 3DS
 *
 * @param array $intentionData
 * @return array ['intention_id', 'client_secret', 'unified_checkout_url']
 */
public function createIntention(array $intentionData): array
{
    $authToken = $this->authenticate();

    $endpoint = 'https://accept.paymob.com/v1/intention/';

    // Build request payload
    $payload = [
        'amount' => $intentionData['amount_cents'], // Integer (cents)
        'currency' => $this->currency,

        // Specify which payment methods to show in Unified Checkout
        'payment_methods' => [
            (int) $this->integrationId3DS, // Your 3DS integration ID
        ],

        // Billing data (required)
        'billing_data' => [
            'first_name' => $intentionData['billing']['first_name'] ?? 'Guest',
            'last_name' => $intentionData['billing']['last_name'] ?? 'User',
            'email' => $intentionData['billing']['email'] ?? 'guest@example.com',
            'phone_number' => $intentionData['billing']['phone'] ?? '+201000000000',
            'country' => 'EG',
            'city' => $intentionData['billing']['city'] ?? 'Cairo',
            'street' => $intentionData['billing']['street'] ?? 'N/A',
            'building' => $intentionData['billing']['building'] ?? 'N/A',
            'floor' => $intentionData['billing']['floor'] ?? 'N/A',
            'apartment' => $intentionData['billing']['apartment'] ?? 'N/A',
        ],

        // Items (for fraud detection + reporting)
        'items' => $intentionData['items'] ?? [],

        // Webhook + Redirect URLs
        'notification_url' => $this->callbackUrl,
        'redirection_url' => $intentionData['redirection_url'],

        // Special reference for mapping (our internal order ID or payment attempt ID)
        'special_reference' => $intentionData['internal_reference'],
    ];

    // OPTIONAL: If paying with already saved card (pre-fill card details)
    if (!empty($intentionData['saved_card_token'])) {
        $payload['card_tokens'] = [$intentionData['saved_card_token']];
    }

    Log::info('🔐 Creating Paymob Intention (Unified Checkout)', [
        'amount_cents' => $payload['amount'],
        'currency' => $payload['currency'],
        'has_saved_card' => !empty($intentionData['saved_card_token']),
        'special_reference' => $payload['special_reference'],
    ]);

    $response = Http::timeout(30)
        ->retry(2, 1000)
        ->post($endpoint, $payload);

    if (!$response->successful()) {
        Log::error('❌ Paymob Intention API failed', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);
        throw new \Exception('Failed to create Paymob intention: ' . $response->body());
    }

    $data = $response->json();

    // Extract client_secret for Unified Checkout URL
    $clientSecret = $data['client_secret'] ?? null;
    $intentionId = $data['id'] ?? null;

    if (!$clientSecret || !$intentionId) {
        throw new \Exception('Invalid Paymob intention response: missing client_secret or id');
    }

    // Build Unified Checkout URL
    $unifiedCheckoutUrl = "https://accept.paymob.com/unifiedcheckout/"
        . "?publicKey={$this->publicKey}"
        . "&clientSecret={$clientSecret}";

    Log::info('✅ Paymob Intention created successfully', [
        'intention_id' => $intentionId,
        'client_secret_preview' => substr($clientSecret, 0, 20) . '...',
    ]);

    return [
        'intention_id' => $intentionId,
        'client_secret' => $clientSecret,
        'unified_checkout_url' => $unifiedCheckoutUrl,
    ];
}
```

**File: backend/config/services.php** (Add public key)

```php
'paymob' => [
    'api_key' => env('PAYMOB_API_KEY'),
    'public_key' => env('PAYMOB_PUBLIC_KEY'), // NEW
    'integration_id' => env('PAYMOB_INTEGRATION_ID'),
    'integration_id_3ds' => env('PAYMOB_INTEGRATION_ID_3DS'), // NEW
    'hmac_secret' => env('PAYMOB_HMAC_SECRET'),
    'callback_url' => env('PAYMOB_CALLBACK_URL'),
    'currency' => env('PAYMOB_CURRENCY', 'EGP'),
],
```

**File: backend/.env** (Add new keys)

```env
PAYMOB_PUBLIC_KEY=your_public_key_here
PAYMOB_INTEGRATION_ID_3DS=your_3ds_integration_id
```

#### STEP 2: Add MOTO Payment Support (Flow B - One-Click)

**File: backend/app/Services/PaymobService.php**

```php
/**
 * Pay with saved card using MOTO (Mail Order / Telephone Order).
 * Server-to-server payment, NO user interaction, NO 3DS.
 *
 * REQUIREMENTS:
 * - Must have saved card token from previous successful payment
 * - Payment key (JWT) must be generated fresh per attempt
 * - Only for low/medium risk orders (per your business rules)
 *
 * @param string $savedCardToken Paymob saved card token (from payment_methods.paymob_card_token)
 * @param string $paymentKeyJWT Fresh JWT payment key from generatePaymentKey()
 * @return array MOTO payment result
 */
public function payWithSavedCardMoto(string $savedCardToken, string $paymentKeyJWT): array
{
    $endpoint = 'https://accept.paymob.com/api/acceptance/payments/pay';

    $payload = [
        'source' => [
            'identifier' => $savedCardToken,  // ⭐ Paymob saved card token
            'subtype' => 'TOKEN',
        ],
        'payment_token' => $paymentKeyJWT,    // ⭐ Fresh JWT payment key
    ];

    Log::info('💳 MOTO payment attempt', [
        'token_preview' => substr($savedCardToken, 0, 10) . '...',
        'payment_key_preview' => substr($paymentKeyJWT, 0, 20) . '...',
    ]);

    $response = Http::timeout(30)
        ->retry(1, 500) // MOTO should be fast, only 1 retry
        ->post($endpoint, $payload);

    if (!$response->successful()) {
        Log::warning('⚠️ MOTO payment failed or requires action', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        $errorData = $response->json();

        // Check if 3DS required (common fallback scenario)
        if ($this->requiresRedirection($errorData)) {
            return [
                'success' => false,
                'requires_3ds' => true,
                'redirect_url' => $errorData['redirect_url'] ?? null,
                'message' => 'MOTO declined, 3DS required',
            ];
        }

        return [
            'success' => false,
            'requires_3ds' => false,
            'error' => $errorData['message'] ?? 'MOTO payment failed',
        ];
    }

    $data = $response->json();

    Log::info('✅ MOTO payment successful', [
        'transaction_id' => $data['id'] ?? null,
        'success' => $data['success'] ?? false,
    ]);

    return [
        'success' => $data['success'] ?? false,
        'transaction_id' => $data['id'] ?? null,
        'requires_3ds' => false,
        'data' => $data,
    ];
}

/**
 * Check if MOTO response requires redirection (3DS challenge).
 */
private function requiresRedirection(array $response): bool
{
    // Paymob returns redirect_url when 3DS needed
    return !empty($response['redirect_url']) ||
           !empty($response['3ds_url']) ||
           ($response['pending'] ?? false) === true;
}
```

#### STEP 3: Update Webhook to Extract Intention Token

**File: backend/app/Services/PaymobService.php**

```php
/**
 * Extract card token from Intention API webhook.
 * Handles new token object structure from Unified Checkout.
 *
 * Expected webhook structure:
 * {
 *   "obj": {
 *     "token": {
 *       "token": "tok_xxxxxxxxxxxxx",
 *       "masked_pan": "4242",
 *       "card_subtype": "CREDIT"
 *     },
 *     "source_data": {
 *       "type": "TOKEN",
 *       "pan": "4242",
 *       "sub_type": "Visa"
 *     }
 *   }
 * }
 */
public function extractCardTokenFromIntention(array $callbackData): ?array
{
    // NEW: Check for token object (Intention API)
    if (isset($callbackData['token']['token'])) {
        $tokenObj = $callbackData['token'];
        $sourceData = $callbackData['source_data'] ?? [];

        $cardData = [
            'token' => $tokenObj['token'],  // ⭐ Stable Paymob saved card token
            'last4' => $tokenObj['masked_pan'] ?? $this->extractLast4Digits($sourceData['pan'] ?? null),
            'brand' => $this->normalizeCardBrand($sourceData['sub_type'] ?? 'other'),
            'card_subtype' => $tokenObj['card_subtype'] ?? null, // CREDIT/DEBIT
        ];

        Log::info('✅ Card token extracted from Intention webhook', [
            'token_preview' => substr($cardData['token'], 0, 10) . '...',
            'last4' => $cardData['last4'],
            'brand' => $cardData['brand'],
        ]);

        return $cardData;
    }

    // LEGACY: Fallback to old extractCardTokenFromCallback() for classic flow
    return $this->extractCardTokenFromCallback($callbackData);
}
```

#### STEP 4: Decision Tree Implementation

**File: backend/app/Services/PaymentDecisionService.php** (NEW)

```php
<?php

namespace App\Services;

use App\Models\Order;
use App\Models\PaymentMethod;
use Illuminate\Support\Facades\Log;

class PaymentDecisionService
{
    /**
     * Decide which payment flow to use based on business rules.
     *
     * Decision Tree:
     * 1. No saved card? → Unified Checkout 3DS
     * 2. Has saved card + meets MOTO criteria? → Try MOTO first
     * 3. MOTO fails? → Fallback to Unified Checkout 3DS
     * 4. High value order? → Force Unified Checkout 3DS
     *
     * @param Order $order
     * @param PaymentMethod|null $savedCard
     * @return array ['flow' => 'unified_3ds|moto', 'reason' => '...']
     */
    public function decidePaymentFlow(Order $order, ?PaymentMethod $savedCard): array
    {
        // RULE 1: No saved card → Always Unified Checkout
        if (!$savedCard) {
            return [
                'flow' => 'unified_3ds',
                'reason' => 'No saved card - first time payment',
                'should_save_card' => true, // Offer to save card
            ];
        }

        // RULE 2: Saved card exists but invalid/expired
        if ($savedCard->status !== 'active' || $savedCard->isExpired()) {
            return [
                'flow' => 'unified_3ds',
                'reason' => 'Saved card invalid or expired',
                'should_save_card' => true,
            ];
        }

        // RULE 3: High value order → Force 3DS for security
        $highValueThreshold = config('payments.high_value_threshold', 2000_00); // 2000 EGP in cents
        if ($order->total_cents > $highValueThreshold) {
            return [
                'flow' => 'unified_3ds',
                'reason' => 'High value order requires 3DS authentication',
                'should_save_card' => false,
                'use_saved_card_token' => $savedCard->paymob_card_token, // Pre-fill in Unified Checkout
            ];
        }

        // RULE 4: Check user payment history (fraud prevention)
        $recentFailures = $this->countRecentPaymentFailures($order->user_id);
        if ($recentFailures >= 2) {
            return [
                'flow' => 'unified_3ds',
                'reason' => 'Recent payment failures detected - requiring 3DS',
                'should_save_card' => false,
            ];
        }

        // RULE 5: Default to MOTO for best UX (one-click)
        return [
            'flow' => 'moto',
            'reason' => 'Saved card + low risk order - attempting one-click MOTO',
            'fallback_to_3ds' => true, // Auto-fallback if MOTO fails
            'saved_card' => $savedCard,
        ];
    }

    /**
     * Count payment failures in last 30 days.
     */
    private function countRecentPaymentFailures(int $userId): int
    {
        return \App\Models\PaymobPayment::where('user_id', $userId)
            ->where('status', 'FAILED')
            ->where('created_at', '>=', now()->subDays(30))
            ->count();
    }
}
```

**File: backend/config/payments.php** (NEW)

```php
<?php

return [
    // MOTO vs 3DS Decision Rules
    'high_value_threshold' => env('PAYMENT_HIGH_VALUE_THRESHOLD', 200000), // 2000 EGP in cents
    'moto_max_attempts' => 1, // Only try MOTO once, then fallback
    'recent_failure_lookback_days' => 30,
    'recent_failure_threshold' => 2,

    // Feature Flags
    'enable_moto' => env('PAYMENT_ENABLE_MOTO', true),
    'enable_saved_cards' => env('PAYMENT_ENABLE_SAVED_CARDS', true),
    'force_3ds_for_new_users' => env('PAYMENT_FORCE_3DS_NEW_USERS', true),
];
```

---

## PART 4: STATE MACHINE & FLOW DIAGRAMS 📊

### 4.1 Payment Attempt State Machine

```
States:
  PENDING        → Initial state when payment attempt created
  PROCESSING     → MOTO request sent, awaiting response/webhook
  AWAITING_3DS   → MOTO failed, redirecting to Unified Checkout
  COMPLETED      → Webhook confirmed success
  FAILED         → Terminal failure (no retry)
  EXPIRED        → Payment key expired before completion

Transitions:
  PENDING → PROCESSING       [MOTO attempt started]
  PENDING → AWAITING_3DS     [Direct to Unified Checkout]

  PROCESSING → COMPLETED     [MOTO webhook success]
  PROCESSING → FAILED        [MOTO declined, no fallback]
  PROCESSING → AWAITING_3DS  [MOTO requires 3DS, fallback triggered]

  AWAITING_3DS → COMPLETED   [3DS webhook success]
  AWAITING_3DS → FAILED      [3DS failed/cancelled]

  PENDING/PROCESSING/AWAITING_3DS → EXPIRED [Payment key TTL exceeded (1 hour)]
```

### 4.2 Decision Tree Diagram

```
┌─────────────────────────────┐
│ User Initiates Payment      │
└──────────┬──────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Has Saved    │ NO
    │ Card Token?  ├────────────────────► Flow A: Unified Checkout 3DS
    └──────┬───────┘                      (offer to save card)
           │ YES
           ▼
    ┌──────────────┐
    │ Card Status  │ INVALID/EXPIRED
    │ = ACTIVE?    ├────────────────────► Flow A: Unified Checkout 3DS
    └──────┬───────┘                      (update saved card)
           │ ACTIVE
           ▼
    ┌──────────────┐
    │ Order Total  │ > 2000 EGP
    │ > Threshold? ├────────────────────► Flow A: Unified Checkout 3DS
    └──────┬───────┘                      (high value = force 3DS)
           │ < 2000 EGP
           ▼
    ┌──────────────┐
    │ Recent       │ >= 2 failures
    │ Failures?    ├────────────────────► Flow A: Unified Checkout 3DS
    └──────┬───────┘                      (fraud prevention)
           │ < 2 failures
           ▼
    ┌──────────────┐
    │ Flow B: MOTO │
    │ (One-Click)  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ MOTO Result? │
    └──┬─────────┬─┘
       │         │
    SUCCESS   REQUIRES_3DS
       │         │
       │         └──────────────────────► Flow A: Unified Checkout 3DS
       │                                   (auto-fallback)
       ▼
  ✅ Payment Complete
```

---

## PART 5: UPDATED DATABASE SCHEMA 🗄️

### 5.1 Migration: Add Flow Tracking

**File: backend/database/migrations/YYYY_MM_DD_add_payment_flow_tracking.php**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('paymob_payments', function (Blueprint $table) {
            // Track which flow was used
            $table->enum('flow', ['classic_iframe', 'unified_3ds', 'moto'])
                  ->default('classic_iframe')
                  ->after('payment_method');

            // Store Intention ID (for Unified Checkout)
            $table->string('paymob_intention_id', 100)->nullable()->after('paymob_order_id');

            // Track MOTO attempts
            $table->unsignedTinyInteger('moto_attempts')->default(0);
            $table->timestamp('moto_attempted_at')->nullable();

            // Track if this was a fallback scenario
            $table->boolean('is_fallback_from_moto')->default(false);

            // Indexes
            $table->index('paymob_intention_id');
            $table->index('flow');
        });

        // Remove payment_token column (JWT keys should not be persisted)
        Schema::table('paymob_payments', function (Blueprint $table) {
            $table->dropColumn('payment_token');
        });
    }

    public function down(): void
    {
        Schema::table('paymob_payments', function (Blueprint $table) {
            $table->dropColumn([
                'flow',
                'paymob_intention_id',
                'moto_attempts',
                'moto_attempted_at',
                'is_fallback_from_moto',
            ]);
            $table->text('payment_token')->nullable();
        });
    }
};
```

### 5.2 Updated PaymobPayment Model

**File: backend/app/Models/PaymobPayment.php**

```php
// Add new fillable fields
protected $fillable = [
    'order_id',
    'user_id',
    'paymob_order_id',
    'paymob_intention_id',      // NEW
    'transaction_id',
    'amount_cents',
    'currency',
    'status',
    'flow',                      // NEW
    'payment_method',
    'save_card_requested',
    'moto_attempts',             // NEW
    'moto_attempted_at',         // NEW
    'is_fallback_from_moto',     // NEW
    'callback_data',
    'failure_reason',
    'paid_at',
];

// Add casts
protected $casts = [
    'save_card_requested' => 'boolean',
    'is_fallback_from_moto' => 'boolean',
    'moto_attempts' => 'integer',
    'moto_attempted_at' => 'datetime',
    'paid_at' => 'datetime',
];

/**
 * Mark payment as MOTO attempted.
 */
public function markMotoAttempted(): void
{
    $this->increment('moto_attempts');
    $this->moto_attempted_at = now();
    $this->save();
}

/**
 * Mark as fallback to 3DS after MOTO failure.
 */
public function markAsFallbackTo3DS(string $reason): void
{
    $this->update([
        'is_fallback_from_moto' => true,
        'flow' => 'unified_3ds',
        'failure_reason' => $reason,
    ]);
}
```

---

## PART 6: FRONTEND WEBVIEW FIXES 📱

### 6.1 Remove Redirect-Based Success Detection

**Current Problem:**

```typescript
// ❌ BAD: Relying on redirect URL to determine success
onNavigationStateChange={(navState) => {
  if (navState.url.includes('success')) {
    navigation.navigate('order-success'); // WRONG!
  }
}}
```

**Production Solution:**

```typescript
// ✅ GOOD: Polling backend for webhook confirmation
const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
  null,
);
const [paymentStatus, setPaymentStatus] = useState<
  "pending" | "completed" | "failed"
>("pending");

useEffect(() => {
  // Start polling when WebView opened
  const interval = setInterval(async () => {
    const status = await checkPaymentStatus(paymentAttemptId);

    if (status === "COMPLETED") {
      clearInterval(interval);
      setPaymentStatus("completed");
      navigation.navigate("order-success");
    } else if (status === "FAILED") {
      clearInterval(interval);
      setPaymentStatus("failed");
      Alert.alert("Payment Failed", "Please try again");
    }
  }, 2000); // Poll every 2 seconds

  // Cleanup after 60 seconds max
  const timeout = setTimeout(() => {
    clearInterval(interval);
    if (paymentStatus === "pending") {
      Alert.alert("Payment Timeout", "Please check your order history");
    }
  }, 60000);

  return () => {
    clearInterval(interval);
    clearTimeout(timeout);
  };
}, [paymentAttemptId]);
```

**File: frontend/services/api/paymentApi.ts** (NEW endpoint)

```typescript
export const checkPaymentStatus = async (
  paymentAttemptId: number,
): Promise<string> => {
  const response = await httpClient.get(`/payments/status/${paymentAttemptId}`);
  return response.data.status; // 'PENDING' | 'COMPLETED' | 'FAILED'
};
```

**File: backend/routes/api.php** (NEW route)

```php
Route::get('/payments/status/{paymentId}', [PaymentController::class, 'checkStatus']);
```

**File: backend/app/Http/Controllers/Api/PaymentController.php** (NEW method)

```php
public function checkStatus(int $paymentId): JsonResponse
{
    $payment = PaymobPayment::findOrFail($paymentId);

    // Only return status to owner
    if ($payment->user_id !== auth()->id()) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    return response()->json([
        'status' => $payment->status,
        'transaction_id' => $payment->transaction_id,
        'updated_at' => $payment->updated_at,
    ]);
}
```

### 6.2 Deep Link Support (Production)

**File: frontend/app.json** (Add URL scheme)

```json
{
  "expo": {
    "scheme": "elbaraka",
    "ios": {
      "bundleIdentifier": "com.elbaraka.app"
    },
    "android": {
      "package": "com.elbaraka.app"
    }
  }
}
```

**Update redirection URL** (backend):

```php
// Development: ngrok URL
// Production: Deep link
$redirectUrl = app()->environment('production')
    ? 'elbaraka://payment-callback'
    : config('app.url') . '/payment-redirect';
```

---

## PART 7: TESTING PLAN 🧪

### 7.1 Test Matrix

| **Test Case**                 | **Flow**          | **Expected Behavior**                              | **Validation**                                |
| ----------------------------- | ----------------- | -------------------------------------------------- | --------------------------------------------- |
| **TC1: First-time card save** | Unified 3DS       | Token returned in webhook → saved to DB            | `payment_methods.paymob_card_token` populated |
| **TC2: MOTO success**         | MOTO              | Payment completes server-side, no user interaction | `paymob_payments.flow = 'moto'`               |
| **TC3: MOTO → 3DS fallback**  | MOTO then Unified | MOTO fails → auto-redirects to 3DS                 | `is_fallback_from_moto = true`                |
| **TC4: High value order**     | Unified 3DS       | Decision tree forces 3DS regardless of saved card  | `flow = 'unified_3ds'`                        |
| **TC5: Expired saved card**   | Unified 3DS       | Old card rejected, new token saved                 | Old `status = 'invalid'`, new record created  |
| **TC6: Duplicate webhook**    | Any               | Second webhook ignored (idempotency)               | Log shows "Already processed"                 |
| **TC7: Delayed webhook**      | Any               | Frontend polls for 60s max                         | Success screen shown when webhook arrives     |
| **TC8: Amount mismatch**      | Any               | Payment marked as FAILED, order status = 'failed'  | HMAC + amount validation logs                 |
| **TC9: Invalid JWT reuse**    | MOTO              | Paymob rejects expired/invalid JWT                 | Error logged, fallback triggered              |
| **TC10: Terminal state**      | Any               | After COMPLETED/FAILED, no further updates         | Idempotency prevents state changes            |

### 7.2 Manual Testing Checklist

```bash
# Test 1: First-time card save (Unified 3DS)
□ Initiate payment with "save card" checked
□ Complete 3DS in WebView
□ Verify webhook received with token object
□ Check payment_methods table for new record
□ Verify paymob_card_token is encrypted
□ Verify token_fingerprint is SHA-256 hash

# Test 2: MOTO one-click payment
□ Use saved card (from Test 1)
□ Initiate payment (amount < 2000 EGP)
□ Verify MOTO endpoint called (check logs)
□ Verify no WebView opened
□ Verify webhook confirms success
□ Check paymob_payments.flow = 'moto'

# Test 3: MOTO → 3DS fallback
□ Use saved card
□ Simulate MOTO decline (contact Paymob to force 3DS)
□ Verify WebView opens automatically
□ Complete 3DS
□ Check is_fallback_from_moto = true

# Test 4: High value order (force 3DS)
□ Create order > 2000 EGP
□ Use saved card
□ Verify WebView opens (MOTO skipped)
□ Check decision tree logs

# Test 5: Webhook duplication
□ Complete payment
□ Manually replay webhook (Postman)
□ Verify second webhook returns 200 OK but no DB changes
□ Check idempotency logs

# Test 6: Frontend polling
□ Initiate payment
□ Complete in WebView
□ Verify success screen appears within 2-4 seconds
□ Check network tab for /payments/status polling

# Test 7: Amount manipulation attempt
□ Modify webhook payload (change amount_cents)
□ Send to callback endpoint
□ Verify 400 error returned
□ Check security logs
```

---

## PART 8: RISK & ROLLOUT STRATEGY 🚦

### 8.1 Feature Flags

**File: backend/config/payments.php**

```php
'enable_saved_cards' => env('PAYMENT_ENABLE_SAVED_CARDS', false), // Start disabled
'enable_moto' => env('PAYMENT_ENABLE_MOTO', false),               // Start disabled
'enable_unified_checkout' => env('PAYMENT_ENABLE_UNIFIED', false), // Start disabled
```

**Rollout Phases:**

**Phase 1: Migration Only** (Week 1)

```env
PAYMENT_ENABLE_SAVED_CARDS=false
PAYMENT_ENABLE_MOTO=false
PAYMENT_ENABLE_UNIFIED=false
```

- Deploy database migrations
- Invalidate old JWT-based saved cards
- Monitor for migration issues
- **No user-facing changes**

**Phase 2: Unified Checkout Only** (Week 2)

```env
PAYMENT_ENABLE_SAVED_CARDS=true
PAYMENT_ENABLE_MOTO=false
PAYMENT_ENABLE_UNIFIED=true
```

- Enable Intention API for new payments
- Allow card saving with proper tokens
- Monitor token extraction success rate
- **Users see new payment screen, can save cards**

**Phase 3: MOTO Beta** (Week 3)

```env
PAYMENT_ENABLE_SAVED_CARDS=true
PAYMENT_ENABLE_MOTO=true (beta users only via user_id whitelist)
PAYMENT_ENABLE_UNIFIED=true
```

- Enable MOTO for 10% of users
- Monitor success/failure rates
- Verify fallback mechanism works
- **Selected users get one-click payments**

**Phase 4: Full Production** (Week 4)

```env
PAYMENT_ENABLE_SAVED_CARDS=true
PAYMENT_ENABLE_MOTO=true
PAYMENT_ENABLE_UNIFIED=true
```

- Enable MOTO for all users
- Monitor decision tree metrics
- Track conversion rates
- **All users get full hypermarket experience**

### 8.2 Rollback Plan

**Emergency Rollback (if critical bug found):**

```bash
# 1. Disable new features immediately
php artisan config:cache  # After changing .env to disable flags

# 2. Revert to classic iframe flow
# Set in PaymentController:
if (!config('payments.enable_unified_checkout')) {
    return $this->initiateClassicPayment($order); // Old flow
}

# 3. Monitor logs for issues
tail -f storage/logs/laravel.log | grep "ERROR"

# 4. Communicate to users (if needed)
# "We've temporarily disabled saved cards for maintenance"
```

### 8.3 Monitoring Metrics

**Dashboard Metrics to Track:**

1. **Tokenization Success Rate**

   ```sql
   SELECT
     COUNT(*) as total_payments,
     SUM(CASE WHEN save_card_requested = 1 THEN 1 ELSE 0 END) as save_requested,
     (SELECT COUNT(*) FROM payment_methods WHERE created_at >= CURDATE()) as cards_saved,
     ROUND(100.0 * (SELECT COUNT(*) FROM payment_methods WHERE created_at >= CURDATE()) /
           SUM(CASE WHEN save_card_requested = 1 THEN 1 ELSE 0 END), 2) as success_rate
   FROM paymob_payments
   WHERE created_at >= CURDATE();
   ```

2. **MOTO vs 3DS Usage**

   ```sql
   SELECT
     flow,
     COUNT(*) as count,
     SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as successful,
     ROUND(100.0 * SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
   FROM paymob_payments
   WHERE created_at >= CURDATE()
   GROUP BY flow;
   ```

3. **Fallback Rate**
   ```sql
   SELECT
     COUNT(*) as total_moto_attempts,
     SUM(CASE WHEN is_fallback_from_moto = 1 THEN 1 ELSE 0 END) as fallbacks,
     ROUND(100.0 * SUM(CASE WHEN is_fallback_from_moto = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as fallback_rate
   FROM paymob_payments
   WHERE flow = 'moto' OR is_fallback_from_moto = 1;
   ```

---

## PART 9: SUMMARY & DELIVERABLES 📋

### 9.1 What Was Confirmed

✅ **Tokenization Gap Confirmed:**

- Current webhook: `source_data.pan` / `source_data.sub_type` only
- **NO** `token` object present
- API in use: Classic `/acceptance/payment_keys` (no tokenization support)

✅ **JWT Payment Key Bug Confirmed:**

- `payment_methods.token` contains encrypted JWT payment keys
- Database evidence: `eyJpdiI6...` (Laravel Crypt) → `eyJhbGciOiJI...` (JWT)
- Should contain: `tok_xxxxxxxxxxxxxxx` (Paymob saved card token)

✅ **Production Gap Confirmed:**

- Only ONE flow implemented (classic iframe)
- Missing: Intention API (3DS with tokenization)
- Missing: MOTO API (one-click payments)
- Missing: Hybrid decision logic

### 9.2 Files to Create/Modify

**NEW FILES:**

1. `backend/database/migrations/YYYY_MM_DD_migrate_to_paymob_card_tokens.php`
2. `backend/database/migrations/YYYY_MM_DD_add_payment_flow_tracking.php`
3. `backend/app/Services/PaymentDecisionService.php`
4. `backend/config/payments.php`
5. `frontend/services/api/paymentApi.ts` (update)

**MODIFY FILES:**

1. `backend/app/Services/PaymobService.php`
   - Add `createIntention()`
   - Add `payWithSavedCardMoto()`
   - Add `extractCardTokenFromIntention()`
   - Add `requiresRedirection()`

2. `backend/app/Models/PaymentMethod.php`
   - Add `paymob_card_token` accessors (encrypt/decrypt)
   - Add `status` field support
   - Update `setTokenAttribute()` to redirect to new column

3. `backend/app/Models/PaymobPayment.php`
   - Add flow tracking fields
   - Add `markMotoAttempted()`
   - Add `markAsFallbackTo3DS()`
   - Remove `payment_token` from fillable

4. `backend/app/Http/Controllers/Api/PaymentController.php`
   - Add `checkStatus()` endpoint
   - Update `initiatePayment()` to use decision tree
   - Update `processedCallback()` to use `extractCardTokenFromIntention()`
   - Add MOTO initiation method

5. `backend/config/services.php`
   - Add `public_key` and `integration_id_3ds`

6. `backend/.env`
   - Add `PAYMOB_PUBLIC_KEY`
   - Add `PAYMOB_INTEGRATION_ID_3DS`
   - Add feature flags

7. `frontend/app.json`
   - Add `scheme` for deep links

### 9.3 Next Steps (HALT - Awaiting Approval)

**🛑 DO NOT PROCEED WITH CODING UNTIL:**

1. ✅ You confirm tokenization gap findings
2. ✅ You approve migration strategy (Option A: Clean Slate)
3. ✅ You confirm Paymob account has:
   - Intention API access enabled
   - MOTO enabled (may require business verification)
   - Public key and 3DS integration ID available
4. ✅ You approve rollout strategy (4-phase deployment)

**Once Approved, Implementation Order:**

**Step 1:** Database migrations (invalidate old cards + add new columns)  
**Step 2:** PaymobService updates (Intention + MOTO methods)  
**Step 3:** Decision tree service  
**Step 4:** Controller updates  
**Step 5:** Frontend polling updates  
**Step 6:** Testing (all 10 test cases)  
**Step 7:** Staged rollout (4 weeks)

---

## APPENDIX: Paymob API Comparison

| **Feature**          | **Classic Iframe Flow**    | **Intention + Unified Checkout** | **MOTO**                       |
| -------------------- | -------------------------- | -------------------------------- | ------------------------------ |
| **Endpoint**         | `/acceptance/payment_keys` | `/v1/intention/`                 | `/api/acceptance/payments/pay` |
| **User Interaction** | 3DS iframe                 | 3DS WebView                      | None (server-to-server)        |
| **Tokenization**     | ❌ No                      | ✅ Yes (`token` object)          | N/A (uses saved token)         |
| **PCI Compliance**   | Medium                     | High                             | High (no card data)            |
| **UX Friction**      | Medium                     | Medium                           | ⭐ Very Low                    |
| **Use Case**         | Legacy (current)           | First-time save                  | Repeat payments                |
| **3DS Support**      | ✅ Yes                     | ✅ Yes                           | ❌ No (fallback to Intention)  |
| **Implementation**   | ✅ Done                    | ⏳ To Do                         | ⏳ To Do                       |

---

**End of Document**  
**Awaiting your approval to proceed with implementation.**
