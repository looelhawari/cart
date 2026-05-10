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
        // Convert any existing 'wallet' orders to 'card' or 'cash_on_delivery'
        // so the ENUM modify doesn't crash on existing data.
        DB::statement("UPDATE orders SET payment_method = 'cash_on_delivery' WHERE payment_method = 'wallet'");

        // Drop ENUM 'wallet' value
        DB::statement(
            "ALTER TABLE orders MODIFY COLUMN payment_method " .
            "ENUM('cash_on_delivery','card') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL"
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

        // Restore 'wallet' ENUM value
        DB::statement(
            "ALTER TABLE orders MODIFY COLUMN payment_method " .
            "ENUM('cash_on_delivery','card','wallet') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL"
        );
    }
};
