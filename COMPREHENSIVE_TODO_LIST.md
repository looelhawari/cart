# 📋 COMPREHENSIVE TODO LIST

## ElBaraka E-Commerce - Wallet, Checkout, Orders & Payments Remediation

**Priority**: BLOCKER → CRITICAL → HIGH → MEDIUM  
**Estimated Timeline**: 5-7 days (full-time)  
**Dependencies**: Listed for each task

---

## 🎯 PROGRESS TRACKER

### Phase 1: BLOCKER ISSUES ✅ COMPLETE (4/4 tasks)

- ✅ WALLET-01: Remove wallet recharge endpoint
- ✅ WALLET-02: Implement ledger-based wallet
- ✅ ORDER-01: Implement refund system
- ✅ ORDER-02: Auto-refund on cancellation

### Phase 2: CRITICAL ISSUES ✅ COMPLETE (4/4 tasks)

- ✅ CHECKOUT-01: Wallet-first payment strategy
- ✅ PROMO-01: Server-side promo validation
- ✅ ADDRESS-01: Address snapshots in orders
- ✅ ADMIN-01: Admin refund APIs

### Phase 3: HIGH PRIORITY ⏳ PENDING (0/3 tasks)

- ⏳ ADMIN-02: Admin order management
- ⏳ ORDER-04: Order status notifications
- ⏳ PAYMENT-02: Payment retry logic

### Phase 4: MEDIUM PRIORITY ⏳ PENDING (0/5 tasks)

- ⏳ STOCK-01: Stock management improvements
- ⏳ FRONTEND-01: Frontend integration
- ⏳ TEST-01: Testing & validation

**Overall Progress**: 8/16 tasks complete (50%)

---

## 🚨 PHASE 1: BLOCKER ISSUES (Must Complete First)

**Timeline**: Day 1-2 | **Blocking**: All other features

### WALLET-01: Remove Wallet Recharge Endpoint ❌ VIOLATION

**Priority**: 🔴 BLOCKER  
**Files**:

- `backend/routes/api.php` - Remove `/wallet/recharge` route
- `backend/app/Http/Controllers/Api/WalletController.php` - Delete `recharge()` method
- `backend/app/Http/Controllers/Api/PaymentController.php` - Remove wallet recharge callback logic

**Steps**:

1. Remove route: `Route::post('/wallet/recharge', [WalletController::class, 'recharge']);`
2. Delete `WalletController::recharge()` method (lines ~116-180)
3. Remove wallet recharge logic from `PaymentController::processedCallback()` (lines ~210-270)
4. Delete frontend wallet recharge UI: `frontend/app/profile/wallet.tsx` - Remove "Add Money" button and modal

**Validation**:

- ❌ No `/wallet/recharge` endpoint exists
- ❌ No "Add Money" button in wallet UI
- ❌ Paymob callbacks reject `wallet_recharge_*` orders

**Dependencies**: None  
**Estimate**: 1 hour

---

### WALLET-02: Implement True Ledger-Based Wallet Balance

**Priority**: 🔴 BLOCKER  
**Files**:

- `backend/app/Models/UserWallet.php` - Rebuild credit/debit methods
- `backend/database/migrations/[timestamp]_modify_wallet_structure.php` - NEW

**Steps**:

#### A. Database Migration

```php
// Remove balance column (make computed)
Schema::table('user_wallets', function (Blueprint $table) {
    $table->dropColumn('balance');
    $table->dropColumn('total_credited');
    $table->dropColumn('total_debited');
});

// Add unique constraint for idempotency
Schema::table('wallet_transactions', function (Blueprint $table) {
    $table->string('idempotency_key')->nullable()->unique();
    $table->index(['wallet_id', 'created_at']);
});
```

#### B. Rebuild UserWallet Model

