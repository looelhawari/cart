<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Wallet feature removal.
     *
     * The wallet was never used in production (no customer-visible balance,
     * no top-up flow). Removing the surface area:
     *  - drop user_wallets, wallet_transactions tables
     *  - remove 'wallet' from orders.payment_method ENUM
     *
     * This eliminates Chain A (wallet double-credit) entirely — no wallet,
     * no double-credit risk.
     */
    public function up(): void
    {
        // Convert any existing 'wallet' orders to 'cash_on_delivery'
        // so the ENUM modify doesn't crash on existing data.
        DB::statement("UPDATE orders SET payment_method = 'cash_on_delivery' WHERE payment_method = 'wallet'");

        // Drop the 'wallet' ENUM value, but preserve any other values that
        // may have been added by sibling migrations (e.g. 'card_on_delivery'
        // from the card-machine branch). Without this, dropping 'wallet'
        // also silently drops 'card_on_delivery' on any DB where the
        // card-machine migration ran first.
        $col = DB::selectOne("SHOW COLUMNS FROM orders LIKE 'payment_method'");
        $values = array_values(array_filter(
            array_map(
                fn ($v) => trim($v, "' "),
                preg_match("/enum\\((.+)\\)/i", $col->Type, $m) ? explode(',', $m[1]) : []
            ),
            fn ($v) => $v !== '' && $v !== 'wallet'
        ));
        if (empty($values)) {
            $values = ['cash_on_delivery', 'card'];
        }
        $newEnum = "ENUM('" . implode("','", $values) . "')";
        DB::statement(
            "ALTER TABLE orders MODIFY COLUMN payment_method " .
            $newEnum . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL"
        );

        // Drop dependent tables. wallet_transactions has FK to user_wallets,
        // so drop the child first.
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('user_wallets');
    }

    public function down(): void
    {
        // Re-create user_wallets
        if (!Schema::hasTable('user_wallets')) {
            Schema::create('user_wallets', function ($t) {
                $t->id();
                $t->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $t->decimal('balance', 12, 2)->default(0);
                $t->decimal('total_credited', 12, 2)->default(0);
                $t->decimal('total_debited', 12, 2)->default(0);
                $t->timestamps();
                $t->unique('user_id');
            });
        }

        if (!Schema::hasTable('wallet_transactions')) {
            Schema::create('wallet_transactions', function ($t) {
                $t->id();
                $t->foreignId('wallet_id')->constrained('user_wallets')->onDelete('cascade');
                $t->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $t->enum('type', ['credit', 'debit']);
                $t->decimal('amount', 12, 2);
                $t->decimal('balance_before', 12, 2);
                $t->decimal('balance_after', 12, 2);
                $t->string('description');
                $t->string('reference_type')->nullable();
                $t->unsignedBigInteger('reference_id')->nullable();
                $t->string('idempotency_key', 191)->nullable();
                $t->timestamp('created_at')->nullable();
                $t->index(['wallet_id', 'created_at']);
                $t->unique(['wallet_id', 'idempotency_key'], 'wt_wallet_idem_unique');
            });
        }

        // Restore 'wallet' ENUM value, preserving any other values already in the enum.
        $col = DB::selectOne("SHOW COLUMNS FROM orders LIKE 'payment_method'");
        $values = array_values(array_filter(
            array_map(
                fn ($v) => trim($v, "' "),
                preg_match("/enum\\((.+)\\)/i", $col->Type, $m) ? explode(',', $m[1]) : []
            ),
            fn ($v) => $v !== ''
        ));
        if (!in_array('wallet', $values, true)) {
            $values[] = 'wallet';
        }
        if (empty($values)) {
            $values = ['cash_on_delivery', 'card', 'wallet'];
        }
        $newEnum = "ENUM('" . implode("','", $values) . "')";
        DB::statement(
            "ALTER TABLE orders MODIFY COLUMN payment_method " .
            $newEnum . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL"
        );
    }
};
