<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\PromoCode;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Concrete tests for the highest-severity audit findings.
 *
 * Each test is a regression that REPRODUCES a known bug. A passing test means
 * the bug is fixed. A failing test means the bug is still live.
 *
 * Designed to run inside transactions (no migrate:fresh required) so it can
 * execute against a prod-shape DB seeded from the SQL dump.
 */
class AuditFindingsTest extends TestCase
{
    use DatabaseTransactions;

    private function makeUser(string $role = 'customer', array $overrides = []): User
    {
        return User::create(array_merge([
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test+' . Str::random(8) . '@example.com',
            'password' => Hash::make('Password!1'),
            'role' => $role,
            'is_active' => 1,
            'is_verified' => 1,
            'language' => 'en',
            'email_verified_at' => now(),
        ], $overrides));
    }

    // -----------------------------------------------------------------------
    // CHAIN A removed — wallet feature deleted from product entirely.
    // No wallet = no double-credit possible. See migration
    // 2026_05_03_000003_remove_wallet_feature.
    // -----------------------------------------------------------------------

    /**
     * @test
     * Wallet feature is fully removed. Verify the public surface is gone.
     *
     * We check the filesystem directly (not class_exists, which would trigger
     * the autoloader and throw if the file path is still in the classmap).
     */
    public function test_wallet_feature_is_removed(): void
    {
        $appPath = base_path('app');
        $this->assertFileDoesNotExist($appPath . '/Models/UserWallet.php', 'UserWallet model still exists.');
        $this->assertFileDoesNotExist($appPath . '/Models/WalletTransaction.php', 'WalletTransaction model still exists.');
        $this->assertFileDoesNotExist($appPath . '/Http/Controllers/Api/WalletController.php', 'WalletController still exists.');

        // CreateOrderRequest must no longer accept 'wallet' as a payment method
        $rules = (new \App\Http\Requests\CreateOrderRequest())->rules();
        $this->assertStringNotContainsString('wallet', $rules['payment_method'], 'CreateOrderRequest still accepts wallet payment method.');

        // user_wallets and wallet_transactions tables should be dropped
        $this->assertFalse(\Schema::hasTable('user_wallets'), 'user_wallets table not dropped.');
        $this->assertFalse(\Schema::hasTable('wallet_transactions'), 'wallet_transactions table not dropped.');

        // 'wallet' should no longer be a valid orders.payment_method enum value
        $col = \DB::selectOne("SHOW COLUMNS FROM orders WHERE Field = 'payment_method'");
        $this->assertStringNotContainsString("'wallet'", $col->Type, "orders.payment_method ENUM still contains 'wallet'.");
    }

    // -----------------------------------------------------------------------
    // CHAIN B — Privilege escalation via mass-assignment
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: User::$fillable includes 'role'.
     * Anyone calling User::create() or $user->update() with attacker-supplied
     * input can elevate role to 'owner'.
     */
    public function test_user_role_cannot_be_mass_assigned(): void
    {
        $user = User::create([
            'first_name' => 'Attacker',
            'last_name' => 'X',
            'email' => 'mass+' . Str::random(6) . '@example.com',
            'password' => Hash::make('x'),
            'role' => 'owner',         // <-- attacker-supplied
            'is_verified' => true,     // <-- attacker-supplied
            'is_active' => true,
            'language' => 'en',
        ]);

        $this->assertNotEquals('owner', $user->role, 'role was mass-assigned via User::create — privilege escalation vector.');
        $this->assertFalse((bool) $user->is_verified, 'is_verified was mass-assigned — bypass of OTP verification.');
    }

    /**
     * @test
     * Order money tampering — defense-in-depth at the controller boundary.
     *
     * Order::$fillable is deliberately permissive (services like OrderService,
     * CheckoutService, PaymentConfirmationService etc. write status/total/
     * payment_status with hardcoded server-computed values via $order->update).
     * The actual attack-prevention lives in CreateOrderRequest, which does
     * NOT validate `total`, `subtotal`, `payment_status`, `discount`,
     * `refunded_amount`, `driver_id` — so even if a controller forwarded
     * $request->validated() into Order::create, those keys would not be
     * present.
     *
     * This test asserts the validation rules on CreateOrderRequest do not
     * include any of the dangerous fields.
     */
    public function test_order_create_request_does_not_accept_money_fields(): void
    {
        $rules = (new \App\Http\Requests\CreateOrderRequest())->rules();

        $forbidden = [
            'total', 'subtotal', 'discount', 'tax', 'delivery_fee',
            'payment_status', 'status', 'refunded_amount', 'refunded_at',
            'driver_id', 'delivery_zone_id',
        ];

        foreach ($forbidden as $field) {
            $this->assertArrayNotHasKey(
                $field,
                $rules,
                "CreateOrderRequest validates `{$field}` — that field MUST be server-computed only."
            );
        }
    }