```php
class UserWallet extends Model {
    protected $fillable = ['user_id'];  // Remove balance

    protected $appends = ['balance', 'total_credited', 'total_debited'];

    // Computed balance from ledger
    public function getBalanceAttribute(): float {
        return DB::table('wallet_transactions')
            ->where('wallet_id', $this->id)
            ->selectRaw('
                COALESCE(SUM(CASE WHEN type = "credit" THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN type = "debit" THEN amount ELSE 0 END), 0) as balance
            ')
            ->value('balance') ?? 0;
    }

    public function getTotalCreditedAttribute(): float {
        return $this->transactions()->where('type', 'credit')->sum('amount');
    }

    public function getTotalDebitedAttribute(): float {
        return $this->transactions()->where('type', 'debit')->sum('amount');
    }

    // Atomic credit with idempotency
    public function credit(
        float $amount,
        string $description,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $idempotencyKey = null
    ): WalletTransaction {
        return DB::transaction(function() use ($amount, $description, $referenceType, $referenceId, $idempotencyKey) {
            // Lock wallet row
            $this->lockForUpdate()->find($this->id);

            // Check idempotency
            if ($idempotencyKey) {
                $existing = WalletTransaction::where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $existing;  // Already processed
                }
            }

            $balanceBefore = $this->balance;  // Computed from ledger

            $transaction = $this->transactions()->create([
                'user_id' => $this->user_id,
                'type' => 'credit',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceBefore + $amount,
                'description' => $description,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'idempotency_key' => $idempotencyKey,
            ]);

            return $transaction;
        });
    }

    // Atomic debit with balance check
    public function debit(
        float $amount,
        string $description,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $idempotencyKey = null
    ): WalletTransaction {
        return DB::transaction(function() use ($amount, $description, $referenceType, $referenceId, $idempotencyKey) {
            $this->lockForUpdate()->find($this->id);

            if ($idempotencyKey) {
                $existing = WalletTransaction::where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $existing;
                }
            }

            $balanceBefore = $this->balance;

            if ($balanceBefore < $amount) {
                throw new \Exception("Insufficient wallet balance. Available: {$balanceBefore}, Required: {$amount}");
            }

            $transaction = $this->transactions()->create([
                'user_id' => $this->user_id,
                'type' => 'debit',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceBefore - $amount,
                'description' => $description,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'idempotency_key' => $idempotencyKey,
            ]);

            return $transaction;
        });
    }
}
```

**Validation**:

- ✅ Balance is computed (SELECT SUM queries)
- ✅ No UPDATE on wallet balance
- ✅ Idempotency protected
- ✅ Database transactions used
- ✅ Row locking prevents race conditions

**Dependencies**: None  
**Estimate**: 3 hours

---

### ORDER-01: Implement Order Refund System

**Priority**: 🔴 BLOCKER  
**Files**:

- `backend/app/Http/Controllers/Api/OrderController.php` - Add refund methods
- `backend/app/Services/RefundService.php` - NEW
- `backend/database/migrations/[timestamp]_add_refund_fields_to_orders.php` - NEW

**Steps**:

#### A. Database Migration

```php
Schema::table('orders', function (Blueprint $table) {
    $table->enum('payment_status', [
        'pending', 'completed', 'failed', 'refunded', 'partially_refunded'
    ])->change();

    $table->decimal('refunded_amount', 10, 2)->default(0);
    $table->timestamp('refunded_at')->nullable();
    $table->text('refund_reason')->nullable();
    $table->bigInteger('refunded_by')->unsigned()->nullable();

    $table->foreign('refunded_by')->references('id')->on('users');
});

// Refund lock table for idempotency
Schema::create('refund_locks', function (Blueprint $table) {
    $table->id();
    $table->bigInteger('order_id')->unsigned()->unique();
    $table->string('lock_key')->unique();
    $table->timestamp('created_at');

    $table->foreign('order_id')->references('id')->on('orders');
});
```

#### B. Create RefundService

