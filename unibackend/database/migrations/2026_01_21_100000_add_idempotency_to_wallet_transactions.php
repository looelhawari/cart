<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if user_wallets table exists
        if (Schema::hasTable('user_wallets')) {
            // First, compute current balances for each wallet (for data integrity)
            DB::statement('
                UPDATE user_wallets w
                SET
                    balance = COALESCE((
                        SELECT
                            SUM(CASE WHEN type = "credit" THEN amount ELSE -amount END)
                        FROM wallet_transactions
                        WHERE wallet_id = w.id
                    ), 0),
                    total_credited = COALESCE((
                        SELECT SUM(amount)
                        FROM wallet_transactions
                        WHERE wallet_id = w.id AND type = "credit"
                    ), 0),
                    total_debited = COALESCE((
                        SELECT SUM(amount)
                        FROM wallet_transactions
                        WHERE wallet_id = w.id AND type = "debit"
                    ), 0)
            ');
        }

        // Add idempotency key to wallet_transactions for duplicate prevention
        if (Schema::hasTable('wallet_transactions')) {
            Schema::table('wallet_transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('wallet_transactions', 'idempotency_key')) {
                    $table->string('idempotency_key', 191)->nullable()->unique()->after('reference_id');
                }
                $table->index(['wallet_id', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('wallet_transactions')) {
            Schema::table('wallet_transactions', function (Blueprint $table) {
                if (Schema::hasColumn('wallet_transactions', 'idempotency_key')) {
                    $table->dropUnique(['idempotency_key']);
                    $table->dropColumn('idempotency_key');
                }
                $table->dropIndex(['wallet_id', 'created_at']);
            });
        }
    }
};
