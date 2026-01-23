# 💳 Saved Cards Implementation Plan (Paymob Tokenization)

**Like Talabat - Pay Once, Reuse Everywhere**

---

## 📊 CURRENT STATE ANALYSIS

### ✅ What's Already in Place:

1. **Database Schema** (`payment_methods` table exists in `elbaraka_database.sql`):

   ```sql
   - id, user_id, type, card_last_four, card_brand
   - token (TEXT - stores Paymob token)
   - is_default (BOOLEAN)
   - expires_at (DATE)
   ```

2. **PaymentMethod Model** (`app/Models/PaymentMethod.php`):
   - ✅ Basic CRUD relationships
   - ✅ `isExpired()` method
   - ✅ `getMaskedCardAttribute()` - displays "\***\* \*\*** \*\*\*\* 1234"
   - ✅ Scopes: `default()`, `active()`
   - ✅ `token` hidden from JSON responses
   - ⚠️ **MISSING**: Token encryption, soft-delete

3. **CheckoutService** (`app/Services/CheckoutService.php`):
   - ✅ `getUserPaymentMethods()` - fetches saved cards
   - ✅ References to `$savedCard` exist in code (lines 419-426)
   - ⚠️ **INCOMPLETE**: No actual saved card payment implementation

4. **API Routes** (`routes/api.php`):
   - ✅ `GET /api/v1/checkout/payment-methods` - list cards
   - ⚠️ **MISSING**: add/delete/set-default/pay-with-saved endpoints

5. **Paymob Integration**:
   - ✅ PaymobService with auth, register, payment key generation
   - ✅ HMAC webhook verification (fixed recently)
   - ✅ Idempotent callbacks (duplicate protection)
   - ⚠️ **MISSING**: Card tokenization API calls

---

## 🚨 CRITICAL GAPS (Security & Usability):

### 🔴 Security Issues:

1. **Token stored in plaintext** - Should be encrypted at rest
2. **No soft-delete** - Hard-deleted cards lose audit trail
3. **No PCI-DSS compliance checks** - Should validate we never store PAN/CVV
4. **No rate limiting** on payment methods endpoints

### 🔴 Functional Gaps:

1. **No Paymob card tokenization flow** implemented
2. **No "Save this card" checkbox** during payment
3. **No saved card payment flow** (pay without re-entering card)
4. **No frontend payment methods screen**
5. **No default card logic** in checkout

---

## 🎯 IMPLEMENTATION ROADMAP

---

## 📦 PHASE 1: Database & Security Foundation

### Task 1.1: Create Migration for Enhanced `payment_methods` Table

**File**: `database/migrations/2026_01_23_create_payment_methods_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['card'])->default('card'); // Future: wallet, bank_account

            // Card details (NEVER store full PAN or CVV!)
            $table->string('card_last_four', 4);
            $table->enum('card_brand', ['visa', 'mastercard', 'amex', 'discover', 'other']);

            // Paymob token (ENCRYPTED - see model)
            $table->text('token'); // Stores encrypted Paymob card token

            // Display info
            $table->string('card_holder_name')->nullable();
            $table->date('expires_at')->nullable();

            // Flags
            $table->boolean('is_default')->default(false);
            $table->boolean('is_verified')->default(false); // Set to true after first successful payment

            // Metadata
            $table->string('paymob_card_token_id')->nullable(); // Paymob's card token ID
            $table->json('metadata')->nullable(); // Additional Paymob data (3DS status, etc)

            // Soft delete for audit trail
            $table->softDeletes();

            $table->timestamps();

            // Indexes
            $table->index(['user_id', 'is_default']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
```

**Migration Command**:

```bash
php artisan make:migration create_payment_methods_table
# Then copy the above schema
php artisan migrate
```

---

### Task 1.2: Update PaymentMethod Model with Encryption

**File**: `app/Models/PaymentMethod.php`

**Add:**

1. **Encrypted token attribute** using Laravel's encryption
2. **Soft-delete trait**
3. **PCI-DSS compliance validation**
4. **Enhanced scopes and methods**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Crypt;

class PaymentMethod extends Model
{
    use SoftDeletes; // ✅ Audit trail

    protected $fillable = [
        'user_id',
        'type',
        'card_last_four',
        'card_brand',
        'card_holder_name',
        'token', // Will be auto-encrypted
        'is_default',
        'is_verified',
        'expires_at',
        'paymob_card_token_id',
        'metadata',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_verified' => 'boolean',
        'expires_at' => 'date',
        'metadata' => 'array',
    ];

    protected $hidden = [
        'token', // NEVER expose in JSON
        'paymob_card_token_id',
    ];

    // ═══════════════════════════════════════════════════════
    // ENCRYPTION (PCI-DSS Compliance)
    // ═══════════════════════════════════════════════════════

    /**
     * Encrypt token before saving to database
     */
    public function setTokenAttribute($value): void
    {
        $this->attributes['token'] = Crypt::encryptString($value);
    }