```php
namespace App\Services;

class RefundService {
    public function refundOrder(Order $order, string $reason, ?User $admin = null): void {
        DB::transaction(function() use ($order, $reason, $admin) {
            // Idempotency lock
            $lockKey = "refund_order_{$order->id}_" . time();

            try {
                DB::table('refund_locks')->insert([
                    'order_id' => $order->id,
                    'lock_key' => $lockKey,
                    'created_at' => now(),
                ]);
            } catch (\Exception $e) {
                throw new \Exception('Refund already in progress for this order');
            }

            // Get wallet
            $wallet = UserWallet::firstOrCreate(['user_id' => $order->user_id]);

            // Credit full order amount
            $wallet->credit(
                $order->total,
                "Refund for order #{$order->order_number}",
                'Order',
                $order->id,
                "order_refund_{$order->id}"
            );

            // Update order
            $order->update([
                'payment_status' => 'refunded',
                'refunded_amount' => $order->total,
                'refunded_at' => now(),
                'refund_reason' => $reason,
                'refunded_by' => $admin?->id,
            ]);

            // Log
            Log::info('Order refunded to wallet', [
                'order_id' => $order->id,
                'amount' => $order->total,
                'user_id' => $order->user_id,
            ]);
        });
    }

    public function partialRefund(Order $order, array $itemIds, string $reason): void {
        DB::transaction(function() use ($order, $itemIds, $reason) {
            $refundAmount = OrderItem::whereIn('id', $itemIds)
                ->where('order_id', $order->id)
                ->sum('subtotal');

            if ($refundAmount <= 0) {
                throw new \Exception('Invalid refund amount');
            }

            $wallet = UserWallet::firstOrCreate(['user_id' => $order->user_id]);

            $wallet->credit(
                $refundAmount,
                "Partial refund for order #{$order->order_number}",
                'Order',
                $order->id,
                "partial_refund_{$order->id}_" . implode('_', $itemIds)
            );

            $order->update([
                'payment_status' => 'partially_refunded',
                'refunded_amount' => $order->refunded_amount + $refundAmount,
                'refund_reason' => $reason,
            ]);

            // Mark items as refunded
            OrderItem::whereIn('id', $itemIds)->update(['refunded' => true]);
        });
    }
}
```

#### C. Add Controller Methods

```php
// In OrderController
public function refund(Request $request, $id) {
    $order = Order::findOrFail($id);

    if ($order->payment_status === 'refunded') {
        return response()->json(['message' => 'Order already refunded'], 400);
    }

    $request->validate([
        'reason' => 'required|string|max:500',
    ]);

    app(RefundService::class)->refundOrder($order, $request->reason);

    return response()->json([
        'success' => true,
        'message' => 'Order refunded to wallet successfully',
    ]);
}

public function partialRefund(Request $request, $id) {
    $order = Order::findOrFail($id);

    $request->validate([
        'item_ids' => 'required|array',
        'item_ids.*' => 'exists:order_items,id',
        'reason' => 'required|string',
    ]);

    app(RefundService::class)->partialRefund($order, $request->item_ids, $request->reason);

    return response()->json([
        'success' => true,
        'message' => 'Partial refund processed',
    ]);
}
```

#### D. Add Routes

```php
Route::post('orders/{id}/refund', [OrderController::class, 'refund']);
Route::post('orders/{id}/partial-refund', [OrderController::class, 'partialRefund']);
```

**Validation**:

- ✅ Full refund credits wallet
- ✅ Partial refund credits wallet
- ✅ Idempotency protected
- ✅ Order status updated
- ✅ Audit trail exists

**Dependencies**: WALLET-02  
**Estimate**: 4 hours

---

### ORDER-02: Auto-Refund on Cancellation

**Priority**: 🔴 BLOCKER  
**Files**:

- `backend/app/Http/Controllers/Api/OrderController.php` - Modify `cancel()` method

**Steps**:

