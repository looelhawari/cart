<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Webhook replay protection.
     *
     * SECURITY (audit Chain A item 4 + C1):
     *   The Paymob refund webhook had no replay defense. A captured payload
     *   with a valid HMAC could be replayed indefinitely (network sniff,
     *   log leak, support ticket attachment). We now insert a row into
     *   paymob_webhook_events on first receipt, keyed by transaction_id
     *   with a UNIQUE constraint. A replayed call hits the unique
     *   constraint and is rejected immediately.
     */
    public function up(): void
    {
        if (Schema::hasTable('paymob_webhook_events')) {
            return;
        }

        Schema::create('paymob_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_id', 191);
            $table->string('event_type', 50)->nullable();   // 'payment' | 'refund' | 'token'
            $table->json('payload_summary')->nullable();    // For debugging — only safe fields
            $table->ipAddress('ip')->nullable();
            $table->timestamp('received_at')->useCurrent();

            $table->unique('transaction_id', 'pwe_transaction_id_unique');
            $table->index('received_at', 'pwe_received_at_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paymob_webhook_events');
    }
};