    /**
     * @test
     * BUG: PaymentMethod::$fillable allows is_verified + status.
     */
    public function test_payment_method_verified_cannot_be_mass_assigned(): void
    {
        $user = $this->makeUser();

        $pm = PaymentMethod::create([
            'user_id' => $user->id,
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'token' => 'opaque-token',
            'is_verified' => true,             // <-- attacker-supplied
            'status' => 'active',              // <-- attacker-supplied
            'token_fingerprint' => str_repeat('a', 64),
        ]);

        $this->assertFalse((bool) $pm->is_verified, 'PaymentMethod.is_verified was mass-assigned — saved-card trust bypass.');
    }

    /**
     * @test
     * BUG: PromoCode::$fillable allows used_count.
     * Admin updating promo via $promo->fill($validated) can reset used_count
     * to 0, bypassing usage_limit.
     */
    public function test_promo_code_used_count_cannot_be_mass_assigned(): void
    {
        // Find any existing promo (dump has them)
        $promo = PromoCode::first();
        if (!$promo) {
            $this->markTestSkipped('No promo_codes seeded.');
        }

        $original = $promo->used_count;
        $promo->fill(['used_count' => 0]);
        $promo->save();
        $promo->refresh();

        $this->assertEquals($original, $promo->used_count, 'used_count was mass-assigned — promo budget can be reset by admin form.');
    }

    // -----------------------------------------------------------------------
    // CHAIN A — Refund non-determinism
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: RefundService::partialRefund builds idempotency key with
     * implode('_', $itemIds). [1,2] and [2,1] produce different keys —
     * double credit possible.
     */
    public function test_partial_refund_idempotency_key_is_order_independent(): void
    {
        $reflect = new \ReflectionClass(\App\Services\RefundService::class);
        if (!$reflect->hasMethod('partialRefund')) {
            $this->markTestSkipped('RefundService::partialRefund not present');
        }

        $service = app(\App\Services\RefundService::class);

        // Use reflection to extract the idempotency key composition logic.
        // If the method body still uses implode without sort, two arrays with
        // same elements in different order will produce different keys.
        $methodSource = file_get_contents(
            (new \ReflectionMethod($service, 'partialRefund'))->getFileName()
        );

        // Specifically: line that builds the idempotency key
        $hasSort = preg_match('/sort\(\s*\$itemIds\s*\)/', $methodSource);
        $hasImplode = preg_match('/implode\(\s*[\'"]_[\'"]\s*,\s*\$itemIds\s*\)/', $methodSource);

        $this->assertTrue(
            $hasSort || !$hasImplode,
            'RefundService::partialRefund builds idempotency key from unsorted item IDs — double-refund vector.'
        );
    }

    /**
     * @test
     * BUG: RefundService::refundOrder uses time() in lock_key, then once a
     * row exists in refund_locks the table's UNIQUE(order_id) blocks all
     * future refunds of that order forever.
     */
    public function test_refund_lock_key_does_not_use_time(): void
    {
        $methodSource = file_get_contents(
            app_path('Services/RefundService.php')
        );

        $usesTime = preg_match('/lockKey\s*=\s*"refund_order_\{\$order->id\}_"\s*\.\s*time\(\)/', $methodSource);

        $this->assertEquals(
            0,
            $usesTime,
            'RefundService::refundOrder uses time() in lock key — once a refund_locks row exists, all future refunds are blocked.'
        );
    }