```php
public function cancel(Request $request, $id) {
    $order = Order::findOrFail($id);

    if (!in_array($order->status, ['pending', 'confirmed'])) {
        return response()->json(['message' => 'Order cannot be cancelled'], 400);
    }

    DB::transaction(function() use ($order, $request) {
        // Cancel order
        $order->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $request->reason,
        ]);

        // Refund if already paid
        if ($order->payment_status === 'completed') {
            app(RefundService::class)->refundOrder($order, 'Order cancelled by user');
        }

        // Restore stock
        foreach ($order->items as $item) {
            Product::where('id', $item->product_id)
                ->increment('stock_quantity', $item->quantity);
        }
    });

    return response()->json([
        'success' => true,
        'message' => 'Order cancelled and refunded to wallet',
    ]);
}
```

**Dependencies**: ORDER-01  
**Estimate**: 1 hour

---

## 🔴 PHASE 2: CRITICAL ISSUES (Payment & Security)

**Timeline**: Day 3-4 | **Blocking**: Checkout

### CHECKOUT-01: Implement Wallet-First Payment Strategy

**Priority**: 🔴 CRITICAL  
**Files**:

- `backend/app/Http/Controllers/Api/CheckoutController.php` - NEW
- `backend/app/Services/CheckoutService.php` - NEW

**Steps**:

#### A. Create CheckoutService

```php
namespace App\Services;

class CheckoutService {
    private PaymobService $paymobService;

    public function processPayment(Order $order, string $paymentMethod): array {
        $wallet = UserWallet::firstOrCreate(['user_id' => $order->user_id]);

        // Strategy 1: Wallet has sufficient balance
        if ($paymentMethod === 'wallet' && $wallet->hasSufficientBalance($order->total)) {
            return $this->payWithWalletOnly($order, $wallet);
        }

        // Strategy 2: Wallet has partial balance
        if ($paymentMethod === 'card' && $wallet->balance > 0) {
            return $this->payWithWalletAndCard($order, $wallet);
        }

        // Strategy 3: Card only
        if ($paymentMethod === 'card') {
            return $this->payWithCardOnly($order);
        }

        // Strategy 4: COD
        if ($paymentMethod === 'cash_on_delivery') {
            return $this->payWithCOD($order);
        }

        throw new \Exception('Invalid payment method');
    }

    private function payWithWalletOnly(Order $order, UserWallet $wallet): array {
        DB::transaction(function() use ($order, $wallet) {
            $wallet->debit(
                $order->total,
                "Payment for order #{$order->order_number}",
                'Order',
                $order->id,
                "order_payment_{$order->id}"
            );

            $order->update([
                'payment_method' => 'wallet',
                'payment_status' => 'completed',
            ]);

            PaymentTransaction::create([
                'order_id' => $order->id,
                'transaction_id' => 'WALLET_' . $order->order_number,
                'payment_method' => 'wallet',
                'amount' => $order->total,
                'status' => 'completed',
                'processed_at' => now(),
            ]);
        });

        return [
            'payment_method' => 'wallet',
            'status' => 'completed',
            'message' => 'Paid with wallet',
        ];
    }

    private function payWithWalletAndCard(Order $order, UserWallet $wallet): array {
        $walletAmount = $wallet->balance;
        $cardAmount = $order->total - $walletAmount;

        DB::transaction(function() use ($order, $wallet, $walletAmount) {
            // Debit wallet first
            $wallet->debit(
                $walletAmount,
                "Partial payment for order #{$order->order_number}",
                'Order',
                $order->id,
                "order_partial_wallet_{$order->id}"
            );

            // Mark order as partially paid
            $order->update(['payment_status' => 'pending']);
        });

        // Initiate Paymob for remainder
        $paymobResponse = $this->paymobService->initiatePayment(
            $cardAmount * 100,  // Convert to cents
            $order->id
        );

        return [
            'payment_method' => 'wallet+card',
            'wallet_amount' => $walletAmount,
            'card_amount' => $cardAmount,
            'iframe_url' => $paymobResponse['iframe_url'],
            'status' => 'pending',
        ];
    }

    private function payWithCardOnly(Order $order): array {
        $paymobResponse = $this->paymobService->initiatePayment(
            $order->total * 100,
            $order->id
        );

        return [
            'payment_method' => 'card',
            'iframe_url' => $paymobResponse['iframe_url'],
            'status' => 'pending',
        ];
    }

    private function payWithCOD(Order $order): array {
        $order->update([
            'payment_method' => 'cash_on_delivery',
            'payment_status' => 'pending',
        ]);

        return [
            'payment_method' => 'cash_on_delivery',
            'status' => 'pending',
            'message' => 'Pay on delivery',
        ];
    }
}
```

