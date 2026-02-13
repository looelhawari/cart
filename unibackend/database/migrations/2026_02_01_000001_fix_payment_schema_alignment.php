<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * CRITICAL FIX MIGRATION: Align payment tables with model expectations.
 *
 * Fixes:
 * 1. Add user_id to paymob_payments (for fraud queries without JOIN)
 * 2. Add special_reference to paymob_payments (for webhook→payment mapping)
 * 3. Make payment_methods.token nullable (new flow doesn't set legacy token)
 * 4. Increase payment_methods.paymob_card_token to TEXT (AES-256-CBC ciphertext is large)
 * 5. Add payment_methods.expires_at column if missing
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Add user_id to paymob_payments ──────────────────────────
        if (!Schema::hasColumn('paymob_payments', 'user_id')) {
            Schema::table('paymob_payments', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->after('order_id');
                $table->index('user_id', 'pp_user_id_idx');
            });

            // Backfill user_id from orders table
            DB::statement('
                UPDATE paymob_payments pp
                INNER JOIN orders o ON pp.order_id = o.id
                SET pp.user_id = o.user_id
                WHERE pp.user_id IS NULL
            ');
        }

        // ── 2. Add special_reference for webhook mapping ────────────────
        if (!Schema::hasColumn('paymob_payments', 'special_reference')) {
            Schema::table('paymob_payments', function (Blueprint $table) {
                $table->string('special_reference', 255)->nullable()->after('internal_order_id')
                    ->comment('Unique reference sent to Paymob for webhook correlation');
                $table->index('special_reference', 'pp_special_ref_idx');
            });
        }

        // ── 3. Make payment_methods.token nullable ──────────────────────
        // New Unified Checkout flow only sets paymob_card_token, not legacy token
        // Only alter if currently NOT nullable (skip if already text/nullable)
        if (Schema::hasColumn('payment_methods', 'token')) {
            $tokenCol = DB::selectOne("SHOW COLUMNS FROM payment_methods WHERE Field = 'token'");
            if ($tokenCol && strtolower($tokenCol->Null) !== 'yes') {
                Schema::table('payment_methods', function (Blueprint $table) {
                    $table->text('token')->nullable()->change();
                });
            }
        }

        // ── 4. Increase paymob_card_token to TEXT ───────────────────────
        // AES-256-CBC ciphertext with Laravel envelope is ~400+ bytes
        // Must drop index first — MySQL cannot have a plain index on TEXT column
        if (Schema::hasColumn('payment_methods', 'paymob_card_token')) {
            $cardTokenCol = DB::selectOne("SHOW COLUMNS FROM payment_methods WHERE Field = 'paymob_card_token'");
            $needsChange = $cardTokenCol && stripos($cardTokenCol->Type, 'text') === false;

            if ($needsChange) {
                // Drop the existing index on paymob_card_token if present
                $indexes = DB::select("SHOW INDEX FROM payment_methods WHERE Column_name = 'paymob_card_token'");
                foreach ($indexes as $idx) {
                    Schema::table('payment_methods', function (Blueprint $table) use ($idx) {
                        $table->dropIndex($idx->Key_name);
                    });
                }

                Schema::table('payment_methods', function (Blueprint $table) {
                    $table->text('paymob_card_token')->nullable()->change();
                });
            }
        }

        // ── 5. Add expires_at if missing ────────────────────────────────
        if (!Schema::hasColumn('payment_methods', 'expires_at')) {
            Schema::table('payment_methods', function (Blueprint $table) {
                $table->date('expires_at')->nullable()->after('is_verified');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('paymob_payments', 'user_id')) {
            Schema::table('paymob_payments', function (Blueprint $table) {
                $table->dropIndex('pp_user_id_idx');
                $table->dropColumn('user_id');
            });
        }

        if (Schema::hasColumn('paymob_payments', 'special_reference')) {
            Schema::table('paymob_payments', function (Blueprint $table) {
                $table->dropIndex('pp_special_ref_idx');
                $table->dropColumn('special_reference');
            });
        }

        // token and paymob_card_token type changes are not reversed
        // to prevent data truncation
    }
};