    // -----------------------------------------------------------------------
    // CHAIN E / S5 — Payment status IDOR
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: GET /api/v1/payments/order/{orderId}/status performs no ownership
     * check — any user can enumerate any order's payment status.
     */
    public function test_payment_order_status_blocks_other_users(): void
    {
        $owner = $this->makeUser();
        $intruder = $this->makeUser();

        $addressId = DB::table('addresses')->value('id');
        $order = Order::create([
            'user_id' => $owner->id,
            'order_number' => 'AUDIT-' . Str::random(6),
            'payment_method' => 'card',
            'delivery_address_id' => $addressId,
            'subtotal' => 100,
            'total' => 100,
            'status' => 'pending',
            'payment_status' => 'completed',
        ]);

        // Also create a paymob_payment row so the controller does NOT short-circuit on 404
        DB::table('paymob_payments')->insert([
            'order_id' => $order->id,
            'user_id' => $owner->id,
            'internal_order_id' => 'TEST-' . Str::random(8),
            'paymob_order_id' => 'pgm-' . Str::random(8),
            'amount_cents' => 10000,
            'currency' => 'EGP',
            'payment_method' => 'card',
            'flow' => 'unified_3ds',
            'integration_id' => '0',
            'billing_data' => json_encode(['email' => 'test@example.com']),
            'status' => 'PAID',
            'paid_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Sanctum::actingAs($intruder);

        $resp = $this->getJson("/api/v1/payments/order/{$order->id}/status");

        // After fix: must be 403 (or 404 if the controller chose obscurity).
        $this->assertTrue(
            in_array($resp->status(), [403, 404]),
            "Other user can read order #{$order->id} payment status — IDOR. Got HTTP " . $resp->status()
        );
    }

    // -----------------------------------------------------------------------
    // OAuth audience (S6) — static check
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: SocialAuthController logs Apple aud mismatch but does NOT reject.
     */
    public function test_apple_audience_mismatch_is_rejected(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/Api/Auth/SocialAuthController.php'));

        // Pattern: log warning then continue past the in_array check
        $hasComment = preg_match('/Allow flexibility during development/i', $source);

        $this->assertEquals(
            0,
            $hasComment,
            'SocialAuthController has the "Allow flexibility during development" branch — Apple audience not enforced.'
        );
    }

    // -----------------------------------------------------------------------
    // Public promo enumeration
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: /api/v1/promo-codes/validate is public — attackers can enumerate.
     */
    public function test_promo_validate_requires_auth(): void
    {
        $resp = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'ATTACKER_PROBE_' . Str::random(6),
            'subtotal' => 100,
        ]);

        $this->assertTrue(
            in_array($resp->status(), [401, 403]),
            'Promo validate is reachable without auth — supports unbounded code enumeration. Got HTTP ' . $resp->status()
        );
    }

    // -----------------------------------------------------------------------
    // OTP plaintext storage (Chain C item 3)
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: Otp model stored 6-digit codes in plaintext. Anyone with DB read
     * access could replay any unexpired OTP.
     *
     * After fix: the persisted `otp` column is a bcrypt hash, and the
     * plaintext is exposed only on the in-memory model instance via the
     * `plaintext_otp` attribute (just long enough for the controller to
     * email/SMS it, then gone).
     */
    public function test_otp_is_not_stored_plaintext(): void
    {
        $service = app(\App\Services\OtpService::class);
        $otp = $service->createEmailVerificationOtp('plaintext-test+' . Str::random(6) . '@example.com');

        $stored = DB::table('otps')->where('id', $otp->id)->value('otp');
        $plaintext = $otp->getAttribute('plaintext_otp');

        $this->assertNotEmpty($plaintext, 'OtpService should expose the plaintext on the returned instance.');
        $this->assertMatchesRegularExpression('/^\d{6}$/', $plaintext, 'plaintext_otp should be a 6-digit code.');
        $this->assertNotEquals($plaintext, $stored, 'OTP value is stored in plaintext — DB read = account takeover.');
        $this->assertStringStartsWith('$2y$', $stored, 'Stored OTP should be a bcrypt hash.');

        // And verify() still works against the plaintext
        $verified = $service->verify($otp->identifier, $plaintext, 'email_verification');
        $this->assertNotNull($verified, 'OtpService::verify should accept the plaintext code against the hash.');
    }

    // -----------------------------------------------------------------------
    // OTP log leak (Chain C item 4)
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: OtpService::sendEmailSync writes the OTP into the log message.
     */
    public function test_otp_value_is_not_in_log_string(): void
    {
        $source = file_get_contents(app_path('Services/OtpService.php'));

        // Pattern: Log::info("OTP sent to {$email}: {$otp}")
        $hasLeakedOtp = preg_match('/Log::info\([^)]*OTP[^)]*:\s*\{?\$otp\}?/i', $source);

        $this->assertEquals(
            0,
            $hasLeakedOtp,
            'OtpService logs OTP value to log string — anyone with log access can replay.'
        );
    }