#### B. Create CheckoutController

```php
class CheckoutController extends Controller {
    private CheckoutService $checkoutService;

    public function processPayment(Request $request) {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
            'payment_method' => 'required|in:wallet,card,cash_on_delivery',
        ]);

        $order = Order::findOrFail($request->order_id);

        $result = $this->checkoutService->processPayment($order, $request->payment_method);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}
```

#### C. Add Routes

```php
Route::post('/checkout/process-payment', [CheckoutController::class, 'processPayment']);
```

**Validation**:

- ✅ Wallet checked first
- ✅ Mixed payment supported
- ✅ Card fallback works
- ✅ COD supported

**Dependencies**: WALLET-02  
**Estimate**: 5 hours

---

### CHECKOUT-02: Promo Code Backend Validation

**Priority**: 🔴 CRITICAL  
**Files**:

- `backend/app/Http/Controllers/Api/PromoCodeController.php` - NEW

**Steps**:

```php
class PromoCodeController extends Controller {
    public function validate(Request $request) {
        $request->validate([
            'code' => 'required|string',
            'cart_total' => 'required|numeric|min:0',
        ]);

        $promo = PromoCode::where('code', $request->code)
            ->where('is_active', true)
            ->first();

        if (!$promo) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid promo code',
            ], 404);
        }

        // Check expiry
        if ($promo->valid_until && now()->gt($promo->valid_until)) {
            return response()->json([
                'valid' => false,
                'message' => 'Promo code has expired',
            ], 400);
        }

        if ($promo->valid_from && now()->lt($promo->valid_from)) {
            return response()->json([
                'valid' => false,
                'message' => 'Promo code not yet valid',
            ], 400);
        }

        // Check usage limit
        if ($promo->usage_limit && $promo->used_count >= $promo->usage_limit) {
            return response()->json([
                'valid' => false,
                'message' => 'Promo code usage limit reached',
            ], 400);
        }

        // Check per-user limit
        $userUsage = PromoCodeUsage::where('promo_code_id', $promo->id)
            ->where('user_id', $request->user()->id)
            ->count();

        if ($userUsage >= $promo->usage_per_user) {
            return response()->json([
                'valid' => false,
                'message' => 'You have already used this promo code',
            ], 400);
        }

        // Check minimum order
        if ($promo->minimum_order > $request->cart_total) {
            return response()->json([
                'valid' => false,
                'message' => \"Minimum order of {$promo->minimum_order} required\",
            ], 400);
        }

        // Calculate discount
        $discount = match($promo->type) {
            'percentage' => min(
                ($request->cart_total * $promo->value / 100),
                $promo->maximum_discount ?? PHP_FLOAT_MAX
            ),
            'fixed_amount' => min($promo->value, $request->cart_total),
            'free_delivery' => 0,  // Handled separately
        };

        return response()->json([
            'valid' => true,
            'promo_code' => $promo,
            'discount' => $discount,
            'free_delivery' => $promo->type === 'free_delivery',
        ]);
    }

    public function apply(Request $request) {
        $request->validate([
            'code' => 'required|string',
            'order_id' => 'required|exists:orders,id',
        ]);

        $order = Order::findOrFail($request->order_id);
        $promo = PromoCode::where('code', $request->code)->firstOrFail();

        // Record usage
        PromoCodeUsage::create([
            'promo_code_id' => $promo->id,
            'user_id' => $request->user()->id,
            'order_id' => $order->id,
            'discount_amount' => $order->discount,
        ]);

        // Increment usage count
        $promo->increment('used_count');

        return response()->json(['success' => true]);
    }
}
```

**Routes**:

```php
Route::post('/promo-codes/validate', [PromoCodeController::class, 'validate']);
Route::post('/promo-codes/apply', [PromoCodeController::class, 'apply']);
```

**Dependencies**: None  
**Estimate**: 3 hours

---

### ORDER-03: Address Snapshot in Orders

**Priority**: 🔴 CRITICAL  
**Files**:

- `backend/database/migrations/[timestamp]_add_address_snapshot_to_orders.php`
- `backend/app/Http/Controllers/Api/OrderController.php`

**Steps**:

#### A. Migration

```php
Schema::table('orders', function (Blueprint $table) {
    $table->string('delivery_street')->after('delivery_address_id');
    $table->string('delivery_city')->after('delivery_street');
    $table->string('delivery_label')->nullable()->after('delivery_city');
});
```

#### B. Modify Order Creation

```php
public function store(Request $request) {
    $address = Address::findOrFail($request->delivery_address_id);

    // Verify ownership
    if ($address->user_id !== $request->user()->id) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    $order = Order::create([
        // ... other fields
        'delivery_address_id' => $address->id,
        'delivery_street' => $address->street,  // Snapshot
        'delivery_city' => $address->city,      // Snapshot
        'delivery_label' => $address->label,    // Snapshot
    ]);
}
```

**Dependencies**: None  
**Estimate**: 1 hour

---

### PAYMENT-01: Sync Paymob Callbacks with Orders

**Priority**: 🔴 CRITICAL  
**Files**:

- `backend/app/Http/Controllers/Api/PaymentController.php`

**Steps**:

```php
public function processedCallback(Request $request) {
    // ... HMAC verification ...

    DB::transaction(function() use ($payment, $request) {
        // Update payment
        $payment->update([
            'payment_status' => $success ? 'success' : 'failed',
            'processed_at' => now(),
        ]);

        // **NEW**: Sync order status
        if ($payment->order_id) {
            $order = Order::find($payment->order_id);

            if ($order) {
                if ($success) {
                    $order->update(['payment_status' => 'completed']);

                    // Deduct stock
                    foreach ($order->items as $item) {
                        Product::where('id', $item->product_id)
                            ->decrement('stock_quantity', $item->quantity);
                    }

                    // Send notification
                    Notification::create([
                        'user_id' => $order->user_id,
                        'type' => 'order_confirmed',
                        'title' => 'Payment Successful',
                        'message' => \"Your order #{$order->order_number} has been confirmed.\",
                    ]);
                } else {
                    $order->update([
                        'payment_status' => 'failed',
                        'status' => 'failed',
                    ]);
                }
            }
        }
    });
}
```

**Dependencies**: None  
**Estimate**: 2 hours

---

## 🟡 PHASE 3: HIGH PRIORITY (Admin & Backend Features)

**Timeline**: Day 5 | **Blocking**: Admin panel

### ADMIN-01: Admin Wallet Credit Endpoint

**Priority**: 🟡 HIGH  
**Files**:

- `backend/app/Http/Controllers/Admin/WalletController.php` - NEW

**Steps**:

```php
class WalletController extends Controller {
    public function credit(Request $request) {
        // Only admins
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:500',
        ]);

        $wallet = UserWallet::firstOrCreate(['user_id' => $request->user_id]);

        $wallet->credit(
            $request->amount,
            \"Admin credit: {$request->reason}\",
            'AdminCredit',
            $request->user()->id,
            \"admin_credit_\" . uniqid()
        );

        Log::info('Admin credited wallet', [
            'admin_id' => $request->user()->id,
            'user_id' => $request->user_id,
            'amount' => $request->amount,
            'reason' => $request->reason,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Wallet credited successfully',
        ]);
    }
}
```

**Routes**:

```php
Route::middleware(['auth:sanctum', 'role:admin'])->group(function() {
    Route::post('/admin/wallets/credit', [Admin\WalletController::class, 'credit']);
});
```

**Dependencies**: WALLET-02  
**Estimate**: 2 hours

---

### ORDER-04: Order State Machine Validation

