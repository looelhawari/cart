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

    // -----------------------------------------------------------------------
    //  Wave A1 — Apple Sign-In nonce
    // -----------------------------------------------------------------------

    /** @test */
    public function test_apple_signin_requires_raw_nonce(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/Api/Auth/SocialAuthController.php'));
        $this->assertMatchesRegularExpression(
            '/[\'"]raw_nonce[\'"]\s*=>\s*[\'"]required\|/',
            $source,
            'Apple Sign-In must require a raw_nonce param to defend against token replay.',
        );
        $this->assertStringContainsString(
            "hash_equals(\$expected, \$tokenNonce)",
            $source,
            'Apple Sign-In must verify hash_equals(sha256(raw_nonce), payload[nonce]).',
        );
    }

    // -----------------------------------------------------------------------
    //  Wave A2 — UpdateProfileRequest no email/phone change
    // -----------------------------------------------------------------------

    /** @test */
    public function test_profile_update_does_not_accept_email_or_phone(): void
    {
        $rules = (new \App\Http\Requests\Auth\UpdateProfileRequest())->rules();
        $this->assertArrayNotHasKey('email', $rules, 'UpdateProfileRequest must not allow email change here — must go through OTP-verified flow.');
        $this->assertArrayNotHasKey('phone', $rules, 'UpdateProfileRequest must not allow phone change here — must go through OTP-verified flow.');
    }

    // -----------------------------------------------------------------------
    //  Wave B3 — WatchlistController column refs
    // -----------------------------------------------------------------------

    /** @test */
    public function test_watchlist_does_not_query_nonexistent_columns(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/Api/WatchlistController.php'));
        // Strip comments so explanatory text doesn't trip the assertion.
        $stripped = preg_replace('!//.*?\n|/\*.*?\*/!s', '', $source);

        $this->assertStringNotContainsString("'image_url'", $stripped, "products has 'image' not 'image_url'.");
        $this->assertStringNotContainsString("'exists:products,id'", $stripped, "products PK is 'barcode' not 'id'.");
        // Use a regex that only flags `$item->product->stock` accesses, not 'stock_quantity'.
        $this->assertDoesNotMatchRegularExpression('/->product->stock(?!_quantity)/', $stripped);
    }

    // -----------------------------------------------------------------------
    //  Wave B4 — billing_data.email is server-set
    // -----------------------------------------------------------------------

    /** @test */
    public function test_checkout_billing_email_is_server_set(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/Api/CheckoutController.php'));
        $this->assertMatchesRegularExpression(
            '/[\'"]email[\'"]\s*=>\s*\$caller->email/',
            $source,
            "CheckoutController must overwrite billing_data.email with caller's email server-side."
        );
    }

    // -----------------------------------------------------------------------
    //  Wave B6/B7 — DriverController hardening
    // -----------------------------------------------------------------------

    /** @test */
    public function test_driver_accept_order_blocks_unpaid_card_orders(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/Api/DriverController.php'));
        $this->assertStringContainsString("payment_method === 'card'", $source);
        $this->assertStringContainsString("payment_status !== 'completed'", $source);
    }

    /** @test */
    public function test_driver_deliver_cod_requires_confirmation_code(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/Api/DriverController.php'));
        $this->assertStringContainsString("confirmation_code", $source);
        $this->assertStringContainsString('hash_equals(', $source);
        $this->assertStringContainsString('deliveryConfirmationCode', $source);
    }

    // -----------------------------------------------------------------------
    //  Wave C2 — search wildcard strip
    // -----------------------------------------------------------------------

    /** @test */
    public function test_search_strips_sql_like_wildcards(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/Api/SearchSuggestionsController.php'));
        $this->assertMatchesRegularExpression(
            '/preg_replace\([\'"]\/\[%_/',
            $source,
            'SearchSuggestionsController must strip SQL LIKE wildcards before normalising.',
        );
    }

    // -----------------------------------------------------------------------
    //  Wave C3 — cache key whitelisted
    // -----------------------------------------------------------------------

    /** @test */
    public function test_product_index_cache_key_is_whitelisted(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/Api/ProductController.php'));
        $stripped = preg_replace('!//.*?\n|/\*.*?\*/!s', '', $source);

        $this->assertStringNotContainsString(
            "md5(json_encode(\$request->all()))",
            $stripped,
            "ProductController must NOT cache by full request payload — Redis key DoS vector.",
        );
    }

    // -----------------------------------------------------------------------
    //  Wave D2/D3 — race fixes
    // -----------------------------------------------------------------------

    /** @test */
    public function test_set_as_default_address_uses_transaction_and_lock(): void
    {
        $source = file_get_contents(app_path('Models/Address.php'));
        $this->assertStringContainsString('DB::transaction', $source, 'Address::setAsDefault must run inside DB::transaction.');
        $this->assertStringContainsString('lockForUpdate()', $source, 'Address::setAsDefault must lockForUpdate to serialise concurrent calls.');
    }

    /** @test */
    public function test_order_number_generator_is_concurrency_safe(): void
    {
        $source = file_get_contents(app_path('Models/Order.php'));
        // Hard-bounded retry loop — old code was unbounded `do{...}while`
        // which can spin forever under concurrent collisions.
        $this->assertMatchesRegularExpression(
            '/for\s*\(\s*\$attempt\s*=\s*0;\s*\$attempt\s*<\s*10/',
            $source,
            'Order::generateOrderNumber must use a bounded retry loop (was unbounded do/while).',
        );
    }

    // -----------------------------------------------------------------------
    //  Wave A3 — Google relink throttle
    // -----------------------------------------------------------------------

    /** @test */
    public function test_relink_google_has_strict_throttle(): void
    {
        $source = file_get_contents(base_path('routes/api.php'));
        $this->assertMatchesRegularExpression(
            '/relink-google.*throttle:3,60/s',
            $source,
            "relink-google must have a strict throttle (3/hour) — endpoint mutates canonical email.",
        );
    }

    // -----------------------------------------------------------------------
    //  Wave B5 — preCheckPayment rate limit
    // -----------------------------------------------------------------------

    /** @test */
    public function test_pre_check_payment_is_rate_limited(): void
    {
        $source = file_get_contents(base_path('routes/api.php'));
        $this->assertMatchesRegularExpression(
            '/throttle:10,1[\s\S]+paymob\/pre-check/',
            $source,
            "preCheckPayment must be tightly rate-limited — each call creates a Paymob order.",
        );
    }

    // -----------------------------------------------------------------------
    //  Wave D1 — amount_cents BIGINT
    // -----------------------------------------------------------------------

    /** @test */
    public function test_paymob_amount_cents_is_bigint(): void
    {
        $col = \DB::selectOne("SHOW COLUMNS FROM paymob_payments WHERE Field='amount_cents'");
        $this->assertStringContainsString(
            'bigint',
            strtolower($col->Type ?? ''),
            'paymob_payments.amount_cents must be BIGINT to avoid signed-INT overflow at ~21,475 EGP.',
        );
    }

    // -----------------------------------------------------------------------
    //  Wave M1 — OrderRefund hides gateway IDs from JSON
    // -----------------------------------------------------------------------

    /** @test */
    public function test_order_refund_hides_gateway_fields_from_json(): void
    {
        $hidden = (new \App\Models\OrderRefund())->getHidden();
        foreach (['paymob_response', 'paymob_refund_id', 'paymob_transaction_id', 'idempotency_key'] as $field) {
            $this->assertContains(
                $field,
                $hidden,
                'OrderRefund $hidden must include ' . $field . ' so refund rows returned by the admin dashboard do not leak gateway internals.'
            );
        }
    }

    /** @test */
    public function test_paymob_payment_hides_gateway_fields_from_json(): void
    {
        $hidden = (new \App\Models\PaymobPayment())->getHidden();
        foreach (['paymob_response', 'paymob_transaction_id', 'paymob_intention_id', 'paymob_order_id', 'integration_id', 'billing_data', 'special_reference'] as $field) {
            $this->assertContains(
                $field,
                $hidden,
                'PaymobPayment $hidden must include ' . $field . ' — admin endpoints return PaymobPayment rows verbatim and must not leak card BINs/PANs/integration IDs.'
            );
        }
    }

    // -----------------------------------------------------------------------
    //  Wave M2 — Refund idempotency key is shape-stable across services
    // -----------------------------------------------------------------------

    /** @test */
    public function test_refund_idempotency_key_is_canonical_sha256(): void
    {
        $key = \App\Models\OrderRefund::idempotencyKey(123, 'partial', 4500);
        $this->assertSame(64, strlen($key), 'OrderRefund::idempotencyKey must be sha256 (64 hex chars).');
        $this->assertSame(
            hash('sha256', 'refund:123:partial:4500'),
            $key,
            'OrderRefund::idempotencyKey shape must be sha256("refund:{orderId}:{type}:{amountCents}") — both RefundService and OrderCancellationService route through this.'
        );
    }

    /** @test */
    public function test_refund_service_uses_canonical_idempotency_key(): void
    {
        // Source-level check: RefundService must NOT build its own ad-hoc
        // idempotency key string. The previous implementation used
        // "partial_refund_{$id}_{joinedItemIds}" which couldn't collide with
        // OrderCancellationService's sha256 form, so a partial refund routed
        // through both paths created two refund rows with different keys
        // and Paymob got charged twice.
        $src = file_get_contents(base_path('app/Services/RefundService.php'));
        $this->assertStringNotContainsString(
            '"partial_refund_{$order->id}_"',
            $src,
            'RefundService must not compose a non-canonical partial refund key — use OrderRefund::idempotencyKey().'
        );
        $this->assertStringContainsString(
            'OrderRefund::idempotencyKey',
            $src,
            'RefundService must delegate to the canonical OrderRefund::idempotencyKey.'
        );

        $ocsSrc = file_get_contents(base_path('app/Services/OrderCancellationService.php'));
        $this->assertStringContainsString(
            'OrderRefund::idempotencyKey',
            $ocsSrc,
            'OrderCancellationService must delegate to the canonical OrderRefund::idempotencyKey.'
        );
    }

    // -----------------------------------------------------------------------
    //  Wave M3 — Promo cart engine enforces targeting / audience gates
    // -----------------------------------------------------------------------

    /** @test */
    public function test_cart_engine_rejects_promo_when_user_outside_specific_user_ids(): void
    {
        $cartService = app(\App\Services\CartService::class);

        $owner = $this->makeUser('customer');
        $other = $this->makeUser('customer');

        // A targeted promo: only $owner can use it.
        $promo = \App\Models\PromoCode::create([
            'code' => 'TARGET' . Str::random(4),
            'type' => 'percentage',
            'applies_to' => 'order',
            'value' => 10,
            'is_active' => 1,
            'valid_from' => now()->subDay(),
            'valid_until' => now()->addDays(7),
            'specific_user_ids' => [$owner->id],
        ]);

        $cart = \App\Models\Cart::create(['user_id' => $other->id]);

        // Inject one item into the cart so eligibility checks can pass on
        // their own merits — the rejection here must be on targeting, not
        // on emptiness.
        $product = \App\Models\Product::where('is_active', 1)->first();
        if (!$product) {
            $this->markTestSkipped('No active product in DB to seed cart against.');
        }
        \App\Models\CartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $product->barcode,
            'quantity' => 2,
            'price' => 100.00,
        ]);
        $cart = $cart->fresh('items');

        $eval = $cartService->evaluatePromoForCart($promo, $cart, $other->id, 200.00, 20.00);

        $this->assertSame('invalid', $eval['validation_state'],
            'Cart engine must reject targeted promos for non-targeted users — money exploit otherwise.');
        $this->assertSame('NOT_TARGETED', $eval['invalid_reason']);
        $this->assertSame(0.00, (float) $eval['discount_amount']);
    }

    // -----------------------------------------------------------------------
    //  Wave M4 — Negative-total clamp
    // -----------------------------------------------------------------------

    /** @test */
    public function test_cart_totals_clamp_total_at_zero_when_discount_exceeds_subtotal(): void
    {
        // Source-level check: CartService::calculateTotals must guard against
        // discount > subtotal+delivery producing a negative total. A
        // misconfigured fixed_amount (e.g. 9999 EGP off a 50 EGP cart) used
        // to be saved as total < 0, which Paymob then refused to charge but
        // the COD flow would still mark "completed" leaving us owing the
        // customer money on a paid order.
        $src = file_get_contents(base_path('app/Services/CartService.php'));
        $this->assertMatchesRegularExpression(
            '/total\s*=\s*max\(\s*0(?:\.0)?\s*,/',
            $src,
            'CartService::calculateTotals must wrap total in max(0, …) so a discount larger than (subtotal + delivery) cannot produce a negative total.'
        );
        $this->assertMatchesRegularExpression(
            '/discount\s*=\s*\$maxDiscountable/',
            $src,
            'CartService::calculateTotals must clamp the discount itself to (subtotal + delivery) before computing total.'
        );
    }

    /** @test */
    public function test_order_creation_clamps_total_after_zone_fee_recompute(): void
    {
        // OrderService::createOrderFromCart recomputes total when a delivery
        // zone overrides the flat fee. That recomputation also has to clamp
        // at zero — otherwise the zone-fee path becomes a back door for the
        // negative-total bug.
        $src = file_get_contents(base_path('app/Services/OrderService.php'));
        $this->assertMatchesRegularExpression(
            '/\$total\s*=\s*max\(\s*0(?:\.0)?\s*,/',
            $src,
            'OrderService::createOrderFromCart must clamp the recomputed total at zero when applying zone fees.'
        );
    }

    // -----------------------------------------------------------------------
    //  Wave M5 — Preview-only engine clearly marked
    // -----------------------------------------------------------------------

    /** @test */
    public function test_preview_promo_engine_is_documented_as_preview_only(): void
    {
        // The model-side calculateDiscount and PromoCodeService are NOT the
        // money-time engine. They must be clearly annotated so future devs
        // don't wire them into checkout.
        $modelSrc = file_get_contents(base_path('app/Models/PromoCode.php'));
        $this->assertStringContainsString(
            'PREVIEW-ONLY',
            $modelSrc,
            'PromoCode::calculateDiscount must be annotated PREVIEW-ONLY to keep the canonical engine (CartService::evaluatePromoForCart) the single money-time path.'
        );

        $svcSrc = file_get_contents(base_path('app/Services/PromoCodeService.php'));
        $this->assertStringContainsString(
            'PREVIEW',
            $svcSrc,
            'PromoCodeService must be annotated as preview/recommendation engine, not the order-creation engine.'
        );
    }

    // -----------------------------------------------------------------------
    //  Slice 2 — Auth + Users/Customers merge
    // -----------------------------------------------------------------------

    /** @test */
    public function test_admin_users_service_does_not_double_wrap_params(): void
    {
        // SECURITY/CORRECTNESS: AdminDashboard's user.service.ts used to
        // double-wrap query params:
        //   apiClient.get('/admin/users', { params })  // <-- WRONG
        // The internal apiClient.get already wraps the second arg as
        // axios `{ params }`, so the line above made axios serialise
        // `?params[role]=admin&params[per_page]=100` and the server
        // silently received NO filters. Result: every Users page rendered
        // every customer as "no role filter applied".
        $svcPath = base_path('../AdminDashboard/src/services/user.service.ts');
        if (! file_exists($svcPath)) {
            $this->markTestSkipped('AdminDashboard sibling repo not present.');
        }
        $src = file_get_contents($svcPath);
        $this->assertStringNotContainsString(
            "apiClient.get('/admin/users', { params })",
            $src,
            "user.service.ts must NOT double-wrap params. apiClient.get's second arg IS the params object, not an axios config."
        );
        $this->assertStringNotContainsString(
            "apiClient.get('/admin/customers', { params: filters })",
            $src,
            "user.service.ts: getCustomers must pass filters directly, not wrap them as { params: filters }."
        );
    }

    /** @test */
    public function test_dead_support_ticket_tables_are_dropped(): void
    {
        $this->assertFalse(
            \Schema::hasTable('support_tickets'),
            'support_tickets table must be dropped — complaints is the canonical schema.'
        );
        $this->assertFalse(
            \Schema::hasTable('ticket_messages'),
            'ticket_messages table must be dropped — complaint_messages is the canonical schema.'
        );
    }

    /** @test */
    public function test_orphan_support_ticket_models_are_removed(): void
    {
        $appPath = base_path('app');
        $this->assertFileDoesNotExist(
            $appPath . '/Models/SupportTicket.php',
            'SupportTicket model must be deleted — the underlying support_tickets table is dropped.'
        );
        $this->assertFileDoesNotExist(
            $appPath . '/Models/TicketMessage.php',
            'TicketMessage model must be deleted — the underlying ticket_messages table is dropped.'
        );
    }

    /** @test */
    public function test_complaint_user_fk_is_set_null_on_user_delete(): void
    {
        $rows = \DB::select(
            "SELECT DELETE_RULE
               FROM information_schema.REFERENTIAL_CONSTRAINTS rc
               JOIN information_schema.KEY_COLUMN_USAGE kcu
                 ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
              WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
                AND kcu.TABLE_NAME = 'complaints'
                AND kcu.COLUMN_NAME = 'user_id'
                AND kcu.REFERENCED_TABLE_NAME = 'users'"
        );
        $this->assertNotEmpty($rows, 'complaints.user_id FK to users not found.');
        foreach ($rows as $r) {
            $this->assertSame('SET NULL', strtoupper((string) $r->DELETE_RULE),
                'complaints.user_id FK must onDelete SET NULL — cascade would destroy the audit trail when a customer is deleted.');
        }
    }

    /** @test */
    public function test_complaint_message_user_fk_is_set_null_on_user_delete(): void
    {
        $rows = \DB::select(
            "SELECT DELETE_RULE
               FROM information_schema.REFERENTIAL_CONSTRAINTS rc
               JOIN information_schema.KEY_COLUMN_USAGE kcu
                 ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
              WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
                AND kcu.TABLE_NAME = 'complaint_messages'
                AND kcu.COLUMN_NAME = 'user_id'
                AND kcu.REFERENCED_TABLE_NAME = 'users'"
        );
        $this->assertNotEmpty($rows, 'complaint_messages.user_id FK to users not found.');
        foreach ($rows as $r) {
            $this->assertSame('SET NULL', strtoupper((string) $r->DELETE_RULE),
                'complaint_messages.user_id FK must onDelete SET NULL — admin replies and customer messages must outlive user deletion.');
        }
    }

    /** @test */
    public function test_complaint_creation_writes_identity_snapshot(): void
    {
        $user = $this->makeUser('customer', [
            'first_name' => 'Snapshot', 'last_name' => 'Test',
        ]);

        $complaint = \App\Models\Complaint::create([
            'user_id' => $user->id,
            'ticket_number' => \App\Models\Complaint::generateTicketNumber(),
            'subject' => 'Test snapshot',
            'category' => 'general_inquiry',
            'priority' => 'medium',
            'status' => 'open',
            'description' => 'Verifies identity snapshot is auto-populated.',
        ]);

        $this->assertSame($user->email, $complaint->user_email_snapshot,
            'Complaint::booted creating hook must auto-populate user_email_snapshot from the referenced user.');
        $this->assertStringContainsString('Snapshot', (string) $complaint->user_name_snapshot,
            'Complaint::booted creating hook must auto-populate user_name_snapshot.');
    }

    // -----------------------------------------------------------------------
    //  Slice 3 — Delivery zones + addresses
    // -----------------------------------------------------------------------

    /** @test */
    public function test_zone_cache_keys_include_customer_facing_key(): void
    {
        // Admin invalidations only forgot 'delivery_zones:active', but the
        // customer-facing /api/v1/delivery-zones endpoint reads from
        // 'zones:active:all' with a 30-min TTL. An admin lowering a fee
        // kept serving the old map for half an hour. The fix consolidated
        // the keys into ZONE_CACHE_KEYS — assert the customer key is in.
        $keys = \App\Services\DeliveryZoneService::ZONE_CACHE_KEYS;
        $this->assertContains('zones:active:all', $keys,
            'DeliveryZoneService::ZONE_CACHE_KEYS must include the customer-facing cache key so admin updates invalidate it.');
        $this->assertContains('delivery_zones:active', $keys);
    }

    /** @test */
    public function test_zone_create_clears_customer_cache(): void
    {
        // Seed the customer-facing cache, run the admin path, assert flush.
        \Illuminate\Support\Facades\Cache::put('zones:active:all', ['stale'], 1800);

        $svc = app(\App\Services\DeliveryZoneService::class);
        // Build a tiny square polygon over Cairo so validation passes.
        $svc->createZone([
            'name' => 'CacheTest_' . Str::random(4),
            'city' => 'Cairo',
            'area' => 'TestArea',
            'delivery_fee' => 25,
            'minimum_order' => 0,
            'is_active' => true,
            'polygon_coordinates' => [
                ['lat' => 30.0, 'lng' => 31.0],
                ['lat' => 30.0, 'lng' => 31.1],
                ['lat' => 30.1, 'lng' => 31.1],
                ['lat' => 30.1, 'lng' => 31.0],
            ],
        ]);

        $this->assertNull(
            \Illuminate\Support\Facades\Cache::get('zones:active:all'),
            'createZone must invalidate the customer-facing zones:active:all cache.'
        );
    }

    /** @test */
    public function test_order_creation_blocks_out_of_zone_addresses(): void
    {
        // Build a Cairo square zone, then point an address at coords way
        // outside any zone (-89, 0 = south pole). Order creation must throw
        // with a user-friendly message, not silently accept the order at
        // the flat fee.
        $svc = app(\App\Services\DeliveryZoneService::class);
        $svc->createZone([
            'name' => 'OutOfZoneTest_' . Str::random(4),
            'city' => 'Cairo',
            'area' => 'TestArea',
            'delivery_fee' => 25,
            'minimum_order' => 0,
            'is_active' => true,
            'polygon_coordinates' => [
                ['lat' => 30.0, 'lng' => 31.0],
                ['lat' => 30.0, 'lng' => 31.1],
                ['lat' => 30.1, 'lng' => 31.1],
                ['lat' => 30.1, 'lng' => 31.0],
            ],
        ]);

        $user = $this->makeUser('customer');
        $address = \App\Models\Address::create([
            'user_id' => $user->id,
            'label' => 'Home',
            'street' => 'Nowhere Lane',
            'city' => 'AntarcticaCity',
            'latitude' => -89.0,
            'longitude' => 0.0,
            'is_default' => 1,
        ]);

        $product = \App\Models\Product::where('is_active', 1)->first();
        if (!$product) {
            $this->markTestSkipped('No active product available.');
        }
        $cart = \App\Models\Cart::create(['user_id' => $user->id]);
        \App\Models\CartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $product->barcode,
            'quantity' => 1,
            'price' => 100.00,
        ]);

        $orderService = app(\App\Services\OrderService::class);
        $this->expectException(\Exception::class);
        $orderService->createOrderFromCart(
            $cart->fresh('items'),
            $user->id,
            $address->id,
            'cash_on_delivery'
        );
    }

    /** @test */
    public function test_order_service_honors_free_delivery_threshold_over_zone_fee(): void
    {
        // Source-level guard: OrderService must read free_delivery_threshold
        // from StoreSetting and skip the zone-fee override when the cart
        // has cleared that threshold. The earlier code unconditionally
        // replaced cartTotals['delivery_fee'] (which was already 0) with
        // the zone fee, charging customers delivery they were promised
        // was free.
        $src = file_get_contents(base_path('app/Services/OrderService.php'));
        $this->assertStringContainsString(
            'free_delivery_threshold',
            $src,
            'OrderService::createOrderFromCart must read free_delivery_threshold so zone fees do not override the freebie.'
        );
        $this->assertStringContainsString(
            '$freeByThreshold',
            $src,
            'OrderService::createOrderFromCart must compute $freeByThreshold to gate the zone-fee override.'
        );
        $this->assertMatchesRegularExpression(
            '/if\s*\(\s*!\s*\$freeByThreshold/',
            $src,
            'OrderService::createOrderFromCart must skip the zone-fee override when the threshold is met.'
        );
    }

    /** @test */
    public function test_zone_snapshot_does_not_overwrite_delivery_fee(): void
    {
        // Defense against regression: snapshotZoneToOrder used to write
        // delivery_fee = $zone->delivery_fee, which clobbered the
        // free-delivery-threshold rule applied in OrderService a moment
        // earlier. This guards against re-introducing that line.
        $src = file_get_contents(base_path('app/Services/DeliveryZoneService.php'));
        $this->assertStringNotContainsString(
            "'delivery_fee'              => \$zone?->delivery_fee",
            $src,
            'DeliveryZoneService::snapshotZoneToOrder must NOT write delivery_fee — that overwrites the free-threshold result from OrderService.'
        );
    }

    /** @test */
    public function test_address_controller_reverse_geocodes_client_coords(): void
    {
        // SECURITY: when the customer supplies lat/lng + a free-text
        // formatted_address, the two could disagree (cheap-zone pin,
        // expensive-zone text). AddressController must reverse-geocode
        // the supplied coords server-side and overwrite formatted_address
        // with the canonical Nominatim result. Source-level check.
        $src = file_get_contents(base_path('app/Http/Controllers/Api/AddressController.php'));
        $this->assertStringContainsString(
            'reverseGeocodeAndStamp',
            $src,
            'AddressController must call reverseGeocodeAndStamp() so client coords do not drive a forged formatted_address.'
        );
        $this->assertStringContainsString(
            '$this->geoHelper->reverseGeocode(',
            $src,
            'AddressController::reverseGeocodeAndStamp must call GeoHelper::reverseGeocode (Nominatim) to derive canonical address text.'
        );
    }

    /** @test */
    public function test_complaint_message_creation_writes_author_snapshot(): void
    {
        $user = $this->makeUser('customer', [
            'first_name' => 'Author', 'last_name' => 'Snapshot',
        ]);

        $complaint = \App\Models\Complaint::create([
            'user_id' => $user->id,
            'ticket_number' => \App\Models\Complaint::generateTicketNumber(),
            'subject' => 'Test',
            'category' => 'general_inquiry',
            'priority' => 'medium',
            'status' => 'open',
            'description' => 'x',
        ]);

        $msg = \App\Models\ComplaintMessage::create([
            'complaint_id' => $complaint->id,
            'user_id' => $user->id,
            'message' => 'hello',
            'is_admin_reply' => false,
        ]);

        $this->assertSame($user->email, $msg->author_email_snapshot,
            'ComplaintMessage::booted creating hook must auto-populate author_email_snapshot.');
        $this->assertSame('customer', $msg->author_role_snapshot,
            'ComplaintMessage::booted creating hook must auto-populate author_role_snapshot — needed to read the audit trail after a user is deleted.');
    }
}