    // -----------------------------------------------------------------------
    // Audit log diffs (Chain B item 4)
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: LogAdminActivity middleware writes old_values=null, new_values=null.
     * Audit log records nothing useful.
     */
    public function test_log_admin_activity_captures_diffs(): void
    {
        $source = file_get_contents(app_path('Http/Middleware/LogAdminActivity.php'));

        $allNull = preg_match("/'old_values'\\s*=>\\s*null,\\s*'new_values'\\s*=>\\s*null/", $source);

        $this->assertEquals(
            0,
            $allNull,
            'LogAdminActivity hardcodes old_values=null and new_values=null — audit table is ornamental.'
        );
    }

    // -----------------------------------------------------------------------
    // Webhook replay protection (Chain A)
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: RefundWebhookController has no replay protection (no nonce store
     * + no created_at age check).
     */
    public function test_refund_webhook_has_replay_protection(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/Api/RefundWebhookController.php'));

        // Look for either a nonce/event-store insert OR a created_at timestamp check
        $hasNonceStore = preg_match('/webhook_events|paymob_webhook_events/i', $source);
        $hasAgeCheck = preg_match('/diffInMinutes|diffInSeconds|->isPast|->lt\(\s*now\(\)/', $source);

        $this->assertTrue(
            (bool) $hasNonceStore || (bool) $hasAgeCheck,
            'RefundWebhookController has neither a webhook_events store nor a created_at age check — replay attacks possible.'
        );
    }

    /**
     * @test
     * BUG: PaymentController processedCallback uses migs_order.status and
     * captured_amount which are NOT covered by Paymob HMAC — attacker can
     * forge these unsigned fields to force order confirmation.
     */
    public function test_payment_callback_does_not_use_unsigned_fields(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/Api/PaymentController.php'));

        // Block where $isCapture is forced true based on un-HMAC'd payload fields
        $usesMigsStatus = preg_match("/migs_order.*status.*CAPTURED/s", $source);

        $this->assertEquals(
            0,
            $usesMigsStatus,
            'PaymentController overrides is_capture based on migs_order.status / captured_amount — these fields are NOT HMAC-signed.'
        );
    }

    // -----------------------------------------------------------------------
    // Driver location hijack (Chain E)
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: DriverController::updateLocation rule 'order_id' => 'nullable|exists:orders,id'
     * does NOT verify the driver is assigned to that order.
     */
    public function test_driver_update_location_validates_order_ownership(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/Api/DriverController.php'));

        // Look for a rule that scopes order_id to the requesting driver
        $hasDriverScope = preg_match("/exists:orders.*driver_id|->where\(\s*['\"]driver_id['\"]/", $source);

        $this->assertNotEquals(
            0,
            $hasDriverScope,
            'DriverController::updateLocation does not scope order_id to the calling driver — GPS-spoof attack.'
        );
    }

    // -----------------------------------------------------------------------
    // DriverMiddleware checks is_active (Chain E)
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: DriverMiddleware only checks role='driver', not is_active.
     */
    public function test_driver_middleware_checks_is_active(): void
    {
        $source = file_get_contents(app_path('Http/Middleware/DriverMiddleware.php'));

        $checksActive = preg_match('/is_active/', $source);

        $this->assertNotEquals(
            0,
            $checksActive,
            'DriverMiddleware does not check is_active — suspended drivers retain access.'
        );
    }

    // -----------------------------------------------------------------------
    // Broadcasting auth bypass (S4)
    // -----------------------------------------------------------------------

    /**
     * @test
     * BUG: /broadcasting/auth manual fallback signs ANY private channel
     * without authorization (only validates complaints.* channels).
     */
    public function test_broadcasting_auth_does_not_have_manual_fallback(): void
    {
        $source = file_get_contents(base_path('routes/api.php'));

        // The dangerous code path: hash_hmac of socket_id + channel name
        // returned without verifying channel ownership for non-complaints channels.
        $hasManualSign = preg_match('/hash_hmac\([\'"]sha256[\'"]\s*,\s*\$stringToSign\s*,\s*\$pusherSecret\)/', $source);

        $this->assertEquals(
            0,
            $hasManualSign,
            'Manual Pusher signing fallback exists in /broadcasting/auth — any user can subscribe to any private channel.'
        );
    }
}