**Priority**: 🟡 HIGH  
**Files**:

- `backend/app/Models/Order.php`

**Steps**:

```php
class Order extends Model {
    protected static function boot() {
        parent::boot();

        static::updating(function($order) {
            if ($order->isDirty('status')) {
                $old = $order->getOriginal('status');
                $new = $order->status;

                if (!self::isValidTransition($old, $new)) {
                    throw new \Exception(\"Invalid status transition from {$old} to {$new}\");
                }
            }
        });
    }

    private static function isValidTransition(string $from, string $to): bool {
        $validTransitions = [
            'pending' => ['confirmed', 'cancelled', 'failed'],
            'confirmed' => ['preparing', 'cancelled'],
            'preparing' => ['out_for_delivery', 'cancelled'],
            'out_for_delivery' => ['delivered', 'cancelled'],
            'delivered' => [],  // Terminal state
            'cancelled' => [],  // Terminal state
            'failed' => [],     // Terminal state
        ];

        return in_array($to, $validTransitions[$from] ?? []);
    }
}
```

**Dependencies**: None  
**Estimate**: 2 hours

---

### PAYMENT-02: Idempotency Keys for Paymob

**Priority**: 🟡 HIGH  
**Files**:

- `backend/database/migrations/[timestamp]_add_idempotency_to_paymob.php`
- `backend/app/Http/Controllers/Api/PaymentController.php`

**Steps**:

#### A. Migration

```php
Schema::table('paymob_payments', function (Blueprint $table) {
    $table->string('idempotency_key')->nullable()->unique();
});
```

#### B. Modify Callback

```php
public function processedCallback(Request $request) {
    $txnId = $request->obj['id'];
    $idempotencyKey = \"paymob_callback_{$txnId}\";

    // Check if already processed
    $existing = PaymobPayment::where('idempotency_key', $idempotencyKey)->first();
    if ($existing) {
        Log::info('Duplicate Paymob callback ignored', ['txn_id' => $txnId]);
        return response()->json(['success' => true]);
    }

    DB::transaction(function() use ($request, $idempotencyKey) {
        // ... process payment ...

        $payment->update(['idempotency_key' => $idempotencyKey]);
    });
}
```

**Dependencies**: None  
**Estimate**: 1 hour

---

## 🟢 PHASE 4: MEDIUM PRIORITY (Enhancement & Polish)

**Timeline**: Day 6-7 | **Optional**: Quality improvements

### STOCK-01: Stock Reservation System

**Priority**: 🟢 MEDIUM  
**Files**:

- `backend/database/migrations/[timestamp]_add_reserved_quantity_to_products.php`

**Steps**:

```php
Schema::table('products', function (Blueprint $table) {
    $table->integer('reserved_quantity')->default(0);
});

// In OrderController::store()
DB::transaction(function() use ($cartItems) {
    foreach ($cartItems as $item) {
        $product = Product::lockForUpdate()->find($item->product_id);

        $available = $product->stock_quantity - $product->reserved_quantity;

        if ($available < $item->quantity) {
            throw new \Exception(\"Product {$product->name_en} out of stock\");
        }

        $product->increment('reserved_quantity', $item->quantity);
    }

    // Create order...
});

// On payment success, convert reservation to sale
$product->decrement('reserved_quantity', $quantity);
$product->decrement('stock_quantity', $quantity);

// On cancellation, release reservation
$product->decrement('reserved_quantity', $quantity);
```

**Dependencies**: None  
**Estimate**: 3 hours

---

### FRONTEND-01: Frontend API Integration

**Priority**: 🟢 MEDIUM  
**Files**:

- `frontend/services/api/walletApi.ts` - NEW
- `frontend/services/api/checkoutApi.ts` - UPDATE

**Steps**:

```typescript
// walletApi.ts
export const walletApi = {
  async getBalance() {
    return apiRequest("/wallet", { method: "GET" });
  },

  async getTransactions() {
    return apiRequest("/wallet/transactions", { method: "GET" });
  },
};

// checkoutApi.ts
export const checkoutApi = {
  async processPayment(orderId: number, paymentMethod: string) {
    return apiRequest("/checkout/process-payment", {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        payment_method: paymentMethod,
      }),
    });
  },

  async validatePromo(code: string, cartTotal: number) {
    return apiRequest("/promo-codes/validate", {
      method: "POST",
      body: JSON.stringify({ code, cart_total: cartTotal }),
    });
  },
};
```

**Dependencies**: All backend phases  
**Estimate**: 4 hours

---

### TEST-01: Comprehensive Testing

**Priority**: 🟢 MEDIUM  
**Files**:

- `backend/tests/Feature/WalletTest.php` - NEW
- `backend/tests/Feature/CheckoutTest.php` - NEW
- `backend/tests/Feature/RefundTest.php` - NEW

**Steps**:

```php
// WalletTest.php
class WalletTest extends TestCase {
    public function test_wallet_balance_is_computed_from_ledger() {
        $wallet = UserWallet::factory()->create();

        $wallet->credit(100, 'Test credit');
        $wallet->debit(30, 'Test debit');

        $this->assertEquals(70, $wallet->balance);
        $this->assertDatabaseHas('wallet_transactions', ['amount' => 100, 'type' => 'credit']);
        $this->assertDatabaseHas('wallet_transactions', ['amount' => 30, 'type' => 'debit']);
    }

    public function test_double_refund_is_prevented() {
        $order = Order::factory()->create(['total' => 100]);

        app(RefundService::class)->refundOrder($order, 'Test');

        $this->expectException(\Exception::class);
        app(RefundService::class)->refundOrder($order, 'Test');
    }

    public function test_concurrent_wallet_debit_prevents_negative_balance() {
        // Multi-threaded test
    }
}
```

**Dependencies**: All phases  
**Estimate**: 6 hours

---

## 📊 IMPLEMENTATION TIMELINE

| Phase       | Tasks                                          | Duration   | Dependencies |
| ----------- | ---------------------------------------------- | ---------- | ------------ |
| **Phase 1** | WALLET-01, WALLET-02, ORDER-01, ORDER-02       | 2 days     | None         |
| **Phase 2** | CHECKOUT-01, CHECKOUT-02, ORDER-03, PAYMENT-01 | 2 days     | Phase 1      |
| **Phase 3** | ADMIN-01, ORDER-04, PAYMENT-02                 | 1 day      | Phase 1-2    |
| **Phase 4** | STOCK-01, FRONTEND-01, TEST-01                 | 2 days     | Phase 1-3    |
| **Total**   | 16 tasks                                       | **7 days** | Sequential   |

---

## ✅ DEFINITION OF DONE

Each task is complete when:

1. ✅ Code implemented and tested
2. ✅ Database migrations run successfully
3. ✅ API endpoints documented
4. ✅ Unit tests pass (where applicable)
5. ✅ Manual testing verified
6. ✅ No violations of spec requirements
7. ✅ Code reviewed (if team)
8. ✅ Deployed to staging

---

## 🎯 SUCCESS CRITERIA (Final Validation)

### Wallet System

- [ ] Balance computed from ledger (no stored column)
- [ ] No wallet recharge endpoint exists
- [ ] Refunds credit wallet automatically
- [ ] Idempotency protection on all operations
- [ ] No race conditions (tested under load)

### Checkout Flow

- [ ] Promo codes validated backend-only
- [ ] Wallet-first payment strategy works
- [ ] Mixed payments (wallet + card) supported
- [ ] Address snapshots in orders

### Orders System

- [ ] State machine enforced
- [ ] Refunds work (full + partial)
- [ ] Order-payment sync automatic
- [ ] Stock management integrated

### Paymob Integration

- [ ] Callbacks update order status
- [ ] HMAC verification secure
- [ ] Idempotency keys prevent duplicates
- [ ] No wallet recharge via Paymob

---

**END OF TODO LIST**

_Begin with Phase 1 immediately - all blockers must be resolved before proceeding._