    /**
     * Decrypt token when reading from database
     */
    public function getTokenAttribute($value): ?string
    {
        if (!$value) {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Exception $e) {
            \Log::error('Failed to decrypt payment token', [
                'payment_method_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════
    // RELATIONSHIPS
    // ═══════════════════════════════════════════════════════

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ═══════════════════════════════════════════════════════
    // VALIDATION & BUSINESS LOGIC
    // ═══════════════════════════════════════════════════════

    /**
     * Check if card is expired
     */
    public function isExpired(): bool
    {
        if (!$this->expires_at) {
            return false;
        }

        return $this->expires_at->isPast();
    }

    /**
     * Get masked card number for display
     */
    public function getMaskedCardAttribute(): string
    {
        return '**** **** **** ' . $this->card_last_four;
    }

    /**
     * Get formatted expiry (MM/YY)
     */
    public function getFormattedExpiryAttribute(): ?string
    {
        if (!$this->expires_at) {
            return null;
        }

        return $this->expires_at->format('m/y');
    }

    /**
     * Get card icon/logo based on brand
     */
    public function getCardIconAttribute(): string
    {
        return match($this->card_brand) {
            'visa' => '💳 Visa',
            'mastercard' => '💳 Mastercard',
            'amex' => '💳 Amex',
            default => '💳 Card',
        };
    }

    // ═══════════════════════════════════════════════════════
    // SCOPES
    // ═══════════════════════════════════════════════════════

    /**
     * Scope for default payment method
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope for non-expired, verified cards
     */
    public function scopeActive($query)
    {
        return $query
            ->where('is_verified', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            });
    }

    /**
     * Scope for verified cards only
     */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    // ═══════════════════════════════════════════════════════
    // BUSINESS METHODS
    // ═══════════════════════════════════════════════════════

    /**
     * Mark this card as verified (after first successful payment)
     */
    public function markAsVerified(): void
    {
        $this->update(['is_verified' => true]);
    }

    /**
     * Set as default card (unset others)
     */
    public function setAsDefault(): void
    {
        \DB::transaction(function () {
            // Unset all other defaults for this user
            self::where('user_id', $this->user_id)
                ->where('id', '!=', $this->id)
                ->update(['is_default' => false]);

            // Set this as default
            $this->update(['is_default' => true]);
        });
    }
}
```

---

## 📦 PHASE 2: Paymob Tokenization Integration

### Task 2.1: Update PaymobService - Add Card Tokenization

**File**: `app/Services/PaymobService.php`

**Add these methods:**

```php
/**
 * Save card token to Paymob (Card-on-File / Tokenization)
 *
 * Paymob Flow:
 * 1. User completes first payment
 * 2. Paymob returns card_token in webhook callback
 * 3. We store this token for future payments
 *
 * @param string $authToken
 * @param int $paymobOrderId
 * @param array $billingData
 * @param bool $saveCard - Whether user checked "Save this card"
 * @return array ['payment_token' => ..., 'save_card_requested' => true/false]
 */
public function generatePaymentKeyWithCardSave(
    string $authToken,
    int $amountCents,
    int $paymobOrderId,
    array $billingData,
    string $paymentMethod = 'CARD',
    bool $saveCard = false
): array {
    try {
        $integrationId = $paymentMethod === 'WALLET'
            ? $this->walletIntegrationId
            : $this->cardIntegrationId;

        $payload = [
            'auth_token' => $authToken,
            'amount_cents' => $amountCents,
            'expiration' => 3600,
            'order_id' => $paymobOrderId,
            'billing_data' => $billingData,
            'currency' => 'EGP',
            'integration_id' => $integrationId,
        ];

        // ✅ NEW: Request card tokenization
        if ($saveCard && $paymentMethod === 'CARD') {
            $payload['save_card'] = true; // Paymob flag to tokenize card
        }

        $response = Http::timeout(30)
            ->connectTimeout(10)
            ->retry(3, 100)
            ->post("{$this->baseUrl}/acceptance/payment_keys", $payload);

        if (!$response->successful()) {
            Log::error('Paymob payment key generation failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new Exception('Failed to generate payment key');
        }

        $data = $response->json();

        if (!isset($data['token'])) {
            throw new Exception('No payment token returned from Paymob');
        }

        return [
            'payment_token' => $data['token'],
            'save_card_requested' => $saveCard,
        ];

    } catch (Exception $e) {
        Log::error('Paymob payment key generation error', [
            'error' => $e->getMessage(),
            'order_id' => $paymobOrderId,
        ]);
        throw $e;
    }
}

/**
 * Pay with saved card token (Paymob Card-on-File)
 *
 * @param string $authToken
 * @param int $amountCents
 * @param int $paymobOrderId
 * @param string $cardToken - The saved Paymob card token
 * @param array $billingData
 * @return string Payment token for confirmation
 */
public function payWithSavedCard(
    string $authToken,
    int $amountCents,
    int $paymobOrderId,
    string $cardToken,
    array $billingData
): string {
    try {
        $payload = [
            'auth_token' => $authToken,
            'amount_cents' => $amountCents,
            'expiration' => 3600,
            'order_id' => $paymobOrderId,
            'billing_data' => $billingData,
            'currency' => 'EGP',
            'integration_id' => $this->cardIntegrationId,
            'card_token' => $cardToken, // ✅ Use saved card token
        ];

        $response = Http::timeout(30)
            ->connectTimeout(10)
            ->retry(3, 100)
            ->post("{$this->baseUrl}/acceptance/payment_keys", $payload);

        if (!$response->successful()) {
            Log::error('Paymob saved card payment failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new Exception('Failed to process saved card payment');
        }

        $data = $response->json();

        if (!isset($data['token'])) {
            throw new Exception('No payment token returned from Paymob');
        }

        return $data['token'];

    } catch (Exception $e) {
        Log::error('Paymob saved card payment error', [
            'error' => $e->getMessage(),
            'order_id' => $paymobOrderId,
        ]);
        throw $e;
    }
}

/**
 * Extract card token from Paymob callback
 * This is called when webhook arrives after first payment
 *
 * @param array $callbackData - The webhook obj data
 * @return array|null ['token' => ..., 'last4' => ..., 'brand' => ..., 'expiry' => ...]
 */
public function extractCardTokenFromCallback(array $callbackData): ?array
{
    // Paymob sends card token in source_data.token after successful payment
    if (!isset($callbackData['source_data']['token'])) {
        return null;
    }

    $sourceData = $callbackData['source_data'];

    return [
        'token' => $sourceData['token'],
        'last4' => $sourceData['pan'] ?? null, // Last 4 digits
        'brand' => $this->normalizeCardBrand($sourceData['sub_type'] ?? 'other'),
        'expiry_month' => $sourceData['expiry_month'] ?? null,
        'expiry_year' => $sourceData['expiry_year'] ?? null,
    ];
}

/**
 * Normalize card brand to our enum values
 */
private function normalizeCardBrand(string $paymobBrand): string
{
    return match(strtolower($paymobBrand)) {
        'visa' => 'visa',
        'mastercard', 'master card' => 'mastercard',
        'american express', 'amex' => 'amex',
        'discover' => 'discover',
        default => 'other',
    };
}
```

---

## 📦 PHASE 3: Payment Methods Management (CRUD)

### Task 3.1: Create PaymentMethodController

**File**: `app/Http/Controllers/Api/PaymentMethodController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PaymentMethodController extends Controller
{
    /**
     * List user's saved payment methods
     *
     * GET /api/v1/payment-methods
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $paymentMethods = PaymentMethod::where('user_id', auth()->id())
                ->active() // Only non-expired, verified cards
                ->orderBy('is_default', 'desc')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($method) {
                    return [
                        'id' => $method->id,
                        'type' => $method->type,
                        'card_brand' => $method->card_brand,
                        'card_icon' => $method->card_icon,
                        'card_last_four' => $method->card_last_four,
                        'masked_card' => $method->masked_card,
                        'card_holder_name' => $method->card_holder_name,
                        'expires_at' => $method->formatted_expiry, // "12/25"
                        'is_default' => $method->is_default,
                        'is_verified' => $method->is_verified,
                        'is_expired' => $method->isExpired(),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $paymentMethods,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch payment methods', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve payment methods',
            ], 500);
        }
    }

    /**
     * Delete a payment method (soft-delete for audit)
     *
     * DELETE /api/v1/payment-methods/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $paymentMethod = PaymentMethod::where('user_id', auth()->id())
                ->where('id', $id)
                ->first();

            if (!$paymentMethod) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment method not found',
                ], 404);
            }

            // If this was default, make another card default
            if ($paymentMethod->is_default) {
                $nextCard = PaymentMethod::where('user_id', auth()->id())
                    ->where('id', '!=', $id)
                    ->active()
                    ->first();

                if ($nextCard) {
                    $nextCard->setAsDefault();
                }
            }

            // Soft delete (preserves audit trail)
            $paymentMethod->delete();

            Log::info('Payment method deleted', [
                'user_id' => auth()->id(),
                'payment_method_id' => $id,
                'card_last_four' => $paymentMethod->card_last_four,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment method removed successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to delete payment method', [
                'user_id' => auth()->id(),
                'payment_method_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to remove payment method',
            ], 500);
        }
    }

    /**
     * Set a payment method as default
     *
     * POST /api/v1/payment-methods/{id}/set-default
     */
    public function setDefault(Request $request, int $id): JsonResponse
    {
        try {
            $paymentMethod = PaymentMethod::where('user_id', auth()->id())
                ->where('id', $id)
                ->active()
                ->first();

            if (!$paymentMethod) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment method not found or expired',
                ], 404);
            }

            $paymentMethod->setAsDefault();

            Log::info('Default payment method updated', [
                'user_id' => auth()->id(),
                'payment_method_id' => $id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Default payment method updated',
                'data' => [
                    'id' => $paymentMethod->id,
                    'is_default' => true,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to set default payment method', [
                'user_id' => auth()->id(),
                'payment_method_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update default payment method',
            ], 500);
        }
    }
}
```

---

### Task 3.2: Create Request Validator for Saved Card Payment

**File**: `app/Http/Requests/PayWithSavedCardRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PayWithSavedCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'order_id' => 'required|exists:orders,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'cvv' => 'sometimes|digits:3,4', // Optional CVV for extra security
        ];
    }

    public function messages(): array
    {
        return [
            'payment_method_id.required' => 'Please select a saved card',
            'payment_method_id.exists' => 'Selected card not found',
            'cvv.digits' => 'CVV must be 3 or 4 digits',
        ];
    }
}
```

---

## 📦 PHASE 4: Checkout Flow with Saved Cards

### Task 4.1: Update CheckoutService - Add Saved Card Payment

**File**: `app/Services/CheckoutService.php`

**Add this method:**

```php
/**
 * Pay with saved card (Paymob tokenization)
 *
 * @param Order $order
 * @param int $paymentMethodId
 * @param array $billingData
 * @return array
 */
public function payWithSavedCard(Order $order, int $paymentMethodId, array $billingData): array
{
    // 1. Validate saved card belongs to user and is active
    $savedCard = PaymentMethod::where('id', $paymentMethodId)
        ->where('user_id', $order->user_id)
        ->active()
        ->first();

    if (!$savedCard) {
        throw new \Exception('Saved card not found or expired');
    }

    if ($savedCard->isExpired()) {
        throw new \Exception('Card has expired. Please add a new card.');
    }

    // 2. Prepare payment
    $amountCents = (int)($order->total * 100);
    $internalOrderId = 'ORD-' . $order->id . '-' . time();

    try {
        // 3. Authenticate with Paymob
        $authToken = $this->paymobService->authenticate();

        // 4. Register order with Paymob
        $paymobOrderId = $this->paymobService->registerOrder(
            $authToken,
            $amountCents,
            $internalOrderId
        );

        // 5. Generate payment key WITH saved card token
        $paymentToken = $this->paymobService->payWithSavedCard(
            $authToken,
            $amountCents,
            $paymobOrderId,
            $savedCard->token, // ✅ Use decrypted token
            $billingData
        );

        // 6. Get integration ID
        $integrationId = $this->paymobService->getIntegrationId('CARD');

        // 7. Store payment record
        PaymobPayment::create([
            'order_id' => $order->id,
            'internal_order_id' => $internalOrderId,
            'paymob_order_id' => $paymobOrderId,
            'amount_cents' => $amountCents,
            'currency' => 'EGP',
            'payment_method' => 'CARD',
            'integration_id' => $integrationId,
            'status' => 'PENDING',
            'billing_data' => $billingData,
            'payment_token' => $paymentToken,
        ]);

        // 8. Update order
        $order->update([
            'payment_method' => 'card',
            'payment_status' => 'pending',
        ]);

        // 9. Get iframe URL (for 3DS authentication if required)
        $iframeUrl = $this->paymobService->getIframeUrl($paymentToken);

        Log::info('✅ Saved card payment initiated', [
            'order_id' => $order->id,
            'payment_method_id' => $savedCard->id,
            'card_last_four' => $savedCard->card_last_four,
            'amount' => $order->total,
        ]);

        return [
            'success' => true,
            'payment_method' => 'saved_card',
            'status' => 'pending',
            'iframe_url' => $iframeUrl,
            'payment_token' => $paymentToken,
            'amount' => $order->total,
            'currency' => 'EGP',
            'saved_card' => [
                'masked_card' => $savedCard->masked_card,
                'brand' => $savedCard->card_brand,
            ],
        ];

    } catch (\Exception $e) {
        Log::error('Saved card payment failed', [
            'order_id' => $order->id,
            'payment_method_id' => $paymentMethodId,
            'error' => $e->getMessage(),
        ]);

        throw $e;
    }
}
```

---

### Task 4.2: Update PaymentController - Add Webhook Card Tokenization

**File**: `app/Http/Controllers/Api/PaymentController.php`

**Update `processedCallback` method to save card token:**

```php
// Inside the SUCCESS PATH, after marking payment as PAID:

if ($success) {
    // ... existing code ...

    // ✅ NEW: Save card token if user requested it
    if ($this->shouldSaveCardToken($payment, $payload)) {
        $this->saveCardToken($order->user_id, $payload);
    }

    // ... rest of success code ...
}

// Add these helper methods at the end of the controller:

/**
 * Check if we should save card token
 */
private function shouldSaveCardToken(\App\Models\PaymobPayment $payment, array $payload): bool
{
    // Don't save if:
    // 1. Payment failed
    // 2. Not a card payment
    // 3. Card token already exists
    // 4. User didn't request save (check metadata or session)

    if ($payment->payment_method !== 'CARD') {
        return false;
    }

    // Check if payment record has "save_card" flag (you'll add this in initiate payment)
    $metadata = $payment->metadata ?? [];
    if (!($metadata['save_card'] ?? false)) {
        return false;
    }

    // Check if token exists in payload
    if (!isset($payload['source_data']['token'])) {
        return false;
    }

    return true;
}

/**
 * Save card token from Paymob callback
 */
private function saveCardToken(int $userId, array $payload): void
{
    try {
        $cardData = app(\App\Services\PaymobService::class)->extractCardTokenFromCallback($payload);

        if (!$cardData) {
            Log::warning('No card token in callback', ['user_id' => $userId]);
            return;
        }

        // Check if card already saved (by last 4 digits)
        $exists = \App\Models\PaymentMethod::where('user_id', $userId)
            ->where('card_last_four', $cardData['last4'])
            ->exists();

        if ($exists) {
            Log::info('Card already saved', [
                'user_id' => $userId,
                'last4' => $cardData['last4'],
            ]);
            return;
        }

        // Determine if this should be default (first card)
        $isFirstCard = \App\Models\PaymentMethod::where('user_id', $userId)->count() === 0;

        // Build expiry date
        $expiresAt = null;
        if ($cardData['expiry_month'] && $cardData['expiry_year']) {
            $expiresAt = \Carbon\Carbon::createFromFormat(
                'Y-m',
                $cardData['expiry_year'] . '-' . $cardData['expiry_month']
            )->endOfMonth();
        }

        // Save card
        $paymentMethod = \App\Models\PaymentMethod::create([
            'user_id' => $userId,
            'type' => 'card',
            'card_last_four' => substr($cardData['last4'], -4),
            'card_brand' => $cardData['brand'],
            'token' => $cardData['token'], // Auto-encrypted by model
            'is_default' => $isFirstCard,
            'is_verified' => true, // Mark as verified since payment succeeded
            'expires_at' => $expiresAt,
            'paymob_card_token_id' => $payload['id'] ?? null,
        ]);

        Log::info('✅ Card saved successfully', [
            'user_id' => $userId,
            'payment_method_id' => $paymentMethod->id,
            'card_last_four' => $paymentMethod->card_last_four,
            'brand' => $paymentMethod->card_brand,
        ]);

    } catch (\Exception $e) {
        Log::error('Failed to save card token', [
            'user_id' => $userId,
            'error' => $e->getMessage(),
        ]);
        // Don't throw - this shouldn't fail the payment
    }
}
```

---

## 📦 PHASE 5: API Routes

### Task 5.1: Add Payment Methods Routes

**File**: `routes/api.php`

```php
// Add inside the protected auth:sanctum middleware group:

// Payment Methods Management (Saved Cards)
Route::prefix('payment-methods')->group(function () {
    Route::get('/', [PaymentMethodController::class, 'index']);
    Route::delete('/{id}', [PaymentMethodController::class, 'destroy']);
    Route::post('/{id}/set-default', [PaymentMethodController::class, 'setDefault']);
});

// Update checkout routes:
Route::prefix('checkout')->group(function () {
    // ... existing routes ...

    // ✅ NEW: Pay with saved card
    Route::post('/pay-with-saved-card', [CheckoutController::class, 'payWithSavedCard']);
});
```

---

## 📦 PHASE 6: Update Frontend Payment Flow

### Task 6.1: Payment Methods Screen

**File**: `frontend/app/(tabs)/profile.tsx` (or new dedicated screen)

**Add navigation to Payment Methods:**

```tsx
<TouchableOpacity onPress={() => router.push("/profile/payment-methods")}>
  <Text>💳 Saved Cards</Text>
</TouchableOpacity>
```

**File**: `frontend/app/profile/payment-methods.tsx` (CREATE NEW)

```tsx
import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import axios from "axios";

interface SavedCard {
  id: number;
  card_brand: string;
  card_icon: string;
  masked_card: string;
  card_holder_name: string;
  expires_at: string;
  is_default: boolean;
  is_expired: boolean;
}

export default function PaymentMethodsScreen() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await axios.get("/api/v1/payment-methods");
      setCards(response.data.data);
    } catch (error) {
      Alert.alert("Error", "Failed to load saved cards");
    } finally {
      setLoading(false);
    }
  };

  const deleteCard = async (id: number) => {
    Alert.alert("Remove Card", "Are you sure you want to remove this card?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`/api/v1/payment-methods/${id}`);
            fetchCards(); // Refresh
            Alert.alert("Success", "Card removed");
          } catch (error) {
            Alert.alert("Error", "Failed to remove card");
          }
        },
      },
    ]);
  };

  const setDefault = async (id: number) => {
    try {
      await axios.post(`/api/v1/payment-methods/${id}/set-default`);
      fetchCards(); // Refresh
      Alert.alert("Success", "Default card updated");
    } catch (error) {
      Alert.alert("Error", "Failed to update default card");
    }
  };

  const renderCard = ({ item }: { item: SavedCard }) => (
    <View
      style={{ padding: 16, borderWidth: 1, borderRadius: 8, marginBottom: 12 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text>
          {item.card_icon} {item.masked_card}
        </Text>
        {item.is_default && <Text>✅ Default</Text>}
      </View>

      <Text>Expires: {item.expires_at}</Text>
      {item.card_holder_name && <Text>{item.card_holder_name}</Text>}

      <View style={{ flexDirection: "row", marginTop: 12 }}>
        {!item.is_default && (
          <TouchableOpacity onPress={() => setDefault(item.id)}>
            <Text style={{ color: "blue" }}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => deleteCard(item.id)}>
          <Text style={{ color: "red", marginLeft: 16 }}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        Saved Cards
      </Text>

      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text>No saved cards</Text>}
      />

      <TouchableOpacity
        onPress={() => router.push("/checkout/payment")}
        style={{
          padding: 16,
          backgroundColor: "#007AFF",
          borderRadius: 8,
          marginTop: 16,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          + Add New Card
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

### Task 6.2: Update Checkout Payment Screen

**File**: `frontend/app/checkout/payment.tsx`

**Add:**

1. **List of saved cards** with radio buttons
2. **"Save this card" checkbox** for new card payment
3. **Pay with selected saved card** button

```tsx
// Add state
const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
const [saveNewCard, setSaveNewCard] = useState(false);

// Fetch saved cards on mount
useEffect(() => {
  fetchSavedCards();
}, []);

const fetchSavedCards = async () => {
  try {
    const response = await axios.get("/api/v1/payment-methods");
    setSavedCards(response.data.data);

    // Auto-select default card
    const defaultCard = response.data.data.find((c: SavedCard) => c.is_default);
    if (defaultCard) {
      setSelectedCardId(defaultCard.id);
    }
  } catch (error) {
    console.error("Failed to load saved cards", error);
  }
};

// Update payment submission
const handlePayment = async () => {
  if (selectedCardId) {
    // Pay with saved card
    await payWithSavedCard(selectedCardId);
  } else {
    // Pay with new card (existing flow)
    await payWithNewCard();
  }
};

const payWithSavedCard = async (cardId: number) => {
  try {
    const response = await axios.post("/api/v1/checkout/pay-with-saved-card", {
      order_id: orderId,
      payment_method_id: cardId,
    });

    // Open iframe if 3DS required
    if (response.data.iframe_url) {
      openPaymentIframe(response.data.iframe_url);
    } else {
      // Direct success
      router.push("/order-success");
    }
  } catch (error) {
    Alert.alert("Error", "Payment failed. Please try again.");
  }
};

// Render saved cards
<View>
  <Text>Saved Cards</Text>
  {savedCards.map((card) => (
    <TouchableOpacity
      key={card.id}
      onPress={() => setSelectedCardId(card.id)}
      style={{ padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            marginRight: 12,
          }}
        >
          {selectedCardId === card.id && (
            <View
              style={{
                flex: 1,
                backgroundColor: "blue",
                borderRadius: 8,
                margin: 2,
              }}
            />
          )}
        </View>
        <Text>
          {card.card_icon} {card.masked_card}
        </Text>
        {card.is_default && <Text> (Default)</Text>}
      </View>
    </TouchableOpacity>
  ))}

  {/* "Or pay with new card" divider */}
  <Text style={{ marginVertical: 16 }}>Or pay with new card</Text>

  {/* Existing new card form */}

  {/* Checkbox to save new card */}
  <TouchableOpacity
    onPress={() => setSaveNewCard(!saveNewCard)}
    style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}
  >
    <View style={{ width: 20, height: 20, borderWidth: 1, marginRight: 8 }}>
      {saveNewCard && <Text>✓</Text>}
    </View>
    <Text>Save this card for future purchases</Text>
  </TouchableOpacity>
</View>;
```

---

## 📦 PHASE 7: Testing & Documentation

### Task 7.1: Database Seeder for Test Cards

**File**: `database/seeders/PaymentMethodSeeder.php`

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentMethod;
use App\Models\User;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        // Get test user
        $user = User::where('email', 'test@example.com')->first();

        if (!$user) {
            $this->command->warn('Test user not found. Run UsersSeeder first.');
            return;
        }

        // Seed 3 test cards
        PaymentMethod::create([
            'user_id' => $user->id,
            'type' => 'card',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'card_holder_name' => 'Test User',
            'token' => 'test_token_visa_4242_' . time(), // Will be encrypted
            'is_default' => true,
            'is_verified' => true,
            'expires_at' => now()->addYears(2)->endOfMonth(),
        ]);

        PaymentMethod::create([
            'user_id' => $user->id,
            'type' => 'card',
            'card_last_four' => '5555',
            'card_brand' => 'mastercard',
            'card_holder_name' => 'Test User',
            'token' => 'test_token_mc_5555_' . time(),
            'is_default' => false,
            'is_verified' => true,
            'expires_at' => now()->addYears(1)->endOfMonth(),
        ]);

        PaymentMethod::create([
            'user_id' => $user->id,
            'type' => 'card',
            'card_last_four' => '3782',
            'card_brand' => 'amex',
            'card_holder_name' => 'Test User',
            'token' => 'test_token_amex_3782_' . time(),
            'is_default' => false,
            'is_verified' => true,
            'expires_at' => now()->addMonths(6)->endOfMonth(),
        ]);

        $this->command->info('✅ Seeded 3 test payment methods for test@example.com');
    }
}
```

**Run:**

```bash
php artisan db:seed --class=PaymentMethodSeeder
```

---

### Task 7.2: Comprehensive Testing Guide

**File**: `SAVED_CARDS_TESTING_GUIDE.md`

````markdown
# 💳 Saved Cards Testing Guide

## Pre-Requisites

1. ✅ Migration run: `php artisan migrate`
2. ✅ Seeder run: `php artisan db:seed --class=PaymentMethodSeeder`
3. ✅ Test user: `test@example.com` / `password`
4. ✅ Paymob sandbox enabled

---

## Test Scenario 1: First Payment with "Save Card" ✅

**Steps:**

1. Login as `test@example.com`
2. Add 3 items to cart (total ~150 EGP)
3. Go to checkout → Payment
4. ✅ Check "Save this card for future purchases"
5. Enter test card: `4987654321098769` (Paymob test card)
6. Complete payment
7. Payment succeeds → Card saved automatically

**Expected Result:**

- ✅ Payment completes successfully
- ✅ Order confirmed
- ✅ Cart cleared
- ✅ New card appears in "Saved Cards" screen
- ✅ Card marked as verified (`is_verified = true`)

**Verify in Database:**

```sql
SELECT id, user_id, card_last_four, card_brand, is_default, is_verified, expires_at
FROM payment_methods
WHERE user_id = 2;
```
````

---

## Test Scenario 2: Pay with Saved Card (Happy Path) ✅

**Steps:**

1. Login as `test@example.com`
2. Add items to cart
3. Checkout → Payment screen
4. **Select saved card** (radio button)
5. Click "Pay Now"
6. Complete payment (may require 3DS)

**Expected Result:**

- ✅ Payment iframe opens (if 3DS required)
- ✅ Payment succeeds
- ✅ Order confirmed
- ✅ Cart cleared
- ✅ No card details re-entered

**Logs to Check:**

```bash
cd backend
tail -f storage/logs/laravel.log | grep "Saved card payment"
```

---

## Test Scenario 3: Default Card Auto-Selection ✅

**Steps:**

1. Go to "Saved Cards" screen
2. Set a card as default
3. Create new order → Checkout
4. Payment screen should auto-select default card

**Expected:**

- ✅ Default card is pre-selected (radio button checked)
- ✅ User can change to another card or new card
- ✅ Faster checkout experience

---

## Test Scenario 4: Delete Saved Card ✅

**Steps:**

1. Go to "Saved Cards" screen
2. Click "Remove" on a non-default card
3. Confirm deletion

**Expected:**

- ✅ Card disappears from list
- ✅ Soft-deleted in database (`deleted_at` set)
- ✅ Cannot be used for payment

**Verify:**

```sql
SELECT id, card_last_four, deleted_at FROM payment_methods WHERE user_id = 2;
```

---

## Test Scenario 5: Expired Card Handling 🔴

**Steps:**

1. Manually expire a card:

```sql
UPDATE payment_methods
SET expires_at = '2023-12-31'
WHERE id = 1;
```

2. Try to pay with expired card
3. Should show error: "Card has expired"

**Expected:**

- ❌ Payment blocked
- ✅ Error message shown
- ✅ User prompted to add new card

---

## Test Scenario 6: Token Encryption Verification 🔒

**Verify token is encrypted in database:**

```sql
SELECT id, token FROM payment_methods LIMIT 1;
```

**Expected:**

- ✅ `token` field shows encrypted gibberish (not plaintext)
- ✅ Decryption happens automatically in model

**Test Decryption:**

```bash
cd backend
php artisan tinker
```

```php
$pm = App\Models\PaymentMethod::find(1);
echo $pm->token; // Should be decrypted automatically
```

---

## Test Scenario 7: Security - PCI-DSS Compliance ✅

**Verify we NEVER store:**

1. ❌ Full card number (PAN)
2. ❌ CVV/CVC
3. ❌ Unencrypted tokens

**Check:**

```sql
DESCRIBE payment_methods;
```

**Expected:**

- ✅ Only `card_last_four` (4 digits)
- ✅ Only `token` (encrypted)
- ✅ No `card_number` or `cvv` columns

---

## Monitoring Commands

```bash
# Watch Laravel logs
cd backend
tail -f storage/logs/laravel.log

# Check recent payments
php check_order.php 87

# List all saved cards
mysql -u root -p elbaraka -e "
  SELECT u.email, pm.card_brand, pm.card_last_four, pm.is_default, pm.is_verified
  FROM payment_methods pm
  JOIN users u ON pm.user_id = u.id
  WHERE pm.deleted_at IS NULL;
"
```

---

## Common Issues & Solutions

### Issue 1: Card not saving after payment

**Solution:** Check webhook logs for card token in `source_data.token`

### Issue 2: Token decryption error

**Solution:** Verify `APP_KEY` in `.env` hasn't changed

### Issue 3: Default card not auto-selected

**Solution:** Check `is_default` flag in database

---

## API Endpoints Reference

```
GET    /api/v1/payment-methods                    - List saved cards
DELETE /api/v1/payment-methods/{id}               - Remove card
POST   /api/v1/payment-methods/{id}/set-default   - Set as default
POST   /api/v1/checkout/pay-with-saved-card       - Pay with saved card
```

---

## Success Criteria ✅

- [ ] User can save card during first payment
- [ ] Saved card appears in "Saved Cards" screen
- [ ] User can pay with saved card without re-entering details
- [ ] Default card auto-selected at checkout
- [ ] Expired cards blocked from payment
- [ ] Soft-delete preserves audit trail
- [ ] Token encrypted at rest
- [ ] No PAN/CVV stored in database
- [ ] Works like Talabat/Uber payment flow

````

---

## 🎯 IMPLEMENTATION CHECKLIST

### Backend (Laravel):
- [ ] **Task 2.1**: Create `payment_methods` migration with encryption & soft-delete
- [ ] **Task 2.2**: Update `PaymentMethod` model (encryption, soft-delete, validation)
- [ ] **Task 3.1**: Create `PaymentMethodController` (list/delete/set-default)
- [ ] **Task 3.2**: Create `PayWithSavedCardRequest` validator
- [ ] **Task 4.1**: Update `PaymobService` (add tokenization methods)
- [ ] **Task 4.2**: Update `CheckoutService` (add `payWithSavedCard` method)
- [ ] **Task 4.3**: Update `PaymentController` webhook (save card token on success)
- [ ] **Task 5.1**: Add API routes for payment methods
- [ ] **Task 7.1**: Create payment methods seeder
- [ ] **Task 7.2**: Run migration and seeder

### Frontend (React Native):
- [ ] **Task 6.1**: Create `payment-methods.tsx` screen (list/delete/set-default)
- [ ] **Task 6.2**: Update checkout payment screen (show saved cards)
- [ ] **Task 6.3**: Add "Save this card" checkbox
- [ ] **Task 6.4**: Implement pay-with-saved-card API call
- [ ] **Task 6.5**: Add navigation to payment methods from profile

### Testing:
- [ ] **Test 1**: First payment with "Save card" checkbox
- [ ] **Test 2**: Pay with saved card (happy path)
- [ ] **Test 3**: Default card auto-selection
- [ ] **Test 4**: Delete saved card
- [ ] **Test 5**: Expired card handling
- [ ] **Test 6**: Token encryption verification
- [ ] **Test 7**: PCI-DSS compliance (no PAN/CVV stored)

### Documentation:
- [ ] Create `SAVED_CARDS_TESTING_GUIDE.md`
- [ ] Update API documentation with new endpoints
- [ ] Add security notes about encryption

---

## 🔐 SECURITY REQUIREMENTS

1. **✅ PCI-DSS Compliance**:
   - NEVER store full card number (PAN)
   - NEVER store CVV/CVC
   - ONLY store Paymob tokenized reference
   - Encrypt tokens at rest

2. **✅ Data Protection**:
   - Encrypt `payment_methods.token` column
   - Soft-delete for audit trail
   - Hide token from JSON responses

3. **✅ Access Control**:
   - Rate limit payment methods endpoints (60 requests/minute)
   - Validate user owns payment method before use
   - Require authentication for all payment methods operations

4. **✅ Audit Trail**:
   - Log all card saves/deletes
   - Track which card used for each payment
   - Preserve deleted cards with `deleted_at`

---

## 📊 EXPECTED USER FLOW (Like Talabat)

### First Time User:
1. **Checkout** → Select "Pay with Card"
2. Enter card details
3. ✅ Check "Save this card for future purchases"
4. Complete payment → Card saved automatically
5. Next time: See saved card in payment methods

### Returning User (Talabat-like):
1. **Checkout** → See saved cards listed
2. Select saved card (already default-selected)
3. Click "Pay Now" → NO card details entry
4. Complete payment in 1 tap (3DS if required)

### Managing Cards:
1. **Profile** → "Saved Cards"
2. View all cards (with last 4 digits, expiry, brand)
3. Set default card
4. Delete old/expired cards

---

## ⚡ PERFORMANCE OPTIMIZATIONS

1. **Cache default card** per user (reduce DB queries)
2. **Lazy-load** card list on payment screen
3. **Prefetch** saved cards when user logs in
4. **Index** on `user_id`, `is_default`, `deleted_at`

---

## 🚀 DEPLOYMENT NOTES

1. **Before Migration**:
   ```bash
   php artisan backup:database  # Backup first!
````

2. **Run Migration**:

   ```bash
   php artisan migrate
   php artisan db:seed --class=PaymentMethodSeeder
   ```

3. **Verify Encryption**:

   ```bash
   php artisan tinker
   >>> $pm = App\Models\PaymentMethod::first();
   >>> $pm->token; // Should decrypt automatically
   ```

4. **Test in Sandbox**:
   - Use Paymob test cards
   - Verify webhook receives `source_data.token`
   - Check token encryption in database

5. **Production Checklist**:
   - [ ] SSL enabled (HTTPS)
   - [ ] APP_KEY rotated after testing
   - [ ] Paymob production credentials updated
   - [ ] Rate limiting configured
   - [ ] Monitoring/alerts for failed tokenization

---

## 📞 SUPPORT & REFERENCES

- **Paymob Card Tokenization Docs**: https://docs.paymob.com/docs/card-tokenization
- **Laravel Encryption**: https://laravel.com/docs/11.x/encryption
- **PCI-DSS Compliance**: https://www.pcisecuritystandards.org/

---

**END OF IMPLEMENTATION PLAN**

---

## 🎯 QUICK START (TL;DR)

1. Run migration: `php artisan migrate`
2. Update `PaymentMethod` model (encryption)
3. Add `PaymentMethodController` (CRUD)
4. Update `PaymobService` (tokenization)
5. Update `CheckoutService` (saved card payment)
6. Update webhook (save token on success)
7. Add API routes
8. Create frontend screens
9. Test with Paymob sandbox
10. Deploy! 🚀

**Estimated Time**: 8-12 hours for backend + frontend + testing
